import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'

import { CreateCheckoutSessionUseCase } from '@use-cases/payment/create-checkout-session.use-case'
import { GetStatusSessionUseCase } from '@use-cases/payment/get-status-session.use-case'
import { HandleWebhookUseCase } from '@use-cases/payment/handle-webhook.use-case'
import { RefundPaymentUseCase } from '@use-cases/payment/refund-paymnet.use-case'

import { CheckPolicies } from '../common/decorators/check-policies.decorator'
import { ApiResponseType } from '../common/decorators/swagger-response.decorator'
import { User } from '../common/decorators/user.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { PoliciesGuard } from '../common/guards/policies.guard'
import { CreateCheckoutSessionDto2 } from './dto/create-checkout-session.dto'
import { CreateCheckoutSessionPresenter } from './presenters/create-checkout-session.presenters'

@Controller('payments')
@ApiTags('Payments')
export class PaymentController {
  constructor(
    private handleWebhookUseCase: HandleWebhookUseCase,
    private createCheckoutSessionUseCase: CreateCheckoutSessionUseCase,
    private getSessionStatusUseCase: GetStatusSessionUseCase,
    private refundPaymentUseCase: RefundPaymentUseCase,
  ) {}

  @Post('create-checkout-session')
  @ApiExtraModels(CreateCheckoutSessionDto2, CreateCheckoutSessionPresenter)
  @ApiOperation({
    summary: 'Create a checkout session for payment',
  })
  @ApiBody({
    type: CreateCheckoutSessionDto2,
    description: 'Details for creating a checkout session',
  })
  @ApiResponseType(CreateCheckoutSessionPresenter, false)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies({ action: 'create', subject: 'Payment' })
  async createCheckoutSession(
    @Body() createCheckoutSessionDto: CreateCheckoutSessionDto2,
    @User('id') userId: number,
  ) {
    const checkoutSession = await this.createCheckoutSessionUseCase.execute(
      createCheckoutSessionDto,
      userId,
    )
    return new CreateCheckoutSessionPresenter(checkoutSession)
  }

  @Get(':sessionId/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get session status',
  })
  @ApiResponseType(CreateCheckoutSessionPresenter, false)
  @ApiBearerAuth()
  async getSessionStatus(@Param('sessionId') sessionId: string) {
    return await this.getSessionStatusUseCase.execute(sessionId)
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const payload = req.rawBody as Buffer
    return this.handleWebhookUseCase.execute(payload, signature)
  }

  @Get('refund/:sessionId')
  async refundPayment(@Param('sessionId') sessionId: string) {
    return await this.refundPaymentUseCase.execute(sessionId)
  }
}
