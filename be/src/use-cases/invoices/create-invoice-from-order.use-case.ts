import { Inject, Injectable } from '@nestjs/common'

import {
  InvoiceEntity,
  InvoiceStatusEnum,
} from '@domain/entities/invoice.entity'
import { OrderEntity } from '@domain/entities/order.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IInvoiceRepositoryInterface,
  INVOICE_REPOSITORY,
} from '@domain/repositories/invoice.repository.interface'
import {
  IOrderRepositoryInterface,
  ORDER_REPOSITORY,
} from '@domain/repositories/order.repository.interface'
import {
  IPaymentRepositoryInterface,
  PAYMENT_REPOSITORY,
} from '@domain/repositories/payment.repository.interface'

@Injectable()
export class CreateInvoiceFromOrderUseCase {
  constructor(
    @Inject(INVOICE_REPOSITORY)
    private readonly invoiceRepository: IInvoiceRepositoryInterface,
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepositoryInterface,
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(orderId: number): Promise<InvoiceEntity> {
    // Get order with appointment details
    const order = await this.orderRepository.findOrderById(orderId)
    if (!order) {
      throw this.exceptionsService.notFoundException({
        type: 'OrderNotFoundException',
        message: 'Order not found',
      })
    }

    // Check if invoice already exists for this order
    const existingInvoices =
      await this.invoiceRepository.findInvoicesByOrder(orderId)
    if (existingInvoices.length > 0) {
      // Return existing invoice if found
      return existingInvoices[0]
    }

    // Get appointment details from order
    if (!order.appointment) {
      throw this.exceptionsService.badRequestException({
        type: 'AppointmentNotFoundException',
        message: 'Order must have associated appointment',
      })
    }

    const appointment = order.appointment
    const invoiceNumber = await this.invoiceRepository.generateInvoiceNumber()

    // Calculate amounts
    const subtotal = appointment.totalAmount || order.totalAmount
    const discountAmount = appointment.discountAmount || 0
    const taxAmount = this.calculateTaxAmount(subtotal - discountAmount)
    const totalAmount = subtotal - discountAmount + taxAmount

    // Create invoice data
    const invoiceData: Partial<InvoiceEntity> = {
      invoiceNumber,
      appointmentId: appointment.id,
      orderId: order.id,
      providerId: appointment.providerId,
      clientId: appointment.clientId,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      currency: order.currency || 'usd',
      status: InvoiceStatusEnum.Paid, // Since payment is already completed
      notes: 'Invoice automatically generated after payment completion',
      paymentTerms: 'Payment completed',
      isDeleted: false,
    }

    // Create the invoice
    const invoice = await this.invoiceRepository.createInvoice(invoiceData)
    return invoice
  }

  private calculateTaxAmount(amount: number): number {
    // You can customize tax calculation logic here
    // For now, let's assume 0% tax (many service businesses might be tax-exempt)
    // Or you could calculate based on location, service type, etc.
    const TAX_RATE = 0.0 // 0% tax
    return amount * TAX_RATE
  }
}
