import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Logger,
  Param,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from '@nestjs/common'
import { ApiHeader, ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'
import { Request } from 'express'

import { verifySepayWebhookSignature } from '@domain/utils/sepay-signature.util'
import { GetSepayOrderStatusUseCase } from '@use-cases/orders/get-sepay-order-status.use-case'
import {
  ProcessSepayPaymentUseCase,
  ProcessSepayWebhookDto,
} from '@use-cases/orders/process-sepay-payment.use-case'

export class SePayWebhookDto implements ProcessSepayWebhookDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  id?: number

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  gateway?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  transactionDate?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  accountNumber?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  subAccount?: string | null

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  transferType?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  transferAmount?: number

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  accumulated?: number

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  code?: string | null

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  content?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  referenceCode?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string
}

export class SimulateSepayDto {
  @ApiProperty({ example: 'ORD-2025001', required: true })
  @IsNotEmpty()
  @IsString()
  orderCode!: string

  @ApiProperty({ example: 150000, required: false })
  @IsOptional()
  @IsNumber()
  amount?: number
}

@Controller('payment/sepay')
@ApiTags('Payment - SePay')
@ApiResponse({ status: 500, description: 'Internal server error' })
export class SePayController {
  private readonly logger = new Logger(SePayController.name)

  constructor(
    private readonly getSepayOrderStatusUseCase: GetSepayOrderStatusUseCase,
    private readonly processSepayPaymentUseCase: ProcessSepayPaymentUseCase,
  ) {}

  @Get('config')
  @ApiOperation({ summary: 'Lấy thông tin cấu hình SePay mặc định của hệ thống' })
  getConfig() {
    return {
      success: true,
      bank: process.env.SEPAY_BANK || 'MBBank',
      accountNumber: process.env.SEPAY_ACCOUNT || '00977512982',
      accountName: process.env.SEPAY_ACCOUNT_NAME || 'PHAM TRUNG NGUYEN',
      webhookUrl: '/api/v1/payment/sepay/webhook',
    }
  }

  @Get('status/:orderCode')
  @ApiOperation({ summary: 'Kiểm tra trạng thái thanh toán của đơn hàng theo orderCode (Public - dùng cho POS polling)' })
  async checkOrderStatus(@Param('orderCode') orderCode: string) {
    return await this.getSepayOrderStatusUseCase.execute(orderCode)
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook nhận thông báo biến động số dư và xác nhận thanh toán tự động từ SePay' })
  @ApiHeader({
    name: 'x-sepay-signature',
    required: false,
    description: 'Chữ ký HMAC-SHA256 hoặc API Token do SePay gửi',
  })
  @ApiHeader({
    name: 'authorization',
    required: false,
    description: 'Apikey <secret> do SePay gửi',
  })
  async handleWebhook(
    @Body() payload: SePayWebhookDto,
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-sepay-signature') signature?: string,
    @Headers('x-signature') xSignature?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const secret = process.env.SEPAY_WEBHOOK_SECRET || ''

    // Verify HMAC-SHA256 / API Key Signature
    const isValid = verifySepayWebhookSignature({
      secret,
      rawBody: req.rawBody,
      payload,
      signature,
      xSignature,
      authorization,
    })

    if (!isValid) {
      this.logger.warn(`Invalid SePay webhook signature. Rejected request.`)
      throw new UnauthorizedException('Chữ ký SePay Webhook (Signature) không hợp lệ')
    }

    return await this.processSepayPaymentUseCase.execute(payload)
  }

  @Post('simulate')
  @ApiOperation({ summary: 'Giả lập test Webhook SePay gạch nợ đơn hàng' })
  async simulateWebhook(@Body() body: SimulateSepayDto) {
    return await this.processSepayPaymentUseCase.execute({
      gateway: 'MBBank',
      accountNumber: process.env.SEPAY_ACCOUNT || '00977512982',
      transferType: 'in',
      transferAmount: body.amount || 100000,
      content: `${body.orderCode} TEST THANH TOAN SEPAY`,
      description: `${body.orderCode} TEST THANH TOAN SEPAY`,
      transactionDate: new Date().toISOString(),
    })
  }
}
