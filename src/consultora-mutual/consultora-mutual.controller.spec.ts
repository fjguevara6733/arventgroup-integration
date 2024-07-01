import { Test, TestingModule } from '@nestjs/testing';
import { ConsultoraMutualController } from './consultora-mutual.controller';
import { ConsultoraMutualService } from './consultora-mutual.service';

describe('ConsultoraMutualController', () => {
  let controller: ConsultoraMutualController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConsultoraMutualController],
      providers: [ConsultoraMutualService],
    }).compile();

    controller = module.get<ConsultoraMutualController>(
      ConsultoraMutualController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
