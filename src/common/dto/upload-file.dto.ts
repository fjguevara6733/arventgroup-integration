import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum, IsString } from 'class-validator';
import { KycDocTypes } from '../enum';

export class UploadedDocDto {
  @ApiProperty()
  @IsEnum(KycDocTypes)
  @IsNotEmpty()
  docType: KycDocTypes;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  customerId: string;
}
