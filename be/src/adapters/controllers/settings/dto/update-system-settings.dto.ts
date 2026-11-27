import { Type } from 'class-transformer'
import {
  IsIn,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator'

export class SepaySettingsDto {
  @IsString()
  @Length(1, 50)
  bank!: string

  @IsString()
  @Length(1, 100)
  accountNumber!: string

  @IsString()
  @Length(1, 120)
  accountName!: string

  @IsIn(['compact', 'compact2', 'qr_only', 'default'])
  qrTemplate!: 'compact' | 'compact2' | 'qr_only' | 'default'
}

export class StoreBrandingDto {
  @IsString()
  @Length(1, 150)
  storeName!: string

  @IsString()
  @Length(1, 255)
  address!: string

  @IsString()
  @Length(1, 50)
  hotline!: string

  @IsString()
  @Length(1, 150)
  website!: string

  @IsString()
  @Length(1, 255)
  footerNote!: string
}

export class UpdateSystemSettingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SepaySettingsDto)
  sepay?: SepaySettingsDto

  @IsOptional()
  @ValidateNested()
  @Type(() => StoreBrandingDto)
  branding?: StoreBrandingDto
}
