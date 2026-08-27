import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { ILike, Repository } from 'typeorm'

import { BookstoreOrderEntity } from '@domain/entities/bookstore-order.entity'
import { OrderStatusEnum, PaymentStatusEnum } from '@domain/entities/order-enums.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import {
  IBookstoreOrderRepositoryInterface,
  ISearchBookstoreOrdersParams,
} from '@domain/repositories/bookstore-order.repository.interface'

import { BookstoreOrder } from '../entities/bookstore-order.entity'

@Injectable()
export class BookstoreOrderRepository implements IBookstoreOrderRepositoryInterface {
  constructor(
    @InjectRepository(BookstoreOrder)
    private readonly orderRepository: Repository<BookstoreOrder>,
  ) {}

  async findOrders({
    search,
    size,
    page,
    status,
    payment,
    startDate,
    endDate,
    minTotal,
    maxTotal,
    sortBy,
    sortOrder,
  }: ISearchBookstoreOrdersParams): Promise<{
    data: BookstoreOrderEntity[]
    pagination: IPaginationParams
  }> {
    const limit = size || 50
    const currentPage = page || 1

    const ALLOWED_SORT_FIELDS: Record<string, string> = {
      createdAt: 'order.createdAt',
      updatedAt: 'order.updatedAt',
      total: 'order.total',
      customerName: 'order.customerName',
    }
    const sortCol = ALLOWED_SORT_FIELDS[sortBy ?? ''] ?? 'order.createdAt'
    const sortDir: 'ASC' | 'DESC' = sortOrder === 'ASC' ? 'ASC' : 'DESC'

    const query = this.orderRepository
      .createQueryBuilder('order')
      .take(limit)
      .skip((currentPage - 1) * limit)
      .orderBy(sortCol, sortDir)

    if (search) {
      query.andWhere(
        '(order.orderCode ILIKE :search OR order.customerName ILIKE :search OR order.customerPhone ILIKE :search OR order.trackingCode ILIKE :search)',
        { search: `%${search}%` },
      )
    }

    if (status && status !== 'all') {
      query.andWhere('order.status = :status', { status })
    }

    if (payment && payment !== 'all') {
      query.andWhere('order.payment = :payment', { payment })
    }

    if (startDate) {
      query.andWhere('order.createdAt >= :startDate', { startDate: new Date(startDate) })
    }

    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      query.andWhere('order.createdAt <= :endDate', { endDate: end })
    }

    if (minTotal !== undefined) {
      query.andWhere('order.total >= :minTotal', { minTotal })
    }

    if (maxTotal !== undefined) {
      query.andWhere('order.total <= :maxTotal', { maxTotal })
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

  async createOrder(order: Partial<BookstoreOrderEntity>): Promise<BookstoreOrderEntity> {
    const newOrder = this.orderRepository.create(order)
    return await this.orderRepository.save(newOrder)
  }

  async updateOrder(
    params: { id: number },
    order: Partial<BookstoreOrderEntity>,
  ): Promise<boolean> {
    const result = await this.orderRepository.update({ id: params.id }, order)
    return result.affected !== 0
  }

  async findOrderById(id: number): Promise<BookstoreOrderEntity | null> {
    const order = await this.orderRepository.findOne({
      where: { id },
    })
    return order ?? null
  }

  async findOrderByCode(orderCode: string): Promise<BookstoreOrderEntity | null> {
    const order = await this.orderRepository.findOne({
      where: { orderCode },
    })
    return order ?? null
  }

  async findOrderByCodeVariants(variants: string[], digits?: string): Promise<BookstoreOrderEntity | null> {
    const whereConditions: any[] = variants.filter(Boolean).map((v) => ({ orderCode: v }))
    variants.filter(Boolean).forEach((v) => {
      whereConditions.push({ trackingCode: v })
    })
    if (digits) {
      whereConditions.push({ orderCode: ILike(`%${digits}%`) })
    }

    if (whereConditions.length === 0) return null

    const order = await this.orderRepository.findOne({
      where: whereConditions,
    })
    return order ?? null
  }

  async findUnpaidOrderByAmount(amount: number): Promise<BookstoreOrderEntity | null> {
    const order = await this.orderRepository.findOne({
      where: [
        { payment: PaymentStatusEnum.Unpaid, total: amount },
        { status: OrderStatusEnum.Pending, total: amount },
      ],
      order: { createdAt: 'DESC' },
    })
    return order ?? null
  }

  async count(): Promise<number> {
    return await this.orderRepository.count()
  }
}

