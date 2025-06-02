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
  UseInterceptors,
  UploadedFile,
  Put,
  Headers,
} from '@nestjs/common';
import { ArventGroupService } from './arvent-group.service';
import {
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  arventGetTransactions,
  changeAliasByCvu,
  createClientCvu,
  createClientCvuBind,
  DoRequestDto,
  DoRequestDtoDebin,
  updateNameBind,
} from 'src/common/dto/create-arvent-group.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Response } from 'express';
import { PersonDTO, UserCompanyDTO } from 'src/common/dto/user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedDocDto } from 'src/common/dto/upload-file.dto';
import { KycDocTypes } from 'src/common/enum';

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

  @Post('transactions-report')
  @ApiHeader({ name: 'api-key', required: true })
  async transactionReport(
    @Res() res: Response,
    @Body() body: arventGetTransactions,
  ) {
    await this.arventGroupService
      .transactionReport(body)
      .then((result) => {
        const response = {
          statusCode: HttpStatus.ACCEPTED,
          message: 'transactions report',
          data: result,
        };
        res.status(HttpStatus.ACCEPTED).send(response);
      })
      .catch((error) => {
        console.log(error);

        const response = {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Error transactions report',
          data: error,
        };
        res.status(HttpStatus.BAD_REQUEST).send(response);
      });
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  @Get('transactions-update')
  async updateStatusTransactions() {
    console.log('Cron transactions-update');
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

  @Cron('*/15 * * * *')
  @Post('transactions-credit')
  async creditTransactions() {
    console.log('Cron transactions-credit');
    try {
      return {
        statusCode: HttpStatus.ACCEPTED,
        message: 'send Transaction',
        data: await this.arventGroupService.creditTransactions(),
      };
    } catch (error) {
      console.log('error transactions-credit', error);

      throw new HttpException(error?.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('balances/:email')
  async stateBalance(@Param('email') email: string, @Res() res: Response) {
    await this.arventGroupService
      .stateBalance({email}, true)
      .then((result) => {
        const response = {
          statusCode: HttpStatus.ACCEPTED,
          message: 'balances',
          data: result,
        };
        res.status(HttpStatus.ACCEPTED).send(response);
      })
      .catch((error) => {
        console.log('error balances', error);

        const response = {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Error balances',
          data: error,
        };
        res.status(HttpStatus.BAD_REQUEST).send(response);
      });
  }

  @Post('get-transaction-debin')
  @ApiHeader({ name: 'api-key', required: true })
  async createDeposit(
    @Body() payload: DoRequestDtoDebin,
    @Res() res: Response,
  ) {
    await this.arventGroupService
      .createDeposit(payload)
      .then((result) => {
        const response = {
          statusCode: HttpStatus.ACCEPTED,
          message: 'get Transaction',
          data: result,
        };
        res.status(HttpStatus.ACCEPTED).send(response);
      })
      .catch((error) => {
        const response = {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Error get Transaction',
          data: error,
        };
        res.status(HttpStatus.BAD_REQUEST).send(response);
      });
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  @Get('transactions-get-credits')
  async updateStatusTransactionsCredit() {
    console.log('Cron transactions-get-credits');
    try {
      return {
        statusCode: HttpStatus.ACCEPTED,
        message: 'transactions-get-credits',
        data: await this.arventGroupService.updateStatusTransactionsCredit(),
      };
    } catch (error) {
      throw new HttpException(error?.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('transactions-report-debit')
  @ApiHeader({ name: 'api-key', required: true })
  async transactionReportDebit(
    @Res() res: Response,
    @Body() body: arventGetTransactions,
  ) {
    await this.arventGroupService
      .transactionReportDebit(body)
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

  @Post('create-natural-person')
  @ApiHeader({ name: 'api-key', required: true })
  async createNaturalPerson(
    @Res() res: Response,
    @Body() body: PersonDTO,
    @Headers('key') key: string,
  ) {
    await this.arventGroupService
      .createNaturalPerson(body, key)
      .then((result) => {
        const response = {
          statusCode: HttpStatus.ACCEPTED,
          message: 'create-natural-person',
          data: result,
        };
        res.status(HttpStatus.ACCEPTED).send(response);
      })
      .catch((error) => {
        console.log(error);

        const response = {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Error create-natural-person',
          data: error,
        };
        res.status(HttpStatus.BAD_REQUEST).send(response);
      });
  }

  @Post('create-juridic-person')
  @ApiHeader({ name: 'api-key', required: true })
  async createJuridicPerson(
    @Res() res: Response,
    @Body() body: UserCompanyDTO,
  ) {
    await this.arventGroupService
      .createJuridicPerson(body)
      .then((result) => {
        const response = {
          statusCode: HttpStatus.ACCEPTED,
          message: 'create-juridic-person',
          data: result,
        };
        res.status(HttpStatus.ACCEPTED).send(response);
      })
      .catch((error) => {
        console.log(error);
        const response = {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Error create-juridic-person',
          data: error,
        };
        res.status(HttpStatus.BAD_REQUEST).send(response);
      });
  }

  @Post('create-cvu-client')
  @ApiHeader({ name: 'api-key', required: true })
  async createClientCvu(@Res() res: Response, @Body() body: createClientCvu) {
    await this.arventGroupService
      .createClientCvu(body)
      .then((result) => {
        const response = {
          statusCode: HttpStatus.ACCEPTED,
          message: 'create-cvu-client',
          data: result,
        };
        res.status(HttpStatus.ACCEPTED).send(response);
      })
      .catch((error) => {
        console.log(error);
        const response = {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Error create-cvu-client',
          data: error,
        };
        res.status(HttpStatus.BAD_REQUEST).send(response);
      });
  }

  @Post('upload-file')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload KYC Documents' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        docFile: {
          type: 'string',
          nullable: false,
          format: 'binary',
        },
        customerId: {
          type: 'string',
          nullable: false,
          format: 'string',
        },
        docType: {
          type: 'string',
          description: `ENUM: ${Object.values(KycDocTypes)}`,
          enum: Object.values(KycDocTypes),
        },
      },
      required: ['docFile', 'docType', 'customerId'],
    },
  })
  @ApiHeader({ name: 'api-key', required: true })
  @UseInterceptors(FileInterceptor('docFile'))
  async uploadFile(
    @Res() res: Response,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadedDocDto,
  ) {
    await this.arventGroupService
      .uploadFile(body, file)
      .then((result) => {
        const response = {
          statusCode: HttpStatus.ACCEPTED,
          message: 'upload-file',
          data: result,
        };
        res.status(HttpStatus.ACCEPTED).send(response);
      })
      .catch((error) => {
        console.log(error);
        const response = {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Error upload-file',
          data: error,
        };
        res.status(HttpStatus.BAD_REQUEST).send(response);
      });
  }

  @Post('upload-file-juridic')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload KYC Documents' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        docFile: {
          type: 'string',
          nullable: false,
          format: 'binary',
        },
        customerId: {
          type: 'string',
          nullable: false,
          format: 'string',
        },
        docType: {
          type: 'string',
          description: `ENUM: ${Object.values(KycDocTypes)}`,
          enum: Object.values(KycDocTypes),
        },
      },
      required: ['docFile', 'docType', 'customerId'],
    },
  })
  @ApiHeader({ name: 'api-key', required: true })
  @UseInterceptors(FileInterceptor('docFile'))
  async uploadFileJuridic(
    @Res() res: Response,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadedDocDto,
  ) {
    await this.arventGroupService
      .uploadFile(body, file)
      .then((result) => {
        const response = {
          statusCode: HttpStatus.ACCEPTED,
          message: 'upload-file-juridic',
          data: result,
        };
        res.status(HttpStatus.ACCEPTED).send(response);
      })
      .catch((error) => {
        console.log(error);
        const response = {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Error upload-file-juridic',
          data: error,
        };
        res.status(HttpStatus.BAD_REQUEST).send(response);
      });
  }

  @Get('get-data-user/:customerId')
  @ApiHeader({ name: 'api-key', required: true })
  async getDataUser(@Res() res: Response, @Param('customerId') customerId) {
    await this.arventGroupService
      .getDataUser(customerId)
      .then((result) => {
        const response = {
          statusCode: HttpStatus.ACCEPTED,
          message: 'get-data-user',
          data: result,
        };
        res.status(HttpStatus.ACCEPTED).send(response);
      })
      .catch((error) => {
        console.log(error);
        const response = {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Error get-data-user',
          data: error,
        };
        res.status(HttpStatus.BAD_REQUEST).send(response);
      });
  }

  @Get('get-data-cvu/:cvu')
  @ApiHeader({ name: 'api-key', required: true })
  async getAccount(@Res() res: Response, @Param('cvu') cvu) {
    await this.arventGroupService
      .getAccount(cvu)
      .then((result) => {
        const response = {
          statusCode: HttpStatus.ACCEPTED,
          message: 'get-data-cvu',
          data: result,
        };
        res.status(HttpStatus.ACCEPTED).send(response);
      })
      .catch((error) => {
        console.log(error);
        const response = {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Error get-data-cvu',
          data: error,
        };
        res.status(HttpStatus.BAD_REQUEST).send(response);
      });
  }

  @Post('change-cvu-alias')
  @ApiHeader({ name: 'api-key', required: true })
  async changeAlias(@Res() res: Response, @Body() body: changeAliasByCvu) {
    await this.arventGroupService
      .changeAlias(body)
      .then((result) => {
        const response = {
          statusCode: HttpStatus.ACCEPTED,
          message: 'change-cvu-alias',
          data: result,
        };
        res.status(HttpStatus.ACCEPTED).send(response);
      })
      .catch((error) => {
        console.log(error);
        const response = {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Error change-cvu-alias',
          data: error,
        };
        res.status(HttpStatus.BAD_REQUEST).send(response);
      });
  }

  @Post('webhook')
  @ApiHeader({ name: 'api-key', required: true })
  async webhook(@Res() res: Response, @Body() body: any) {
    await this.arventGroupService
      .webhook(body)
      .then((result) => {
        const response = {
          statusCode: HttpStatus.ACCEPTED,
          message: 'webhook',
          data: result,
        };
        res.status(HttpStatus.ACCEPTED).send(response);
      })
      .catch((error) => {
        console.log(error);
        const response = {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Error webhook',
          data: error,
        };
        res.status(HttpStatus.BAD_REQUEST).send(response);
      });
  }

  @Post('create-cvu-client-bind')
  @ApiHeader({ name: 'api-key', required: true })
  async createClientCvuBind(
    @Res() res: Response,
    @Body() body: createClientCvuBind,
    @Headers('key') key: string,
  ) {
    await this.arventGroupService
      .createCvuBind(body, key)
      .then((result) => {
        const response = {
          statusCode: HttpStatus.ACCEPTED,
          message: 'create-cvu-client-bind',
          data: result,
        };
        res.status(HttpStatus.ACCEPTED).send(response);
      })
      .catch((error) => {
        console.log(error);
        const response = {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Error create-cvu-client-bind',
          data: error,
        };
        res.status(HttpStatus.BAD_REQUEST).send(response);
      });
  }

  @Put('change-name-bind')
  @ApiHeader({ name: 'api-key', required: true })
  async updateNameBind(@Res() res: Response, @Body() body: updateNameBind) {
    await this.arventGroupService
      .updateNameBind(body)
      .then((result) => {
        const response = {
          statusCode: HttpStatus.ACCEPTED,
          message: 'change-name-bind',
          data: result,
        };
        res.status(HttpStatus.ACCEPTED).send(response);
      })
      .catch((error) => {
        console.log(error);
        const response = {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Error change-name-bind',
          data: error,
        };
        res.status(HttpStatus.BAD_REQUEST).send(response);
      });
  }

  @Post('virtual-account')
  @ApiHeader({ name: 'api-key', required: true })
  async createVirtualAccount(@Res() res: Response, @Body() body) {
    await this.arventGroupService
      .createVirtualAccount(body)
      .then((result) => {
        const response = {
          statusCode: HttpStatus.ACCEPTED,
          message: 'create-virtual-account',
          data: result,
        };
        res.status(HttpStatus.ACCEPTED).send(response);
      })
      .catch((error) => {
        console.log(error);
        const response = {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Error create-virtual-account',
          data: error,
        };
        res.status(HttpStatus.BAD_REQUEST).send(response);
      });
  }

  @Get('get-transaction-by/:id')
  @ApiHeader({ name: 'api-key', required: true })
  async getTransactionById(@Res() res: Response, @Param('id') id: string) {
    await this.arventGroupService
      .getTransactionById(id)
      .then((result) => {
        const response = {
          statusCode: HttpStatus.ACCEPTED,
          message: 'transactions',
          data: result,
        };
        res.status(HttpStatus.ACCEPTED).send(response);
      })
      .catch((error) => {
        console.log(error);

        const response = {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Error transactions',
          data: error,
        };
        res.status(HttpStatus.BAD_REQUEST).send(response);
      });
  }
}
