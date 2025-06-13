import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { TypeTransactions } from '../enum';

export class LoginDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  Email: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  Password: string;
}

export class CashOutDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  cuit: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  cbu: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  monto: number;
}

export class DoRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  destinationCbu: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  email: string;
}

export class arventGetTransactionsCredit {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  obp_limit: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  obp_offset: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  obp_from_date: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  obp_to_date: string;

  @ApiProperty({ default: 'TRANSFERENCIAS_RECIBIDAS' })
  @IsString()
  @IsNotEmpty()
  obp_categories: string;
}

export class DoRequestDtoDebin {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  originCbu: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  email: string;
}

export class arventGetTransactions {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  limit: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  offset: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accountEmail: string;

  @ApiProperty({ enum: TypeTransactions, default: TypeTransactions[0] })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  type?: string;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  @IsNotEmpty()
  fromDate: Date;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  @IsNotEmpty()
  toDate: Date;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class createClientCvu {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  customerId: string;
}

export class changeAliasByCvu {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cuit: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cvu: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  label: string;
}

export class createClientCvuBind {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cuit: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class updateNameBind {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cvu: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;
}
