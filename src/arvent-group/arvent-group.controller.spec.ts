import { Test, TestingModule } from '@nestjs/testing';
import { ArventGroupController } from './arvent-group.controller';
import { ArventGroupService } from './arvent-group.service';

describe('ArventGroupController', () => {
  let controller: ArventGroupController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArventGroupController],
      providers: [ArventGroupService],
    }).compile();

    controller = module.get<ArventGroupController>(
      ArventGroupController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
