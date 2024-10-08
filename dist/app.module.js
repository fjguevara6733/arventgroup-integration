"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const arvent_group_module_1 = require("./arvent-group/arvent-group.module");
const typeorm_1 = require("@nestjs/typeorm");
const core_1 = require("@nestjs/core");
const guard_1 = require("./common/guard/guard");
const config_1 = require("@nestjs/config");
const environment = process.env.environment;
const host = process.env.HOST;
const port = Number(process.env.PORT);
const username = environment === 'dev' ? process.env.USER : process.env.USER_PROD;
const password = environment === 'dev' ? process.env.PASSWORD : process.env.PASSWORD_PROD;
const database = environment === 'dev' ? process.env.DB_DEV : process.env.DB_PROD;
const databaseArvent = process.env.DB_ARVENT_GROUP;
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true
            }),
            typeorm_1.TypeOrmModule.forRoot({
                name: 'chronos',
                type: 'mysql',
                host: '172.24.0.15',
                port: 3306,
                username: 'chronostest',
                password: 'jsDhfjylv0PPBb1wHiNr',
                database: 'chronos_dev_0.1.0',
                autoLoadEntities: true,
                synchronize: true,
            }),
            typeorm_1.TypeOrmModule.forRoot({
                name: 'arventGroup',
                type: 'mysql',
                host: '172.24.0.15',
                port: 3306,
                username: 'chronostest',
                password: 'jsDhfjylv0PPBb1wHiNr',
                database: 'arvent_group_dev',
                autoLoadEntities: true,
                synchronize: true,
            }),
            arvent_group_module_1.ArventGroupModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            {
                provide: core_1.APP_GUARD,
                useClass: guard_1.AuthGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map