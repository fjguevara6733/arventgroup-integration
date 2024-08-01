import {
  Controller,
  Get,
  Param,
  HttpStatus,
  HttpException,
  Req,
  Body,
  Post,
} from '@nestjs/common';
import { ArventGroupService } from './arvent-group.service';
import { ApiHeader, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DoRequestDto } from 'src/common/dto/create-arvent-group.dto';
import { Cron, CronExpression } from '@nestjs/schedule';

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
  @ApiQuery({ name: 'email', required: false })
  async cashOut(@Req() req) {
    try {
      return {
        statusCode: HttpStatus.ACCEPTED,
        message: 'transactions',
        data: await this.arventGroupService.getTransactions(req.query),
      };
    } catch (error) {
      console.log('error transactions', error);

      throw new HttpException(error?.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('send-transaction')
  @ApiHeader({ name: 'api-key', required: true })
  async sendTransaction(@Body() payload: DoRequestDto) {
    try {
      console.log("@Post('send-transaction')");
      return {
        statusCode: HttpStatus.ACCEPTED,
        message: 'send Transaction',
        data: await this.arventGroupService.doTransaction(payload),
      };
    } catch (error) {
      throw new HttpException(error?.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('transactions-report')
  @ApiHeader({ name: 'api-key', required: true })
  async transactionReport() {
    try {
      return {
        statusCode: HttpStatus.ACCEPTED,
        message: 'transactions-report',
        data: await this.arventGroupService.transactionReport(),
      };
    } catch (error) {
      console.log('error transactions', error);

      throw new HttpException(error?.message, HttpStatus.BAD_REQUEST);
    }
  }
  // @Cron(CronExpression.EVERY_MINUTE)
  @Get('transactions-update')
  async updateStatusTransactions() {
    try {
      return {
        statusCode: HttpStatus.ACCEPTED,
        message: 'send Transaction',
        data: await this.arventGroupService.updateStatusTransactions(),
      };
    } catch (error) {
      throw new HttpException(error?.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('transactions-credit')
  async creditTransactions() {
    try {
      return {
        statusCode: HttpStatus.ACCEPTED,
        message: 'send Transaction',
        data: await this.arventGroupService.creditTransactions(),
      };
    } catch (error) {
      throw new HttpException(error?.message, HttpStatus.BAD_REQUEST);
    }
  }
}
