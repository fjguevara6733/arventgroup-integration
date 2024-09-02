import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArventGroupModule } from './arvent-group/arvent-group.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './common/guard/guard';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

const environment = process.env.environment;
const host = process.env.HOST;
const port = Number(process.env.PORT);
const username = environment === 'dev' ? process.env.USER : process.env.USER_PROD;
const password =
environment === 'dev' ? process.env.PASSWORD : process.env.PASSWORD_PROD;
const database = environment === 'dev' ? process.env.DB_DEV : process.env.DB_PROD;
const databaseArvent = process.env.DB_ARVENT_GROUP;
console.log(
  host,
  '- ',
  username,
  '- ',
  port,
  '- ',
  password,
  '- ',
  database,
  '- ',
  databaseArvent,
  '- ',
  environment,
);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    // TypeOrmModule.forRoot({
    //   name: 'chronos',
    //   type: 'mysql',
    //   host,
    //   port,
    //   username,
    //   password,
    //   database,
    //   synchronize: true,
    // }),
    // TypeOrmModule.forRoot({
    //   name: 'arventGroup',
    //   type: 'mysql',
    //   host,
    //   port,
    //   username,
    //   password,
    //   database: databaseArvent,
    //   synchronize: true,
    // }),
    TypeOrmModule.forRoot({
      name: 'chronos',
      type: 'mysql',
      host: '172.24.0.15',
      port: 3306,
      username: 'chronostest',
      password: ',h1e6#STJBqZ9sSj',
      database: 'chronos_dev_0.1.0',
      autoLoadEntities: true,
      synchronize: true,
    }),
    TypeOrmModule.forRoot({
      name: 'arventGroup',
      type: 'mysql',
      host: '172.24.0.15',
      port: 3306,
      username: 'chronostest',
      password: ',h1e6#STJBqZ9sSj',
      database: 'arvent_group_dev',
      autoLoadEntities: true,
      synchronize: true,
    }),
    ArventGroupModule,
    ScheduleModule.forRoot()
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
