import { Inject, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Repository } from 'typeorm'

import { PaymentEntity } from '@domain/entities/payment.entity'
import { IPaymentRepositoryInterface } from '@domain/repositories/payment.repository.interface'

import { Payment } from '../entities/payment.entity'

@Injectable()
export class PaymentRepository implements IPaymentRepositoryInterface {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}
  createPayment(payment: Partial<PaymentEntity>): Promise<PaymentEntity> {
    return this.paymentRepository.save(payment)
  }

  findOnePayment(params: {
    stripeSessionId: string
  }): Promise<PaymentEntity | null> {
    return this.paymentRepository.findOne({
      where: { sessionId: params.stripeSessionId },
    })
  }

  async findOnePaymentById(id: number): Promise<PaymentEntity | null> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
    })
    return payment ? payment : null
  }
  async updatePayment(
    sessionId: string,
    payment: Partial<PaymentEntity>,
  ): Promise<PaymentEntity | null> {
    await this.paymentRepository.update({ sessionId: sessionId }, payment)
    return await this.paymentRepository.findOne({
      where: { sessionId: sessionId },
    })
  }
}
