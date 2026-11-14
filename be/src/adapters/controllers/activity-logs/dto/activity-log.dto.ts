import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class ListActivityLogsDto {
  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  action?: string

  @IsOptional()
  @IsString()
  resourceType?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  size?: number = 20
}
