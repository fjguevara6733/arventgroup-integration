import { Test, TestingModule } from '@nestjs/testing';
import { ArventGroupService } from './arvent-group.service';

describe('ArventGroupService', () => {
  let service: ArventGroupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ArventGroupService],
    }).compile();

    service = module.get<ArventGroupService>(ArventGroupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
