import { Inject, Injectable, Logger } from '@nestjs/common'

import { OrderStatusEnum } from '@domain/entities/order.entity'
import { PaymentStatusEnum } from '@domain/entities/payment.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IOrderRepositoryInterface,
  ORDER_REPOSITORY,
} from '@domain/repositories/order.repository.interface'
import {
  IPaymentRepositoryInterface,
  PAYMENT_REPOSITORY,
} from '@domain/repositories/payment.repository.interface'
import { STRIPE_SERVICE } from '@domain/services/stripe.interface'

import { CreateInvoiceFromOrderUseCase } from '@use-cases/invoices/create-invoice-from-order.use-case'

import { StripeService } from '@infrastructure/services/stripe/stripe.service'

@Injectable()
export class HandleWebhookUseCase {
  private readonly logger = new Logger(HandleWebhookUseCase.name)

  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepositoryInterface,
    @Inject(STRIPE_SERVICE)
    private readonly stripeService: StripeService,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepositoryInterface,
    private readonly createInvoiceFromOrderUseCase: CreateInvoiceFromOrderUseCase,
  ) {}

  async execute(payload: Buffer, signature: string) {
    const event = this.stripeService.constructEventFromPayload(
      payload.toString(),
      signature,
    )

    const updatePaymentAndOrder = async (
      paymentIntentId: string,
      paymentStatus: PaymentStatusEnum,
      orderStatus: OrderStatusEnum,
      shouldCreateInvoice: boolean = false,
    ) => {
      const payment = await this.paymentRepository.updatePayment(
        paymentIntentId,
        { status: paymentStatus },
      )

      if (!payment) {
        throw this.exceptionsService.notFoundException({
          type: 'PaymentNotFoundException',
          message: 'Payment not found',
        })
      }

      await this.orderRepository.updateOrder(payment.orderId!, {
        status: orderStatus,
      })

      // Auto-create invoice when payment is completed
      if (shouldCreateInvoice && payment.orderId) {
        try {
          await this.createInvoiceFromOrderUseCase.execute(payment.orderId)
          this.logger.log(
            `Invoice automatically created for order ${payment.orderId}`,
          )
        } catch (error) {
          this.logger.error(
            `Failed to create invoice for order ${payment.orderId}:`,
            error,
          )
          // Don't throw error here to avoid breaking the webhook processing
          // Log the error and continue
        }
      }

      return payment
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object
        await updatePaymentAndOrder(
          paymentIntent.id,
          PaymentStatusEnum.Paid,
          OrderStatusEnum.Completed,
          true, // Create invoice when payment succeeds
        )
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object
        await updatePaymentAndOrder(
          paymentIntent.id,
          PaymentStatusEnum.Cancelled,
          OrderStatusEnum.Failed,
          false, // Don't create invoice for failed payments
        )
        break
      }

      case 'checkout.session.completed': {
        const session = event.data.object
        const paymentIntentId = session.payment_intent as string
        if (paymentIntentId) {
          await updatePaymentAndOrder(
            paymentIntentId,
            PaymentStatusEnum.Paid,
            OrderStatusEnum.Completed,
            true, // Create invoice when checkout session completes
          )
        }
        break
      }

      case 'refund.updated': {
        const refund = event.data.object
        const paymentIntentId = refund.payment_intent as string
        if (paymentIntentId) {
          if (refund.status === 'succeeded') {
            await updatePaymentAndOrder(
              paymentIntentId,
              PaymentStatusEnum.Refunded,
              OrderStatusEnum.Refunded,
              false, // Don't create invoice for refunds
            )
          } else if (refund.status === 'failed') {
            await updatePaymentAndOrder(
              paymentIntentId,
              PaymentStatusEnum.Cancelled,
              OrderStatusEnum.Failed,
              false, // Don't create invoice for failed refunds
            )
          } else if (refund.status === 'pending') {
            await updatePaymentAndOrder(
              paymentIntentId,
              PaymentStatusEnum.RefundPending,
              OrderStatusEnum.RefundPending,
              false, // Don't create invoice for pending refunds
            )
          }
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object
        const paymentIntentId = charge.payment_intent as string
        if (paymentIntentId) {
          await updatePaymentAndOrder(
            paymentIntentId,
            PaymentStatusEnum.Refunded,
            OrderStatusEnum.Refunded,
            false, // Don't create invoice for refunds
          )
        }
        break
      }

      default:
        break
    }

    return { received: true }
  }
}
