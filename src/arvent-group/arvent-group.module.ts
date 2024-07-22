import { ArventGroupController } from "./arvent-group.controller";
import { ArventGroupService } from "./arvent-group.service";
import { Module } from "@nestjs/common";

@Module({
  imports: [],
  controllers: [ArventGroupController],
  providers: [ArventGroupService],
  exports: [ArventGroupService],
})
export class ArventGroupModule {}