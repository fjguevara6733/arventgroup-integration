import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AuthGuard } from './common/guard/guard';
import * as dotenv from 'dotenv'
import { Logger } from '@nestjs/common';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  dotenv.config()
  app.enableCors();

  app.use(bodyParser.json({ limit: '50mb' })); // Límite para JSON
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true })); // Límite para datos codificados en URL

  const config = new DocumentBuilder()
    .setTitle('Chronos Prestamos')
    .setDescription('The chronos prestamos API description')
    .setVersion('1.0')
    .addTag(globalPrefix)
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(globalPrefix, app, document);
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalGuards(new AuthGuard());

  await app.listen(4000, () => {
    Logger.log(' Listening at  http://localhost:' + 4000 + '/' + globalPrefix);
  });
}
bootstrap();
