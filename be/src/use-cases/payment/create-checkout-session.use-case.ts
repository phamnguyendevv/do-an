import { Inject, Injectable } from '@nestjs/common'

import { OrderStatusEnum } from '@domain/entities/order.entity'
import { PaymentStatusEnum } from '@domain/entities/payment.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  APPOINTMENT_REPOSITORY,
  IAppointmentRepositoryInterface,
} from '@domain/repositories/appointment.repository.interface'
import {
  IOrderRepositoryInterface,
  ORDER_REPOSITORY,
} from '@domain/repositories/order.repository.interface'
import {
  IPaymentRepositoryInterface,
  PAYMENT_REPOSITORY,
} from '@domain/repositories/payment.repository.interface'
import {
  IUserRepositoryInterface,
  USER_REPOSITORY,
} from '@domain/repositories/user.repository.interface'
import { STRIPE_SERVICE } from '@domain/services/stripe.interface'

import { CreateCheckoutSessionDto2 } from '@adapters/controllers/payments/dto/create-checkout-session.dto'

import { StripeService } from '@infrastructure/services/stripe/stripe.service'

@Injectable()
export class CreateCheckoutSessionUseCase {
  constructor(
    @Inject(STRIPE_SERVICE)
    private readonly stripeService: StripeService,

    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepositoryInterface,

    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepositoryInterface,

    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepositoryInterface,

    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(
    createCheckoutSessionDto: CreateCheckoutSessionDto2,
    userId: number,
  ): Promise<{
    sessionId: string
    sessionUrl: string
  }> {
    const user = await this.checkUserExists(userId)

    const createCustomer = await this.stripeService.createOrGetCustomer({
      email: user.email,
      name: user.username,
      phone: user.phone,
    })

    const { appointmentId } = createCheckoutSessionDto
    const appointment = await this.checkAppointmentExists(appointmentId, userId)

    const name = appointment.data[0].service?.name

    const totalAmount =
      appointment.data[0].totalAmount - appointment.data[0].discountAmount
    const session = await this.stripeService.createCheckoutSession({
      name: name || 'Appointment Payment',
      description: appointment.data[0].service?.description || '',
      amount: totalAmount,
      successUrl: createCheckoutSessionDto.successUrl,
      cancelUrl: createCheckoutSessionDto.cancelUrl,
      userId: String(user.id),
      appointmentId: String(appointment.data[0].id),
      customerId: createCustomer.id,
    })

    await this.checkPaymentExists(session.sessionId)

    const order = await this.orderRepository.createOrder({
      userId: user.id,
      appointmentId: appointment.data[0].id,
      totalAmount,
      currency: 'usd',
      status: OrderStatusEnum.Pending,
      note: '',
    })

    await this.paymentRepository.createPayment({
      orderId: order.id,
      stripeCustomerId: createCustomer.id,
      amount: totalAmount,
      currency: 'usd',
      status: PaymentStatusEnum.Pending,
      paymentDate: new Date(),
      customerEmail: user.email,
      sessionId: session.sessionId,
    })

    if (!session.url) {
      throw this.exceptionsService.badRequestException({
        type: 'StripeSessionUrlException',
        message: 'Stripe session URL is not available',
      })
    }
    return {
      sessionId: session.sessionId,
      sessionUrl: session.url,
    }
  }
  private async checkUserExists(userId: number) {
    const user = await this.userRepository.getUserById(userId)
    if (!user) {
      throw this.exceptionsService.notFoundException({
        type: 'UserNotFoundException',
        message: 'User not found',
      })
    }
    return user
  }
  private async checkAppointmentExists(appointmentId: number, userId: number) {
    const appointment = await this.appointmentRepository.findAppointments({
      id: appointmentId,
      clientId: userId,
    })
    if (!appointment.data || appointment.data.length === 0) {
      throw this.exceptionsService.notFoundException({
        type: 'AppointmentNotFoundException',
        message: 'Appointment not found',
      })
    }
    return appointment
  }
  private async checkPaymentExists(sessionId: string) {
    const payment = await this.paymentRepository.findOnePayment({
      stripeSessionId: sessionId,
    })
    if (payment) {
      throw this.exceptionsService.badRequestException({
        type: 'PaymentSessionExistsException',
        message: 'Payment session already exists',
      })
    }
  }
}
