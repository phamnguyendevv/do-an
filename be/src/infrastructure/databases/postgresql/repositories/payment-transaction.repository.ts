import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Repository } from 'typeorm'

import {
  ICreatePaymentTransactionInput,
  PaymentTransactionEntity,
} from '@domain/entities/payment-transaction.entity'
import { IPaymentTransactionRepositoryInterface } from '@domain/repositories/payment-transaction.repository.interface'

import { PaymentTransaction } from '../entities/payment-transaction.entity'

@Injectable()
export class PaymentTransactionRepository
  implements IPaymentTransactionRepositoryInterface
{
  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly transactionRepository: Repository<PaymentTransaction>,
  ) {}

  async findByReferenceCode(
    referenceCode: string,
  ): Promise<PaymentTransactionEntity | null> {
    const tx = await this.transactionRepository.findOne({
      where: { referenceCode },
    })
    return (tx as PaymentTransactionEntity) ?? null
  }

  async findByOrderId(orderId: number): Promise<PaymentTransactionEntity[]> {
    const txs = await this.transactionRepository.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
    })
    return txs as PaymentTransactionEntity[]
  }

  async findById(id: number): Promise<PaymentTransactionEntity | null> {
    const tx = await this.transactionRepository.findOne({
      where: { id },
    })
    return (tx as PaymentTransactionEntity) ?? null
  }

  async create(
    data: ICreatePaymentTransactionInput,
  ): Promise<PaymentTransactionEntity> {
    const newTx = this.transactionRepository.create(data)
    const saved = await this.transactionRepository.save(newTx)
    return saved as PaymentTransactionEntity
  }
}
