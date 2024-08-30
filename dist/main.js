"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const swagger_1 = require("@nestjs/swagger");
const guard_1 = require("./common/guard/guard");
const dotenv = require("dotenv");
const common_1 = require("@nestjs/common");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const globalPrefix = 'api';
    dotenv.config();
    app.enableCors();
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Chronos Prestamos')
        .setDescription('The chronos prestamos API description')
        .setVersion('1.0')
        .addTag(globalPrefix)
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup(globalPrefix, app, document);
    app.setGlobalPrefix(globalPrefix);
    app.useGlobalGuards(new guard_1.AuthGuard());
    await app.listen(3000, () => {
        common_1.Logger.log(' Listening at  http://localhost:' + 3000 + '/' + globalPrefix);
    });
}
bootstrap();
//# sourceMappingURL=main.js.map