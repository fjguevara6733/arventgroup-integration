// company.dto.ts
import { IsString, IsEmail, IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  contractStatuteAttachment: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  lastBalanceAttachment: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  AFIPRegistrationCertificateAttachment: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  IBBRegistrationCertificateAttachment: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  notaryActAttachment: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(['Yes', 'No'])
  subjectToArticle20: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(['Yes', 'No'])
  politicPerson: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(['Yes', 'No'])
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
  dniFrontFile: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  dniBackFile: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  cuitCDICIE: string;
}

export class PersonDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  regulatedEntity20: string;

  @ApiProperty()
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
  fileCuitFront: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  fileCuitBack: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  cuitCuil: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  cp: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  country: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  address: string;
}
