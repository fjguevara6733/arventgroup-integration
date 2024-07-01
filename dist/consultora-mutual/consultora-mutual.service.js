"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsultoraMutualService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
let ConsultoraMutualService = class ConsultoraMutualService {
    constructor() {
        this.url = process.env.URL_GENERAL;
    }
    async login(body) {
        const requestOptions = {
            method: 'POST',
            url: `${this.url}/Login/LoginM`,
            data: body,
        };
        try {
            const response = await (0, axios_1.default)(requestOptions);
            return response.data;
        }
        catch (error) {
            console.log('Error:', error);
            throw new Error('Failed to get FX rate');
        }
    }
    async cashOut(body) {
        const requestOptions = {
            method: 'POST',
            url: `${this.url}/CobrosPagos/CreaTTAPI`,
            data: body,
        };
        try {
            const response = await (0, axios_1.default)(requestOptions);
            return response.data;
        }
        catch (error) {
            console.log('Error:', error);
            throw new Error('Failed to get FX rate');
        }
    }
    async getCustomerByAlias(alias) {
        const requestOptions = {
            method: 'GET',
            url: `${this.url}/cvu/accounts?${alias}`,
        };
        try {
            const response = await (0, axios_1.default)(requestOptions);
            return response.data;
        }
        catch (error) {
            console.log('Error:', error);
            throw new Error('Failed to get FX rate');
        }
    }
    async getCustomerByCbu(cbu) {
        const requestOptions = {
            method: 'GET',
            url: `${this.url}/cvu/accounts?cbu_cvu=${cbu}`,
        };
        try {
            const response = await (0, axios_1.default)(requestOptions);
            return response.data;
        }
        catch (error) {
            console.log('Error:', error);
            throw new Error('Failed to get FX rate');
        }
    }
};
exports.ConsultoraMutualService = ConsultoraMutualService;
exports.ConsultoraMutualService = ConsultoraMutualService = __decorate([
    (0, common_1.Injectable)()
], ConsultoraMutualService);
//# sourceMappingURL=consultora-mutual.service.js.map