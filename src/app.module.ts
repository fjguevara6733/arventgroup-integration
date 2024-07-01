import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArventGroupModule } from './arvent-group/arvent-group.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './common/guard/guard';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ArventGroupModule,
    // TypeOrmModule.forRoot({
    //   name: 'chronos',
    //   type: 'mysql',
    //   host: process.env.HOST,
    //   port: Number(process.env.PORT),
    //   username: process.env.USER,
    //   password: process.env.PASSWORD,
    //   database:
    //     process.env.env === 'dev' ? process.env.DB_DEV : process.env.DB_PROD,
    //   entities: [],
    //   synchronize: false,
    // }),
    TypeOrmModule.forRoot({
      name: 'chronos',
      type: 'mysql',
      host: '172.24.0.15',
      port: 3306,
      username: 'chronoslive',
      password: 'jsDhfjylv0PPBb1wHiRn',
      database: 'chronos_live_0.1.0',
      entities: [],
      synchronize: false,
    }),
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
