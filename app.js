"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const homey_1 = __importDefault(require("homey"));
const axios_1 = __importDefault(require("axios"));
const axios_retry_1 = __importDefault(require("axios-retry"));
class OpenMeteo extends homey_1.default.App {
    /**
     * onInit is called when the app is initialized.
     */
    async onInit() {
        let cloudId = await this.homey.cloud.getHomeyId();
        this.api = axios_1.default.create({
            baseURL: 'https://api.open-meteo.com/v1/forecast',
            timeout: 5000,
            headers: {
                "User-Agent": `HomeyPro/${this.manifest.version} - ${cloudId}`
            }
        });
        this.airQualityApi = axios_1.default.create({
            baseURL: 'https://air-quality-api.open-meteo.com/v1/air-quality',
            timeout: 5000,
            headers: {
                "User-Agent": `HomeyPro/${this.manifest.version} - ${cloudId}`
            }
        });
        (0, axios_retry_1.default)(this.api, {
            retries: 4,
            retryDelay: (retryCount) => {
                this.log("Failed to call api.open-meteo.com. Current retry attempt: " + retryCount);
                if (retryCount == 1)
                    return 1000;
                if (retryCount == 2)
                    return 1000 * 5;
                if (retryCount == 3)
                    return 1000 * 10;
                return retryCount * 1000;
            },
            retryCondition: () => true
        });
        (0, axios_retry_1.default)(this.airQualityApi, {
            retries: 4,
            retryDelay: (retryCount) => {
                this.log("Failed to call air-quality-api.open-meteo.com. Current retry attempt: " + retryCount);
                if (retryCount == 1)
                    return 1000;
                if (retryCount == 2)
                    return 1000 * 5;
                if (retryCount == 3)
                    return 1000 * 10;
                return retryCount * 1000;
            },
            retryCondition: () => true
        });
        this.log('OpenMeteo has been initialized');
    }
    getApi() {
        return this.api;
    }
    getAirQualityApi() {
        return this.airQualityApi;
    }
}
exports.default = OpenMeteo;
module.exports = OpenMeteo;
