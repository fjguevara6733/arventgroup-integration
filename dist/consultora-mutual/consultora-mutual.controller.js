"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsultoraMutualController = void 0;
const common_1 = require("@nestjs/common");
const consultora_mutual_service_1 = require("./consultora-mutual.service");
const swagger_1 = require("@nestjs/swagger");
const create_consultora_mutual_dto_1 = require("../common/dto/create-consultora-mutual.dto");
let ConsultoraMutualController = class ConsultoraMutualController {
    constructor(consultoraMutualService) {
        this.consultoraMutualService = consultoraMutualService;
    }
    async login(body) {
        try {
            return {
                statusCode: common_1.HttpStatus.ACCEPTED,
                message: 'login',
                data: await this.consultoraMutualService.login(body),
            };
        }
        catch (error) {
            throw new common_1.HttpException(error?.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async cashOut(body) {
        try {
            return {
                statusCode: common_1.HttpStatus.ACCEPTED,
                message: 'cash-out',
                data: await this.consultoraMutualService.cashOut(body),
            };
        }
        catch (error) {
            throw new common_1.HttpException(error?.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async getCustomerByAlias(alias) {
        try {
            return {
                statusCode: common_1.HttpStatus.ACCEPTED,
                message: 'get-customer-by-alias',
                data: await this.consultoraMutualService.getCustomerByAlias(alias),
            };
        }
        catch (error) {
            throw new common_1.HttpException(error?.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async getCustomerByCbu(cbu) {
        try {
            return {
                statusCode: common_1.HttpStatus.ACCEPTED,
                message: 'get-customer-by-cbu',
                data: await this.consultoraMutualService.getCustomerByCbu(cbu),
            };
        }
        catch (error) {
            throw new common_1.HttpException(error?.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
};
exports.ConsultoraMutualController = ConsultoraMutualController;
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_consultora_mutual_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], ConsultoraMutualController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('cash-out'),
    (0, swagger_1.ApiHeader)({ name: 'Bearer Token', required: true }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_consultora_mutual_dto_1.CashOutDto]),
    __metadata("design:returntype", Promise)
], ConsultoraMutualController.prototype, "cashOut", null);
__decorate([
    (0, common_1.Get)('get-customer-by-alias/:alias'),
    (0, swagger_1.ApiHeader)({ name: 'Bearer Token', required: true }),
    __param(0, (0, common_1.Param)('alias')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ConsultoraMutualController.prototype, "getCustomerByAlias", null);
__decorate([
    (0, common_1.Get)('get-customer-by-cbu/:cbu'),
    (0, swagger_1.ApiHeader)({ name: 'Bearer Token', required: true }),
    __param(0, (0, common_1.Param)('cbu')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ConsultoraMutualController.prototype, "getCustomerByCbu", null);
exports.ConsultoraMutualController = ConsultoraMutualController = __decorate([
    (0, common_1.Controller)(),
    (0, swagger_1.ApiTags)('consultora-mutual'),
    __metadata("design:paramtypes", [consultora_mutual_service_1.ConsultoraMutualService])
], ConsultoraMutualController);
//# sourceMappingURL=consultora-mutual.controller.js.map