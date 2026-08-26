import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Repository } from 'typeorm'

import { InvoiceEntity } from '@domain/entities/invoice.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import {
  IInvoiceRepositoryInterface,
  ISearchInvoiceParams,
} from '@domain/repositories/invoice.repository.interface'

import { Invoice } from '../entities/invoice.entity'

@Injectable()
export class InvoiceRepository implements IInvoiceRepositoryInterface {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  async createInvoice(invoice: Partial<InvoiceEntity>): Promise<InvoiceEntity> {
    const newInvoice = this.invoiceRepository.create(invoice)
    return this.invoiceRepository.save(newInvoice)
  }

  async findInvoiceById(id: number): Promise<InvoiceEntity | null> {
    const invoice = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.appointment', 'appointment')
      .leftJoinAndSelect('appointment.service', 'service')
      .leftJoinAndSelect('service.category', 'category')
      .leftJoinAndSelect('appointment.provider', 'provider')
      .leftJoinAndSelect('provider.providerProfile', 'providerProfile')
      .leftJoinAndSelect('invoice.client', 'client')
      .leftJoinAndSelect('invoice.order', 'order')
      .leftJoinAndSelect('invoice.payments', 'payments')
      .leftJoinAndSelect('appointment.promotion', 'promotion')
      .where('invoice.id = :id', { id })
      .andWhere('invoice.isDeleted = :isDeleted', { isDeleted: false })
      .getOne()

    return invoice || null
  }

  async findInvoiceByNumber(
    invoiceNumber: string,
  ): Promise<InvoiceEntity | null> {
    const invoice = await this.invoiceRepository.findOne({
      where: { invoiceNumber, isDeleted: false },
      relations: [
        'appointment',
        'appointment.service',
        'appointment.service.category',
        'appointment.provider',
        'appointment.provider.providerProfile',
        'client',
        'order',
        'payments',
      ],
    })

    return invoice || null
  }

  async findInvoicesByAppointment(
    appointmentId: number,
  ): Promise<InvoiceEntity[]> {
    return this.invoiceRepository.find({
      where: { appointmentId, isDeleted: false },
      relations: [
        'appointment',
        'appointment.service',
        'appointment.service.category',
        'appointment.provider',
        'client',
        'order',
        'payments',
      ],
    })
  }

  async findInvoicesByOrder(orderId: number): Promise<InvoiceEntity[]> {
    return this.invoiceRepository.find({
      where: { orderId, isDeleted: false },
      relations: [
        'appointment',
        'appointment.service',
        'appointment.service.category',
        'appointment.provider',
        'client',
        'order',
        'payments',
      ],
    })
  }

  async getInvoices(
    params: ISearchInvoiceParams,
  ): Promise<{ data: InvoiceEntity[]; pagination: IPaginationParams }> {
    const page = params.page || 1
    const size = params.size || 10
    const skip = (page - 1) * size

    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.appointment', 'appointment')
      .leftJoinAndSelect('appointment.service', 'service')
      .leftJoinAndSelect('service.category', 'category')
      .leftJoinAndSelect('appointment.provider', 'provider')
      .leftJoinAndSelect('provider.providerProfile', 'providerProfile')
      .leftJoinAndSelect('invoice.client', 'client')
      .leftJoinAndSelect('invoice.order', 'order')
      .leftJoinAndSelect('invoice.payments', 'payments')
      .where('invoice.isDeleted = :isDeleted', { isDeleted: false })

    if (params.id) {
      queryBuilder.andWhere('invoice.id = :id', { id: params.id })
    }

    if (params.search) {
      queryBuilder.andWhere(
        '(invoice.invoiceNumber ILIKE :search OR invoice.notes ILIKE :search OR client.email ILIKE :search OR provider.email ILIKE :search)',
        { search: `%${params.search}%` },
      )
    }

    if (params.invoiceNumber) {
      queryBuilder.andWhere('invoice.invoiceNumber ILIKE :invoiceNumber', {
        invoiceNumber: `%${params.invoiceNumber}%`,
      })
    }

    if (params.appointmentId) {
      queryBuilder.andWhere('invoice.appointmentId = :appointmentId', {
        appointmentId: params.appointmentId,
      })
    }

    if (params.orderId) {
      queryBuilder.andWhere('invoice.orderId = :orderId', {
        orderId: params.orderId,
      })
    }

    if (params.providerId) {
      queryBuilder.andWhere('invoice.providerId = :providerId', {
        providerId: params.providerId,
      })
    }

    if (params.clientId) {
      queryBuilder.andWhere('invoice.clientId = :clientId', {
        clientId: params.clientId,
      })
    }

    if (params.status) {
      queryBuilder.andWhere('invoice.status = :status', {
        status: params.status,
      })
    }

    if (params.currency) {
      queryBuilder.andWhere('invoice.currency = :currency', {
        currency: params.currency,
      })
    }

    if (params.minAmount) {
      queryBuilder.andWhere('invoice.totalAmount >= :minAmount', {
        minAmount: params.minAmount,
      })
    }

    if (params.maxAmount) {
      queryBuilder.andWhere('invoice.totalAmount <= :maxAmount', {
        maxAmount: params.maxAmount,
      })
    }

    if (params.startDate) {
      queryBuilder.andWhere('invoice.issueDate >= :startDate', {
        startDate: params.startDate,
      })
    }

    if (params.endDate) {
      queryBuilder.andWhere('invoice.issueDate <= :endDate', {
        endDate: params.endDate,
      })
    }

    if (params.issueDate) {
      queryBuilder.andWhere('DATE(invoice.issueDate) = DATE(:issueDate)', {
        issueDate: params.issueDate,
      })
    }

    if (params.dueDate) {
      queryBuilder.andWhere('DATE(invoice.dueDate) = DATE(:dueDate)', {
        dueDate: params.dueDate,
      })
    }

    const totalCount = await queryBuilder.getCount()

    const invoices = await queryBuilder
      .orderBy('invoice.createdAt', 'DESC')
      .skip(skip)
      .take(size)
      .getMany()

    return {
      data: invoices,
      pagination: {
        page,
        size,
        total: totalCount,
      },
    }
  }

  async updateInvoice(
    id: number,
    invoice: Partial<InvoiceEntity>,
  ): Promise<boolean> {
    const result = await this.invoiceRepository.update({ id }, invoice)
    return result.affected! > 0
  }

  async deleteInvoice(id: number): Promise<boolean> {
    const result = await this.invoiceRepository.update(
      { id },
      { isDeleted: true },
    )
    return result.affected! > 0
  }

  async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')

    // Get the count of invoices for current month
    const count = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where(
        'EXTRACT(YEAR FROM invoice.createdAt) = :year AND EXTRACT(MONTH FROM invoice.createdAt) = :month',
        { year, month: new Date().getMonth() + 1 },
      )
      .getCount()

    const sequence = String(count + 1).padStart(4, '0')
    return `INV-${year}${month}-${sequence}`
  }
}
