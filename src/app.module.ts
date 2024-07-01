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
      host: '172.24.0.15',
      port: 3306,
      username: 'ubackend',
      password: 'db6ifiLdXS_5VsC',
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
