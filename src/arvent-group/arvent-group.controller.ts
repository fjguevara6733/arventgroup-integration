import {
  Controller,
  Get,
  Param,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ArventGroupService } from './arvent-group.service';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

@Controller()
@ApiTags('arvent-group')
export class ArventGroupController {
  constructor(private readonly arventGroupService: ArventGroupService) {}

  @Get('balances/:cvu')
  @ApiHeader({ name: 'api-key', required: true })
  async balances(@Param('cvu') cvu: string) {
    try {
      return {
        statusCode: HttpStatus.ACCEPTED,
        message: 'balances',
        data: await this.arventGroupService.balances(cvu),
      };
    } catch (error) {
      throw new HttpException(error?.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('transactions')
  @ApiHeader({ name: 'api-key', required: true })
  async cashOut() {
    try {
      return {
        statusCode: HttpStatus.ACCEPTED,
        message: 'transactions',
        data: await this.arventGroupService.cashOut(),
      };
    } catch (error) {
      throw new HttpException(error?.message, HttpStatus.BAD_REQUEST);
    }
  }
}
