import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Repository } from 'typeorm'

import { AppointmentStatusEnum } from '@domain/entities/appointment.entity'
import { OrderEntity, OrderStatusEnum } from '@domain/entities/order.entity'
import { PaymentStatusEnum } from '@domain/entities/payment.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import {
  IOrderRepositoryInterface,
  ISearchOrderParams,
} from '@domain/repositories/order.repository.interface'

import { Order } from '../entities/order.entity'

@Injectable()
export class OrderRepository implements IOrderRepositoryInterface {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  createOrder(order: Partial<OrderEntity>): Promise<OrderEntity> {
    return this.orderRepository.save(order)
  }

  async findOrderById(id: number): Promise<OrderEntity | null> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['appointment', 'payments', 'user'],
    })
    return order || null
  }

  findOrders(
    params: ISearchOrderParams & { userId: number },
  ): Promise<OrderEntity[]> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.appointment', 'appointment')
      .leftJoinAndSelect('appointment.service', 'service')
      .leftJoinAndSelect('appointment.provider', 'provider')
      .leftJoinAndSelect('order.payments', 'payment')
      .andWhere('appointment.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('service.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('order.status = :orderStatus', {
        orderStatus: OrderStatusEnum.Completed,
      })
      .andWhere('appointment.status = :appointmentStatus', {
        appointmentStatus: AppointmentStatusEnum.Completed,
      })
      .andWhere('payment.status = :paymentStatus', {
        paymentStatus: PaymentStatusEnum.Paid,
      })

    if (params.userId) {
      queryBuilder.andWhere('appointment.providerId = :providerId', {
        providerId: params.userId,
      })
    }
    if (params.paymentStatus) {
      queryBuilder.andWhere('payment.status = :paymentStatus', {
        paymentStatus: params.paymentStatus,
      })
    }
    if (params.startDate) {
      queryBuilder.andWhere('payment.paymentDate >= :startDate', {
        startDate: params.startDate,
      })
    }
    if (params.endDate) {
      queryBuilder.andWhere('payment.paymentDate <= :endDate', {
        endDate: params.endDate,
      })
    }
    if (params.serviceId) {
      queryBuilder.andWhere('service.id = :serviceId', {
        serviceId: Number(params.serviceId),
      })
    }
    if (params.serviceName) {
      queryBuilder.andWhere('service.name ILIKE :serviceName', {
        serviceName: `%${params.serviceName}%`,
      })
    }
    return queryBuilder.getMany()
  }
  async findOrdersByProviderId(
    params: ISearchOrderParams,
  ): Promise<{ data: OrderEntity[]; pagination: IPaginationParams }> {
    params.page = params.page || 1
    params.size = params.size || 100
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.appointment', 'appointment')
      .leftJoinAndSelect('appointment.service', 'service')
      .leftJoinAndSelect('appointment.provider', 'provider')
      .leftJoinAndSelect('order.payments', 'payment')
      .andWhere('appointment.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('service.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('order.status = :orderStatus', {
        orderStatus: OrderStatusEnum.Completed,
      })
      .andWhere('appointment.status = :appointmentStatus', {
        appointmentStatus: AppointmentStatusEnum.Completed,
      })
      .andWhere('payment.status = :paymentStatus', {
        paymentStatus: PaymentStatusEnum.Paid,
      })

    const pageIndex = Math.max(params.page - 1, 0)
    queryBuilder.skip(pageIndex * params.size)
    queryBuilder.take(params.size)
    const [data, total] = await queryBuilder.getManyAndCount()
    const pagination: IPaginationParams = {
      total,
      page: params.page,
      size: params.size,
    }
    return { data: data, pagination: pagination }
  }
  async updateOrder(id: number, order: Partial<OrderEntity>): Promise<boolean> {
    const result = await this.orderRepository.update(id, order)
    if (result.affected === 0) return false
    return true
  }
}
