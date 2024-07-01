import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArventGroupModule } from './arvent-group/arvent-group.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './common/guard/guard';

@Module({
  imports: [
    ArventGroupModule,
    TypeOrmModule.forRoot({
      name: 'chronos',
      type: 'mysql',
      host: process.env.HOST,
      port: Number(process.env.PORT),
      username: process.env.USER,
      password: process.env.PASSWORD,
      database:
        process.env.env === 'dev' ? process.env.DB_DEV : process.env.DB_PROD,
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
