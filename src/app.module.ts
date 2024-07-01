import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConsultoraMutualModule } from './consultora-mutual/consultora-mutual.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [ConsultoraMutualModule, JwtModule.register({})],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
