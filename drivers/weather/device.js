"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const homey_1 = __importDefault(require("homey"));
const dailyWeatherVariables_json_1 = __importDefault(require("../../assets/json/dailyWeatherVariables.json"));
const hourlyWeatherVariables_json_1 = __importDefault(require("../../assets/json/hourlyWeatherVariables.json"));
const hourlyAirQualityVariables_json_1 = __importDefault(require("../../assets/json/hourlyAirQualityVariables.json"));
class WeatherDevice extends homey_1.default.Device {
    constructor() {
        super(...arguments);
        this.randomNumber = 15;
    }
    async onInit() {
        this.randomNumber = Math.floor(Math.random() * (15 - 5 + 1) + 5);
        await this.update(true);
        this.updateInterval = this.homey.setInterval(() => this.update().catch(this.error), 1000 * 60);
        this.log('WeatherDevice has been initialized');
    }
    async update(ignore = false) {
        //Interval runs at 1 minute. But we want weather pooling to be not every minute and
        //still have weather pooling at the start of the hour. So we have to generate a random number to even out the pooling
        //so the API Servers are not overloaded and check that random number (5-15) to the current minutes of the hour.
        if (new Date().getMinutes() !== this.randomNumber && !ignore)
            return;
        let store = this.getStore();
        //Getting the target date in the right timezone, that's why we have to use 3 new Date();
        //store.forecast is a number in days. 0 = today, 1 = tomorrow etc..
        let date = new Date(new Date(new Date().getTime() + (store.forecast * 24 * 60 * 60 * 1000))
            .toLocaleString("en-US", { timeZone: store.timezone }));
        //Getting the weather data from open-meteo
        let weather = await this.getCurrentWeather(store.location, store.timezone, store.hourlyWeatherVariables.filter((e) => { var _a, _b; return (_b = ((_a = this.getConfig(e)) === null || _a === void 0 ? void 0 : _a.apiVar) === true) !== null && _b !== void 0 ? _b : false; }), store.dailyWeatherVariables, date.toISOString().split('T')[0]);
        //Setting the weather variables
        for (let v of store.dailyWeatherVariables) {
            await this.updateWeather(v, weather.daily);
        }
        let timeIndex = new Date(new Date().toLocaleString("en-US", { timeZone: store.timezone })).getHours();
        for (let v of store.hourlyWeatherVariables) {
            await this.updateWeather(v, weather.hourly, timeIndex);
        }
        //Setting Date capability to current day/time
        if (this.hasCapability("date")) {
            let hours = ("0" + date.getHours()).slice(-2) + ":" + ("0" + date.getMinutes()).slice(-2);
            let day = ("0" + date.getDate()).slice(-2) + "." + ("0" + date.getMonth()).slice(-2) + "." + date.getFullYear();
            await this.setCapabilityValue("date", `${hours} ${day}`);
        }
        if (store.hourlyAirQualityValues) {
            let airQuality = await this.getAirQuality(store.location, store.hourlyAirQualityValues, date.toISOString().split('T')[0]);
            for (let v of store.hourlyAirQualityValues) {
                await this.updateWeather(v, airQuality.hourly);
            }
        }
        this.log(`Updating weather for location: ${store.location.name}`);
    }
    async updateWeather(weatherValue, weatherArray, index = 0) {
        var _a, _b;
        //Getting JSON entry of the weatherValue
        let config = this.getConfig(weatherValue);
        if (config === null) {
            this.error("No config found for " + weatherValue);
            return;
        }
        if (!this.hasCapability(config.capability))
            return;
        //Custom setCapabilityValue for sunrise and sunset to format date to hours:minutes
        if (config.value == "sunrise") {
            let d = new Date(weatherArray[config.value][index]);
            await this.setCapabilityValue(config.capability, ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2));
            return;
        }
        if (config.value == "sunset") {
            let d = new Date(weatherArray[config.value][index]);
            await this.setCapabilityValue(config.capability, ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2));
            return;
        }
        if (config.value == "weatherCondition") {
            let wmoCode = weatherArray["weathercode"][index];
            await this.setCapabilityValue(config.capability, (_a = this.homey.__(`wmo.${wmoCode}`)) !== null && _a !== void 0 ? _a : `Unknown Weather (${wmoCode})`);
            return;
        }
        //If number capability set value.
        if (!weatherArray[config.value][index] && process.env.DEBUG)
            this.log(`Failed to set weather ${config.value} - ${weatherArray[config.value][index]}`);
        await this.setCapabilityValue(config.capability, (_b = weatherArray[config.value][index]) !== null && _b !== void 0 ? _b : 0).catch(this.error);
    }
    getConfig(query) {
        let result = null;
        hourlyWeatherVariables_json_1.default.forEach((v) => {
            if (v.value === query) {
                result = v;
                return;
            }
        });
        if (result !== null)
            return result;
        dailyWeatherVariables_json_1.default.forEach((v) => {
            if (v.value === query) {
                result = v;
                return;
            }
        });
        if (result !== null)
            return result;
        hourlyAirQualityVariables_json_1.default.forEach((v) => {
            if (v.value === query) {
                result = v;
                return;
            }
        });
        return result;
    }
    async getCurrentWeather(location, timeZone, hourlyWeatherValues, dailyWeatherValues, startDate) {
        return new Promise((resolve, reject) => {
            this.homey.app.getApi()
                .get(`?latitude=${location.latitude}&longitude=${location.longitude}&timezone=${timeZone}&current_weather=true&hourly=${hourlyWeatherValues.join(",")}&daily=${dailyWeatherValues.join(",")}&start_date=${startDate}&end_date=${startDate}`)
                .then((r) => {
                if (r.status == 200) {
                    resolve(r.data);
                }
                else {
                    reject(`Failed to get weather. Status ${r.status}`);
                }
            }).catch((err) => reject(err.message));
        });
    }
    async getAirQuality(location, hourlyAirQualityValues, startDate) {
        return new Promise((resolve, reject) => {
            this.homey.app.getAirQualityApi()
                .get(`?latitude=${location.latitude}&longitude=${location.longitude}&hourly=${hourlyAirQualityValues.join(",")}&start_date=${startDate}&end_date=${startDate}`)
                .then((r) => {
                if (r.status == 200) {
                    resolve(r.data);
                }
                else {
                    reject(`Failed to get weather. Status ${r.status}`);
                }
            }).catch((err) => reject(err.message));
        });
    }
    onDeleted() {
        this.homey.clearInterval(this.updateInterval);
        this.log("WeatherDevice with location: " + this.getStore().location.name + " deleted. Cleared interval.");
    }
}
exports.default = WeatherDevice;
module.exports = WeatherDevice;
