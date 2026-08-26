import { ApiProperty } from '@nestjs/swagger'

import { Transform } from 'class-transformer'
import { IsNumber, IsOptional, IsString, Min } from 'class-validator'

import { ProviderStatusEnum } from '@domain/entities/status.entity'
import { ISearchProviderParams } from '@domain/repositories/provider-profile.respository.interface'

export class GetListProviderDto implements ISearchProviderParams {
  @ApiProperty({
    required: true,
    enum: ProviderStatusEnum,
    description: '1: active , 2: inactive, 3: pending, 4: banned',
  })
  status!: ProviderStatusEnum

  @ApiProperty({
    required: false,
    minimum: 1,
    description: 'empty: All',
  })
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value))
  @IsOptional()
  @Min(1)
  size?: number

  @ApiProperty({
    required: false,
    minimum: 1,
    description: 'empty: All',
  })
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value))
  @IsOptional()
  @Min(1)
  page?: number

  @ApiProperty({
    required: false,
    description: 'empty: All',
  })
  @IsString()
  @IsOptional()
  search?: string
}
