import {
  Body,
  Controller,
  ForbiddenException,
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
import {
  ApiHeader,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'

import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'
import { Request } from 'express'

import { verifySepayWebhookSignature } from '@domain/utils/sepay-signature.util'

import { GetSepayOrderStatusUseCase } from '@use-cases/orders/get-sepay-order-status.use-case'
import { ProcessSepayPaymentUseCase } from '@use-cases/orders/process-sepay-payment.use-case'

import { EnvironmentConfigService } from '@infrastructure/config/environment/environment-config.service'

import { SePayWebhookDto } from './dto/sepay-webhook.dto'

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
    private readonly configService: EnvironmentConfigService,
  ) {}

  @Get('config')
  @ApiOperation({
    summary: 'Lấy thông tin cấu hình SePay mặc định của hệ thống',
  })
  getConfig() {
    return {
      success: true,
      bank: this.configService.getSepayBank(),
      accountNumber: this.configService.getSepayAccount(),
      accountName: this.configService.getSepayAccountName(),
      webhookUrl: '/api/v1/payment/sepay/webhook',
    }
  }

  @Get('status/:orderCode')
  @ApiOperation({
    summary:
      'Kiểm tra trạng thái thanh toán của đơn hàng theo orderCode (Public - dùng cho POS polling)',
  })
  async checkOrderStatus(@Param('orderCode') orderCode: string) {
    return await this.getSepayOrderStatusUseCase.execute(orderCode)
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Webhook nhận thông báo biến động số dư và xác nhận thanh toán tự động từ SePay',
  })
  @ApiHeader({
    name: 'x-sepay-signature',
    required: false,
    description: 'Chữ ký HMAC-SHA256 (sha256=...) do SePay gửi',
  })
  @ApiHeader({
    name: 'x-sepay-timestamp',
    required: false,
    description: 'Unix timestamp do SePay gửi khi dùng HMAC-SHA256',
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
    @Headers('x-sepay-timestamp') timestamp?: string,
    @Headers('x-timestamp') xTimestamp?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const secret = this.configService.getSepayWebhookSecret()

    // Verify HMAC-SHA256 / API Key Signature
    const isValid = verifySepayWebhookSignature({
      secret,
      rawBody: req.rawBody,
      payload,
      signature,
      xSignature,
      timestamp: timestamp || xTimestamp,
      authorization,
    })

    if (!isValid) {
      this.logger.warn(
        `Invalid SePay webhook signature. Header authorization: ${authorization ? 'provided' : 'missing'}, signature: ${signature || xSignature ? 'provided' : 'missing'}, timestamp: ${timestamp || xTimestamp ? 'provided' : 'missing'}, secretConfigured: ${Boolean(secret)}`,
      )
      throw new UnauthorizedException(
        'Chữ ký SePay Webhook (Signature) không hợp lệ',
      )
    }

    return await this.processSepayPaymentUseCase.execute(payload)
  }

  @Post('simulate')
  @ApiOperation({ summary: 'Giả lập test Webhook SePay gạch nợ đơn hàng' })
  async simulateWebhook(@Body() body: SimulateSepayDto) {
    if (this.configService.getNodeEnv() === 'production') {
      throw new ForbiddenException(
        'Simulate SePay webhook is disabled in production',
      )
    }
    return await this.processSepayPaymentUseCase.execute({
      gateway: this.configService.getSepayBank(),
      accountNumber: this.configService.getSepayAccount(),
      transferType: 'in',
      transferAmount: body.amount || 100000,
      content: `${body.orderCode} TEST THANH TOAN SEPAY`,
      description: `${body.orderCode} TEST THANH TOAN SEPAY`,
      transactionDate: new Date().toISOString(),
    })
  }
}
