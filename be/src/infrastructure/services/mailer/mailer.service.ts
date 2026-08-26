import { MailerService } from '@nestjs-modules/mailer'
import { Inject, Injectable } from '@nestjs/common'

import Stripe from 'stripe'

import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import { IMailerService } from '@domain/services/mailer.interface'
import {
  IStripeService,
  STRIPE_SERVICE,
} from '@domain/services/stripe.interface'

@Injectable()
export class NodeMailerService implements IMailerService {
  constructor(
    private readonly mailService: MailerService,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,

    @Inject(STRIPE_SERVICE)
    private readonly stripeService: IStripeService,
  ) {}

  async sendMail(to: string, subject: string, text?: string): Promise<void> {
    try {
      await this.mailService.sendMail({
        to,
        subject: subject,
        from: 'App Scheduling <kingisalwayme@gmail.com>',
        text: text,
      })
    } catch (error) {
      throw this.exceptionsService.internalServerErrorException({
        type: 'InternalServerError',
        message: 'Failed to send email',
      })
    }
  }
}
