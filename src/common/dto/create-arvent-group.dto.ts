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