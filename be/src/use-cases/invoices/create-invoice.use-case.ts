import { Inject, Injectable } from '@nestjs/common'

import {
  InvoiceEntity,
  InvoiceStatusEnum,
} from '@domain/entities/invoice.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  APPOINTMENT_REPOSITORY,
  IAppointmentRepositoryInterface,
} from '@domain/repositories/appointment.repository.interface'
import {
  IInvoiceRepositoryInterface,
  INVOICE_REPOSITORY,
} from '@domain/repositories/invoice.repository.interface'
import {
  IOrderRepositoryInterface,
  ORDER_REPOSITORY,
} from '@domain/repositories/order.repository.interface'

@Injectable()
export class CreateInvoiceUseCase {
  constructor(
    @Inject(INVOICE_REPOSITORY)
    private readonly invoiceRepository: IInvoiceRepositoryInterface,
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepositoryInterface,
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(invoiceData: Partial<InvoiceEntity>): Promise<InvoiceEntity> {
    this.validateInvoiceData(invoiceData)

    const appointment = await this.appointmentRepository.getAppointmentById(
      invoiceData.appointmentId!,
    )
    if (!appointment) {
      throw this.exceptionsService.notFoundException({
        type: 'AppointmentNotFoundException',
        message: 'Appointment not found',
      })
    }

    const order = await this.orderRepository.findOrderById(invoiceData.orderId!)
    if (!order) {
      throw this.exceptionsService.notFoundException({
        type: 'OrderNotFoundException',
        message: 'Order not found',
      })
    }

    const invoiceNumber = await this.invoiceRepository.generateInvoiceNumber()

    const invoiceToCreate = {
      ...invoiceData,
      invoiceNumber,
      status: invoiceData.status || InvoiceStatusEnum.Draft,
      currency: invoiceData.currency || 'usd',
      issueDate: invoiceData.issueDate || new Date(),
      dueDate:
        invoiceData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      isDeleted: false,
    } as InvoiceEntity

    const invoice = await this.invoiceRepository.createInvoice(invoiceToCreate)
    return invoice
  }

  private validateInvoiceData(invoiceData: Partial<InvoiceEntity>): void {
    if (!invoiceData.appointmentId) {
      throw this.exceptionsService.badRequestException({
        type: 'MissingAppointmentIdException',
        message: 'Appointment ID is required',
      })
    }

    if (!invoiceData.orderId) {
      throw this.exceptionsService.badRequestException({
        type: 'MissingOrderIdException',
        message: 'Order ID is required',
      })
    }

    if (!invoiceData.providerId) {
      throw this.exceptionsService.badRequestException({
        type: 'MissingProviderIdException',
        message: 'Provider ID is required',
      })
    }

    if (!invoiceData.clientId) {
      throw this.exceptionsService.badRequestException({
        type: 'MissingClientIdException',
        message: 'Client ID is required',
      })
    }

    if (!invoiceData.totalAmount || invoiceData.totalAmount <= 0) {
      throw this.exceptionsService.badRequestException({
        type: 'InvalidTotalAmountException',
        message: 'Total amount must be greater than 0',
      })
    }

    if (!invoiceData.subtotal || invoiceData.subtotal <= 0) {
      throw this.exceptionsService.badRequestException({
        type: 'InvalidSubtotalException',
        message: 'Subtotal must be greater than 0',
      })
    }
  }
}
