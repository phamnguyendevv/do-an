import { IsNotEmpty, IsOptional, Max, Min } from 'class-validator'

export class CreatePaymentDto {
  @IsNotEmpty()
  amount!: number

  @IsNotEmpty()
  @IsNotEmpty()
  currency!: string

  appointmentId!: number

  stripePaymentId?: string

  stripeSessionId?: string

  status?: string

  paymentMethod!: string

  paymentDate?: Date

  refundAmount?: number

  refundDate?: Date

  @IsOptional()
  metadata?: {
    appointmentId?: number
    userId?: string
  }
}
