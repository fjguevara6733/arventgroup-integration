// company.dto.ts
import {
  IsString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { normalResponse } from '../enum';

export class UserCompanyDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  businessName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  taxId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  postalCode: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  country: string;

  @ApiProperty()
  registrationDate: Date;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  mainActivity: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  headquartersPhone: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ enum: normalResponse, default: normalResponse[0] })
  @IsNotEmpty()
  @IsEnum(['Si', 'No'])
  subjectToArticle20: string;

  @ApiProperty({ enum: normalResponse, default: normalResponse[0] })
  @IsNotEmpty()
  @IsEnum(['Si', 'No'])
  politicPerson: string;

  @ApiProperty({ enum: normalResponse, default: normalResponse[0] })
  @IsNotEmpty()
  @IsEnum(['Si', 'No'])
  regulatedEntity20: string;

  @ApiProperty()
  participationPercentage: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  cuitCDICIE: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  customerId: string;
}

export class PersonDTO {
  @ApiProperty({ enum: normalResponse, default: normalResponse[0] })
  @IsNotEmpty()
  @IsString()
  regulatedEntity20: string;

  @ApiProperty({ enum: normalResponse, default: normalResponse[0] })
  @IsNotEmpty()
  @IsString()
  politicPerson: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  occupation: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  locality: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  fiscalSituation: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  cuitCuil: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  postalCode: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  country: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  customerId: string;
}
