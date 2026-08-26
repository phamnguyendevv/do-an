import { Inject, Injectable } from '@nestjs/common'

import {
  IStripeService,
  STRIPE_SERVICE,
} from '@domain/services/stripe.interface'

@Injectable()
export class GetStatusSessionUseCase {
  constructor(
    @Inject(STRIPE_SERVICE)
    private readonly stripeService: IStripeService,
  ) {}
  async execute(sessionId: string) {
    const session = await this.stripeService.getSession(sessionId)
    if (session.payment_status === 'paid') {
      return true
    }
    return false
  }
}
