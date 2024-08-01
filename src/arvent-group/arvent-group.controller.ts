import {
  Controller,
  Get,
  Param,
  HttpStatus,
  HttpException,
  Req,
  Body,
  Post,
  Res,
} from '@nestjs/common';
import { ArventGroupService } from './arvent-group.service';
import { ApiHeader, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  arventGetTransactionsCredit,
  DoRequestDto,
} from 'src/common/dto/create-arvent-group.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Response } from 'express';

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
  async sendTransaction(@Body() payload: DoRequestDto, @Res() res: Response) {
    console.log("@Post('send-transaction')");
    await this.arventGroupService
      .doTransaction(payload)
      .then((result) => {
        const response = {
          statusCode: HttpStatus.ACCEPTED,
          message: 'send Transaction',
          data: result,
        };
        res.status(HttpStatus.ACCEPTED).send(response);
      })
      .catch((error) => {
        const response = {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Error send Transaction',
          data: error,
        };
        res.status(HttpStatus.BAD_REQUEST).send(response);
      });
  }

  @Get('transactions-report')
  @ApiHeader({ name: 'api-key', required: true })
  async transactionReport(@Res() res: Response) {
    await this.arventGroupService
      .transactionReport()
      .then((result) => {
        const response = {
          statusCode: HttpStatus.ACCEPTED,
          message: 'transactions report',
          data: result,
        };
        res.status(HttpStatus.ACCEPTED).send(response);
      })
      .catch((error) => {
        const response = {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Error transactions report',
          data: error,
        };
        res.status(HttpStatus.BAD_REQUEST).send(response);
      });
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

  @Post('transactions-credit')
  async creditTransactions(@Body() payload: arventGetTransactionsCredit) {
    try {
      return {
        statusCode: HttpStatus.ACCEPTED,
        message: 'send Transaction',
        data: await this.arventGroupService.creditTransactions(payload),
      };
    } catch (error) {
      throw new HttpException(error?.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('balances/:email')
  async stateBalance(@Param('email') email: string, @Res() res: Response) {
    await this.arventGroupService
      .stateBalance(email, true)
      .then((result) => {
        const response = {
          statusCode: HttpStatus.ACCEPTED,
          message: 'balances',
          data: result,
        };
        res.status(HttpStatus.ACCEPTED).send(response);
      })
      .catch((error) => {
        const response = {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Error balances',
          data: error,
        };
        res.status(HttpStatus.BAD_REQUEST).send(response);
      });
  }
}
