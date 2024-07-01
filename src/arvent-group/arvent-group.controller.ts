import {
  Controller,
  Get,
  Param,
  HttpStatus,
  HttpException,
  Req,
} from '@nestjs/common';
import { ArventGroupService } from './arvent-group.service';
import { ApiHeader, ApiQuery, ApiTags } from '@nestjs/swagger';

@Controller()
@ApiTags('arvent-group')
export class ArventGroupController {
  constructor(private readonly arventGroupService: ArventGroupService) {}

  @Get('api/balances/:cvu')
  @ApiHeader({ name: 'api-key', required: true })
  async balances(@Param('cvu') cvu: string) {
    try {
      return {
        statusCode: HttpStatus.ACCEPTED,
        message: 'balances',
        data: await this.arventGroupService.balances(cvu),
      };
    } catch (error) {
      console.log('error balances', error);
      throw new HttpException(error?.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('api/transactions')
  @ApiHeader({ name: 'api-key', required: true })
  @ApiQuery({ name: 'desde', required: false })
  @ApiQuery({ name: 'hasta', required: false })
  async cashOut(@Req() req) {
    try {
      return {
        statusCode: HttpStatus.ACCEPTED,
        message: 'transactions',
        data: await this.arventGroupService.cashOut(req.query),
      };
    } catch (error) {
      console.log('error transactions', error);
      
      throw new HttpException(error?.message, HttpStatus.BAD_REQUEST);
    }
  }
}
