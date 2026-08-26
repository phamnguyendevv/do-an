import { ApiProperty } from "@nestjs/swagger"
import { IsOptional } from "class-validator"

export class  RevenueByServiceDto {
  @ApiProperty({ required: false })
  @IsOptional()
  serviceId?: number

  @ApiProperty({ required: false })
  @IsOptional()
  serviceName?: string
}
