import { Module } from '@nestjs/common';
import { ConsultoraMutualService } from './consultora-mutual.service';
import { ConsultoraMutualController } from './consultora-mutual.controller';

@Module({
  controllers: [ConsultoraMutualController],
  providers: [ConsultoraMutualService],
})
export class ConsultoraMutualModule {}
