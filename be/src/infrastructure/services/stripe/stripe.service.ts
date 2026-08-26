import { Inject, Injectable, Logger } from '@nestjs/common'

import { error } from 'console'
import Stripe from 'stripe'

import { CheckoutSessionEntity } from '@domain/entities/payment.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IStripeService,
  STRIPE_CLIENT,
} from '@domain/services/stripe.interface'

import { EnvironmentConfigService } from '@infrastructure/config/environment/environment-config.service'

@Injectable()
export class StripeService implements IStripeService {
  private readonly logger = new Logger(StripeService.name)
  constructor(
    @Inject(STRIPE_CLIENT)
    private readonly stripeClient: Stripe,

    private readonly environmentConfigService: EnvironmentConfigService,

    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  // Accept Payments (Create Payment Intent)
  async createPaymentIntent(params: {
    amount: number
    currency: string
    metadata?: {
      appointmentId?: number
      userId?: string
    }
  }): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const paymentIntent = await this.stripeClient.paymentIntents.create({
      amount: params.amount,
      currency: params.currency,
      automatic_payment_methods: { enabled: true },
      metadata: params.metadata,
    })

    return {
      clientSecret: paymentIntent.client_secret || '',
      paymentIntentId: paymentIntent.id,
    }
  }

  constructEventFromPayload(payload: string, signature: string): Stripe.Event {
    const webhookSecret = this.environmentConfigService.getStripeWebhookSecret()
    try {
      return this.stripeClient.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      )
    } catch {
      throw this.exceptionsService.badRequestException({
        type: 'WebhookSignatureVerificationException',
        message: 'Failed to verify webhook signature',
      })
    }
  }

  async createCheckoutSession(checkoutSessionDto: CheckoutSessionEntity) {
    try {
      const session = await this.stripeClient.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: checkoutSessionDto.name,
                description: checkoutSessionDto.description,
              },
              unit_amount: checkoutSessionDto.amount,
            },
            quantity: 1,
          },
        ],
        customer: checkoutSessionDto.customerId,
        mode: 'payment',
        success_url: checkoutSessionDto.successUrl,
        cancel_url: checkoutSessionDto.cancelUrl,
        payment_intent_data: {
          metadata: {
            appointmentId: checkoutSessionDto.appointmentId,
            userId: checkoutSessionDto.userId,
          },
        },
      })

      return {
        sessionId: session.id,
        url: session.url,
      }
    } catch (error) {
      this.logger.error('Stripe checkout error:', error)
      throw this.exceptionsService.badRequestException({
        type: 'StripeCheckoutException',
        message: 'Failed to create checkout session',
      })
    }
  }

  async createOrGetCustomer(params: {
    email: string
    name?: string
    phone?: string
    description?: string
    address?: {
      line1?: string
      line2?: string
      city?: string
      state?: string
      postal_code?: string
      country?: string
    }
    metadata?: Record<string, string>
  }): Promise<Stripe.Customer> {
    try {
      const existingCustomer = await this.findCustomerByEmail(params.email)

      if (existingCustomer) {
        if (params.name || params.phone || params.address || params.metadata) {
          return await this.updateCustomer(existingCustomer.id, {
            name: params.name,
            phone: params.phone,
            description: params.description,
            address: params.address,
            metadata: params.metadata,
          })
        }
        return existingCustomer
      }
      return await this.createCustomer(params)
    } catch (error) {
      this.logger.error('Create or get customer error:', error)
      throw this.exceptionsService.badRequestException({
        type: 'CreateOrGetCustomerException',
        message: 'Failed to create or get customer',
      })
    }
  }
  async findCustomerByEmail(email: string): Promise<Stripe.Customer | null> {
    try {
      const customers = await this.stripeClient.customers.list({
        email: email,
        limit: 1,
      })

      return customers.data.length > 0 ? customers.data[0] : null
    } catch (error) {
      this.logger.error('Find customer by email error:', error)
      throw this.exceptionsService.badRequestException({
        type: 'FindCustomerByEmailException',
        message: 'Failed to find customer by email',
      })
    }
  }
  async createCustomer(params: {
    email?: string
    name?: string
    phone?: string
    description?: string
    address?: {
      line1?: string
      line2?: string
      city?: string
      state?: string
      postal_code?: string
      country?: string
    }
    shipping?: {
      name: string
      address: {
        line1: string
        line2?: string
        city: string
        state?: string
        postal_code: string
        country: string
      }
    }
    metadata?: Record<string, string>
    paymentMethod?: string // để attach payment method luôn
  }): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripeClient.customers.create({
        email: params.email,
        name: params.name,
        phone: params.phone,
        description: params.description,
        address: params.address,
        shipping: params.shipping,
        metadata: params.metadata,
      })

      // Nếu có payment method thì attach luôn
      if (params.paymentMethod) {
        await this.stripeClient.paymentMethods.attach(params.paymentMethod, {
          customer: customer.id,
        })
      }

      return customer
    } catch (error) {
      this.logger.error('Create customer error:', error)
      throw this.exceptionsService.badRequestException({
        type: 'CreateOrGetCustomerException',
        message: 'Failed to create or get customer',
      })
    }
  }
  async updateCustomer(
    customerId: string,
    params: {
      email?: string
      name?: string
      phone?: string
      description?: string
      address?: {
        line1?: string
        line2?: string
        city?: string
        state?: string
        postal_code?: string
        country?: string
      }
      metadata?: Record<string, string>
    },
  ): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripeClient.customers.update(customerId, {
        email: params.email,
        name: params.name,
        phone: params.phone,
        description: params.description,
        address: params.address,
        metadata: params.metadata,
      })

      return customer
    } catch (error) {
      this.logger.error('Update customer error:', error)
      throw this.exceptionsService.badRequestException({
        type: 'UpdateCustomerException',
        message: 'Failed to update customer',
      })
    }
  }

  //-------------------------invoice-------------------------
  async getSession(sessionId: string) {
    try {
      const session =
        await this.stripeClient.checkout.sessions.retrieve(sessionId)
      return session
    } catch (error) {
      this.logger.error('Get session error:', error)
      throw this.exceptionsService.badRequestException({
        type: 'GetSessionException',
        message: 'Failed to get session',
      })
    }
  }

  async refundPayment(paymentIntentId: string) {
    try {
      const refund = await this.stripeClient.refunds.create({
        payment_intent: paymentIntentId,
      })
      return refund
    } catch (error) {
      this.logger.error('Refund payment error:', error)
      throw this.exceptionsService.badRequestException({
        type: 'RefundPaymentException',
        message: 'Failed to refund payment',
      })
    }
  }
}
