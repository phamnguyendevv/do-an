import { ApiProperty } from '@nestjs/swagger'

import {
  InvoiceEntity,
  InvoiceStatusEnum,
} from '@domain/entities/invoice.entity'

export class InvoicePresenter {
  @ApiProperty({ example: 1 })
  id: number

  @ApiProperty({ example: 'INV-202401-0001' })
  invoiceNumber: string

  @ApiProperty({ example: 1 })
  appointmentId: number

  @ApiProperty({ example: 1 })
  orderId: number

  @ApiProperty({ example: 1 })
  providerId: number

  @ApiProperty({ example: 1 })
  clientId: number

  @ApiProperty({ example: '2024-01-15T00:00:00.000Z' })
  issueDate: Date

  @ApiProperty({ example: '2024-02-15T00:00:00.000Z' })
  dueDate: Date

  @ApiProperty({ example: 100.0 })
  subtotal: number

  @ApiProperty({ example: 10.0 })
  discountAmount: number

  @ApiProperty({ example: 8.0 })
  taxAmount: number

  @ApiProperty({ example: 98.0 })
  totalAmount: number

  @ApiProperty({ example: 'usd' })
  currency: string

  @ApiProperty({ enum: InvoiceStatusEnum, example: InvoiceStatusEnum.Paid })
  status: InvoiceStatusEnum

  @ApiProperty({ example: 'Thank you for your business', required: false })
  notes?: string

  @ApiProperty({ example: 'Net 30', required: false })
  paymentTerms?: string

  @ApiProperty({ example: '2024-01-15T00:00:00.000Z' })
  createdAt: Date

  @ApiProperty({ example: '2024-01-15T00:00:00.000Z' })
  updatedAt: Date

  // Relations
  @ApiProperty({ required: false })
  appointment?: any

  @ApiProperty({ required: false })
  order?: any

  @ApiProperty({ required: false })
  provider?: any

  @ApiProperty({ required: false })
  client?: any

  @ApiProperty({ required: false })
  service?: any

  @ApiProperty({ required: false })
  category?: any

  @ApiProperty({ required: false })
  promotion?: any

  @ApiProperty({ required: false })
  payments?: any[]

  constructor(invoice: InvoiceEntity) {
    this.id = invoice.id
    this.invoiceNumber = invoice.invoiceNumber
    this.appointmentId = invoice.appointmentId
    this.orderId = invoice.orderId
    this.providerId = invoice.providerId
    this.clientId = invoice.clientId
    this.issueDate = invoice.issueDate
    this.dueDate = invoice.dueDate
    this.subtotal = invoice.subtotal
    this.discountAmount = invoice.discountAmount
    this.taxAmount = invoice.taxAmount
    this.totalAmount = invoice.totalAmount
    this.currency = invoice.currency
    this.status = invoice.status
    this.notes = invoice.notes
    this.paymentTerms = invoice.paymentTerms
    this.createdAt = invoice.createdAt
    this.updatedAt = invoice.updatedAt

    // Relations
    if (invoice.appointment) {
      this.appointment = {
        id: invoice.appointment.id,
        startTime: invoice.appointment.startTime,
        endTime: invoice.appointment.endTime,
        duration: invoice.appointment.duration,
        status: invoice.appointment.status,
        notes: invoice.appointment.notes,
        service: invoice.appointment.service
          ? {
              id: invoice.appointment.service.id,
              name: invoice.appointment.service.name,
              description: invoice.appointment.service.description,
              price: invoice.appointment.service.price,
              duration: invoice.appointment.service.duration,
              category: invoice.appointment.service.category,
            }
          : undefined,
        provider: invoice.appointment.provider
          ? {
              id: invoice.appointment.provider.id,
              email: invoice.appointment.provider.email,
              username: invoice.appointment.provider.username,
              phone: invoice.appointment.provider.phone,
              providerProfile: invoice.appointment.provider.providerProfile,
            }
          : undefined,
      }
    }

    if (invoice.order) {
      this.order = {
        id: invoice.order.id,
        totalAmount: invoice.order.totalAmount,
        currency: invoice.order.currency,
        status: invoice.order.status,
        note: invoice.order.note,
      }
    }

    if (invoice.provider) {
      this.provider = {
        id: invoice.provider.id,
        email: invoice.provider.email,
        username: invoice.provider.username,
        phone: invoice.provider.phone,
        providerProfile: invoice.provider.providerProfile,
      }
    }

    if (invoice.client) {
      this.client = {
        id: invoice.client.id,
        email: invoice.client.email,
        username: invoice.client.username,
        phone: invoice.client.phone,
      }
    }

    if (invoice.service) {
      this.service = {
        id: invoice.service.id,
        name: invoice.service.name,
        description: invoice.service.description,
        price: invoice.service.price,
        duration: invoice.service.duration,
        category: invoice.service.category,
      }
    }

    if (invoice.category) {
      this.category = {
        id: invoice.category.id,
        name: invoice.category.name,
        description: invoice.category.description,
      }
    }

    if (invoice.promotion) {
      this.promotion = {
        id: invoice.promotion.id,
        code: invoice.promotion.code,
        name: invoice.promotion.name,
        description: invoice.promotion.description,
        discountValue: invoice.promotion.discountValue,
        maxDiscount: invoice.promotion.maxDiscount,
      }
    }

    if (invoice.payments) {
      this.payments = invoice.payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        paymentDate: payment.paymentDate,
        refundAmount: payment.refundAmount,
        refundDate: payment.refundDate,
      }))
    }
  }
}
