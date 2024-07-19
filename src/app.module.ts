import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArventGroupModule } from './arvent-group/arvent-group.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './common/guard/guard';
import { ConfigModule } from '@nestjs/config';

const host = process.env.HOST;
const port = Number(process.env.PORT);
const username =
  process.env.env === 'dev' ? process.env.USER : process.env.USER_PROD;
const password =
  process.env.env === 'dev' ? process.env.PASSWORD : process.env.PASSWORD_PROD;
const database =
  process.env.env === 'dev' ? process.env.DB_DEV : process.env.DB_PROD;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      name: 'chronos',
      type: 'mysql',
      host,
      port,
      username,
      password,
      database,
      entities: [],
      synchronize: false,
    }),
    ArventGroupModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
