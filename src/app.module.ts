import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArventGroupModule } from './arvent-group/arvent-group.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './common/guard/guard';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    // TypeOrmModule.forRoot({
    //   name: 'chronos',
    //   type: 'postgres',
    //   host: 'localhost',
    //   port: 5432,
    //   username: 'postgres',
    //   password: '1234',
    //   database: 'qr',
    //   synchronize: false,
    // }),
    TypeOrmModule.forRoot({
      name: 'chronos',
      type: 'mysql',
      host: 'database-chronospay.cnaaegyaw8sq.us-east-2.rds.amazonaws.com',
      port: 3306,
      username: 'chronostest',
      password: ',h1e6#STJBqZ9sSj',
      database: 'Chronos_dev_0.1.0',
    }),
    DatabaseModule,
    ArventGroupModule,
    ScheduleModule.forRoot(),
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
