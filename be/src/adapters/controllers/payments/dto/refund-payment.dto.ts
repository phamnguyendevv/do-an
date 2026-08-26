import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'

export class RefundPaymentDto {
  @IsNotEmpty()
  paymentId!: number

  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number // Nếu không có thì hoàn toàn bộ

  @IsOptional()
  @IsString()
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
}
