import { Inject, Injectable } from '@nestjs/common'

import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IStripeService,
  STRIPE_SERVICE,
} from '@domain/services/stripe.interface'

@Injectable()
export class RefundPaymentUseCase {
  constructor(
    @Inject(STRIPE_SERVICE)
    private readonly stripeService: IStripeService,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}
  async execute(sessionId: string) {
    const isSessionExists = await this.checkSessionExists(sessionId)
    const paymentIntentId = isSessionExists.payment_intent as string
    const refund = await this.stripeService.refundPayment(paymentIntentId)
    return refund
  }

  private async checkSessionExists(sessionId: string) {
    const session = await this.stripeService.getSession(sessionId)
    if (!session) {
      throw this.exceptionsService.notFoundException({
        type: 'SessionNotFoundException',
        message: 'Session not found',
      })
    }
    return session
  }
}
