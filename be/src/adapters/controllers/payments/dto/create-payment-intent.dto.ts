import { IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class CreatePaymentIntentDto {
  @IsNumber()
  @Min(0.5)
  amount!: number

  @IsString()
  @IsOptional()
  currency?: string = 'usd'

  @IsOptional()
  metadata?: {
    appointmentId?: number
    userId?: string
  }
}
