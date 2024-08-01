import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

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
  obp_origin: string;
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