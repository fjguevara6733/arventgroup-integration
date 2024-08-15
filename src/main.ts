import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AuthGuard } from './common/guard/guard';
import * as dotenv from 'dotenv'
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'arvent';
  dotenv.config()
  app.enableCors();

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

  await app.listen(3000, () => {
    Logger.log(' Listening at  http://localhost:' + 3000 + '/' + globalPrefix);
  });
}
bootstrap();
