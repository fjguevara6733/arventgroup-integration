import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AuthGuard } from './common/guard/guard';
import * as dotenv from 'dotenv'

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  dotenv.config()

  const config = new DocumentBuilder()
    .setTitle('Chronos Prestamos')
    .setDescription('The chronos prestamos API description')
    .setVersion('1.0')
    .addTag('api')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.useGlobalGuards(new AuthGuard());

  await app.listen(3000);
}
bootstrap();
