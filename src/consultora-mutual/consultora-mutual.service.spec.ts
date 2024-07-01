import { Test, TestingModule } from '@nestjs/testing';
import { ConsultoraMutualService } from './consultora-mutual.service';

describe('ConsultoraMutualService', () => {
  let service: ConsultoraMutualService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConsultoraMutualService],
    }).compile();

    service = module.get<ConsultoraMutualService>(ConsultoraMutualService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
