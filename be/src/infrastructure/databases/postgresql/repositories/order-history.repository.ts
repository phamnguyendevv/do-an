import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Repository } from 'typeorm'

import { OrderHistoryEntity } from '@domain/entities/order-history.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import {
  IOrderHistoryRepositoryInterface,
  ISearchOrderHistoryParams,
} from '@domain/repositories/order-history.repository.interface'

import { OrderHistory } from '../entities/order-history.entity'

@Injectable()
export class OrderHistoryRepository
  implements IOrderHistoryRepositoryInterface
{
  constructor(
    @InjectRepository(OrderHistory)
    private readonly historyRepository: Repository<OrderHistory>,
  ) {}

  async findByOrderId(orderId: number): Promise<OrderHistoryEntity[]> {
    return await this.historyRepository.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
    })
  }

  async findByOrderCode(orderCode: string): Promise<OrderHistoryEntity[]> {
    return await this.historyRepository.find({
      where: { orderCode },
      order: { createdAt: 'DESC' },
    })
  }

  async findHistories({
    size,
    page,
    orderId,
    orderCode,
    action,
    search,
    actor,
    startDate,
    endDate,
  }: ISearchOrderHistoryParams): Promise<{
    data: OrderHistoryEntity[]
    pagination: IPaginationParams
  }> {
    const limit = size || 50
    const currentPage = page || 1

    const query = this.historyRepository
      .createQueryBuilder('oh')
      .take(limit)
      .skip((currentPage - 1) * limit)
      .orderBy('oh.createdAt', 'DESC')

    if (search) {
      query.andWhere(
        '(oh.orderCode ILIKE :search OR oh.title ILIKE :search OR oh.note ILIKE :search OR oh.actor ILIKE :search)',
        { search: `%${search}%` },
      )
    }

    if (orderId) {
      query.andWhere('oh.orderId = :orderId', { orderId })
    }

    if (orderCode) {
      query.andWhere('oh.orderCode = :orderCode', { orderCode })
    }

    if (action && action !== 'all') {
      query.andWhere('oh.action = :action', { action })
    }

    if (actor) {
      query.andWhere('oh.actor ILIKE :actor', { actor: `%${actor}%` })
    }

    if (startDate) {
      query.andWhere('oh.createdAt >= :startDate', {
        startDate: new Date(startDate),
      })
    }

    if (endDate) {
      query.andWhere('oh.createdAt <= :endDate', {
        endDate: new Date(endDate),
      })
    }

    const [data, total] = await query.getManyAndCount()

    return {
      data,
      pagination: {
        total,
        page: currentPage,
        size: limit,
      },
    }
  }

  async createHistory(
    history: Partial<OrderHistoryEntity>,
  ): Promise<OrderHistoryEntity> {
    const newHistory = this.historyRepository.create(history)
    return await this.historyRepository.save(newHistory)
  }
}
