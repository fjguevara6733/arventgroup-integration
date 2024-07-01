import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ConsultoraMutualService } from './consultora-mutual.service';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import {
  CashOutDto,
  LoginDto,
} from 'src/common/dto/create-consultora-mutual.dto';

@Controller()
@ApiTags('consultora-mutual')
export class ConsultoraMutualController {
  constructor(
    private readonly consultoraMutualService: ConsultoraMutualService,
  ) {}

  @Post('login')
  async login(@Body() body: LoginDto) {
    try {
      return {
        statusCode: HttpStatus.ACCEPTED,
        message: 'login',
        data: await this.consultoraMutualService.login(body),
      };
    } catch (error) {
      throw new HttpException(error?.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('cash-out')
  @ApiHeader({ name: 'Bearer Token', required: true })
  async cashOut(@Body() body: CashOutDto) {
    try {
      return {
        statusCode: HttpStatus.ACCEPTED,
        message: 'cash-out',
        data: await this.consultoraMutualService.cashOut(body),
      };
    } catch (error) {
      throw new HttpException(error?.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('get-customer-by-alias/:alias')
  @ApiHeader({ name: 'Bearer Token', required: true })
  async getCustomerByAlias(@Param('alias') alias: string) {
    try {
      return {
        statusCode: HttpStatus.ACCEPTED,
        message: 'get-customer-by-alias',
        data: await this.consultoraMutualService.getCustomerByAlias(alias),
      };
    } catch (error) {
      throw new HttpException(error?.message, HttpStatus.BAD_REQUEST);
    }
  }
  @Get('get-customer-by-cbu/:cbu')
  @ApiHeader({ name: 'Bearer Token', required: true })
  async getCustomerByCbu(@Param('cbu') cbu: string) {
    try {
      return {
        statusCode: HttpStatus.ACCEPTED,
        message: 'get-customer-by-cbu',
        data: await this.consultoraMutualService.getCustomerByCbu(cbu),
      };
    } catch (error) {
      throw new HttpException(error?.message, HttpStatus.BAD_REQUEST);
    }
  }
}
