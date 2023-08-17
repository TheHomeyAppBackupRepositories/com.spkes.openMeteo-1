"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const homey_1 = __importDefault(require("homey"));
const crypto = __importStar(require("crypto"));
const dailyWeatherVariables_json_1 = __importDefault(require("../../assets/json/dailyWeatherVariables.json"));
const hourlyWeatherVariables_json_1 = __importDefault(require("../../assets/json/hourlyWeatherVariables.json"));
const hourlyAirQualityVariables_json_1 = __importDefault(require("../../assets/json/hourlyAirQualityVariables.json"));
class WeatherDriver extends homey_1.default.Driver {
    constructor() {
        super(...arguments);
        this.hourlyWeatherVariables = [];
        this.dailyWeatherVariables = [];
        this.hourlyAirQualityValues = [];
        this.forecast = 0;
    }
    /**
     * onInit is called when the driver is initialized.
     */
    async onInit() {
        this.log('WeatherDriver has been initialized');
    }
    /**
     * This method is called when a repair session starts.
     * Params: session – Bi-directional socket for communication with the front-end
     * Params: device - the device that is currently being repaired
     */
    async onRepair(session, device) {
        session.setHandler("getData", async (data) => {
            let store = device.getStore();
            if (data.view === "setup") {
                return {
                    location: store.location,
                    timezone: store.timezone,
                    forecast: store.forecast,
                };
            }
            if (data.view === "dailyWeatherVariables" ||
                data.view === "hourlyWeatherVariables" ||
                data.view === "hourlyAirQualityValues") {
                return {
                    data: device.getCapabilities()
                };
            }
        });
        session.setHandler("setup", async (data) => {
            await device.setStoreValue("location", data.location);
            await device.setStoreValue("timezone", data.timezone == "auto" ? data.location.timezone : data.timezone);
            await device.setStoreValue("forecast", data.forecast);
            return true;
        });
        session.setHandler("hourlyWeatherVariables", async (data) => {
            if (data == undefined)
                return false;
            this.hourlyWeatherVariables = data;
            return true;
        });
        session.setHandler("dailyWeatherVariables", async (data) => {
            if (data == undefined)
                return false;
            this.dailyWeatherVariables = data;
            return true;
        });
        session.setHandler("hourlyAirQualityValues", async (data) => {
            if (data == undefined)
                return false;
            this.hourlyAirQualityValues = data;
            let capabilities = this.variablesToCapabilities();
            for (let capability of capabilities) {
                if (device.hasCapability(capability))
                    continue;
                await device.addCapability(capability);
            }
            for (let deviceCapability of device.getCapabilities()) {
                if (capabilities.includes(deviceCapability))
                    continue;
                await device.removeCapability(deviceCapability);
            }
            await device.setStoreValue("dailyWeatherVariables", this.dailyWeatherVariables);
            await device.setStoreValue("hourlyWeatherVariables", this.hourlyWeatherVariables);
            await device.setStoreValue("hourlyAirQualityValues", this.hourlyAirQualityValues);
            await device.update(true);
            return true;
        });
    }
    /**
     * This method is called when a pair session starts.
     * Params: session – Bi-directional socket for communication with the front-end
     */
    async onPair(session) {
        session.setHandler('showView', async (data) => {
        });
        //Handle Setup
        session.setHandler("setup", async (data) => {
            if (data == undefined)
                return false;
            this.location = data.location;
            this.tempUnit = data.tempUnit;
            this.windSpeedUnit = data.windSpeedUnit;
            this.timezone = data.timezone == "auto" ? data.location.timezone : data.timezone;
            this.precipitationUnit = data.precipitationUnit;
            this.forecast = data.forecast;
            return true;
        });
        session.setHandler("hourlyWeatherVariables", async (data) => {
            if (data == undefined)
                return false;
            this.hourlyWeatherVariables = data;
            return true;
        });
        session.setHandler("dailyWeatherVariables", async (data) => {
            if (data == undefined)
                return false;
            this.dailyWeatherVariables = data;
            return true;
        });
        session.setHandler("hourlyAirQualityValues", async (data) => {
            if (data == undefined)
                return false;
            this.hourlyAirQualityValues = data;
            return true;
        });
        //Get devices
        session.setHandler("list_devices", async () => {
            var _a;
            let nameExtension = "";
            if (this.forecast > 0) {
                nameExtension = ` (+${this.forecast}d)`;
            }
            return [
                {
                    name: ((_a = this.location) === null || _a === void 0 ? void 0 : _a.name) + nameExtension,
                    // The data object is required and should be unique for the device.
                    // So a device's MAC address would be good, but an IP address would
                    // be bad since it can change over time.
                    data: {
                        id: crypto.randomUUID()
                    },
                    store: {
                        location: this.location,
                        tempUnit: this.tempUnit,
                        windSpeedUnit: this.windSpeedUnit,
                        timezone: this.timezone,
                        precipitationUnit: this.precipitationUnit,
                        dailyWeatherVariables: this.dailyWeatherVariables,
                        hourlyWeatherVariables: this.hourlyWeatherVariables,
                        hourlyAirQualityValues: this.hourlyAirQualityValues,
                        forecast: this.forecast,
                    },
                    capabilities: this.variablesToCapabilities()
                },
            ];
        });
    }
    variablesToCapabilities() {
        let capabilities = ["date"];
        dailyWeatherVariables_json_1.default.forEach((d) => {
            if (this.dailyWeatherVariables.includes(d.value) && d.capability != "")
                capabilities.push(d.capability);
            else if (this.dailyWeatherVariables.includes(d.value))
                this.error(d.value + " has no capability");
        });
        hourlyWeatherVariables_json_1.default.forEach((d) => {
            if (this.hourlyWeatherVariables.includes(d.value) && d.capability != "")
                capabilities.push(d.capability);
            else if (this.hourlyWeatherVariables.includes(d.value))
                this.error(d.value + " has no capability");
        });
        hourlyAirQualityVariables_json_1.default.forEach((d) => {
            if (this.hourlyAirQualityValues.includes(d.value) && d.capability != "")
                capabilities.push(d.capability);
            else if (this.hourlyAirQualityValues.includes(d.value))
                this.error(d.value + " has no capability");
        });
        return capabilities;
    }
}
module.exports = WeatherDriver;
