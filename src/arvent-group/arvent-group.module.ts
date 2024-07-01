import { Module } from '@nestjs/common';
import { ArventGroupService } from './arvent-group.service';
import { ArventGroupController } from './arvent-group.controller';

@Module({
  controllers: [ArventGroupController],
  providers: [ArventGroupService],
})
export class ArventGroupModule {}
