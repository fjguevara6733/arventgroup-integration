import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArventGroupModule } from './arvent-group/arvent-group.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './common/guard/guard';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    // TypeOrmModule.forRoot({
    //   name: 'chronos',
    //   type: 'postgres',
    //   host: 'localhost',
    //   port: 5433,
    //   username: 'postgres',
    //   password: '12345',
    //   database: 'arvent_group_dev',
    // }),
    // TypeOrmModule.forRoot({
    //   name: 'arventGroup',
    //   type: 'postgres',
    //   host: 'localhost',
    //   port: 5433,
    //   username: 'postgres',
    //   password: '12345',
    //   database: 'arvent_group_dev',
    // }),
    TypeOrmModule.forRoot({
      name: 'arventGroup',
      type: 'mysql',
      host: 'database-chronospay-prod.cz6kkw664bxb.us-east-1.rds.amazonaws.com',
      port: 3306,
      username: 'chronoslive',
      password: 'h}z4fh92VBKu*xV<',
      database: 'arvent_group',
      autoLoadEntities: true,
      synchronize: true,
    }),
    TypeOrmModule.forRoot({
      name: 'chronos',
      type: 'mysql',
      host: 'database-chronospay-prod.cz6kkw664bxb.us-east-1.rds.amazonaws.com',
      port: 3306,
      username: 'chronoslive',
      password: 'h}z4fh92VBKu*xV<',
      database: 'chronos_live_0.1.0',
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
