import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { EXCEPTIONS } from '@domain/exceptions/exceptions.interface'
import { APPOINTMENT_REPOSITORY } from '@domain/repositories/appointment.repository.interface'
import { INVOICE_REPOSITORY } from '@domain/repositories/invoice.repository.interface'
import { ORDER_REPOSITORY } from '@domain/repositories/order.repository.interface'

import { CreateInvoiceUseCase } from '@use-cases/invoices/create-invoice.use-case'
import { DeleteInvoiceUseCase } from '@use-cases/invoices/delete-invoice.use-case'
import { GetInvoiceDetailUseCase } from '@use-cases/invoices/get-invoice-detail.use-case'
import { GetInvoicesListUseCase } from '@use-cases/invoices/get-invoices-list.use-case'
import { UpdateInvoiceUseCase } from '@use-cases/invoices/update-invoice.use-case'

import { InvoicesController } from '@adapters/controllers/invoices/invoices.controller'

import { Appointment } from '@infrastructure/databases/postgressql/entities/appointment.entity'
import { Invoice } from '@infrastructure/databases/postgressql/entities/invoice.entity'
import { Order } from '@infrastructure/databases/postgressql/entities/order.entity'
import { AppointmentRepository } from '@infrastructure/databases/postgressql/repositories/appointment.repository'
import { InvoiceRepository } from '@infrastructure/databases/postgressql/repositories/invoice.repository'
import { OrderRepository } from '@infrastructure/databases/postgressql/repositories/order.repository'
import { ExceptionsService } from '@infrastructure/exceptions/exceptions.service'

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, Appointment, Order])],
  controllers: [InvoicesController],
  providers: [
    {
      provide: INVOICE_REPOSITORY,
      useClass: InvoiceRepository,
    },
    {
      provide: APPOINTMENT_REPOSITORY,
      useClass: AppointmentRepository,
    },
    {
      provide: ORDER_REPOSITORY,
      useClass: OrderRepository,
    },
    {
      provide: EXCEPTIONS,
      useClass: ExceptionsService,
    },
    CreateInvoiceUseCase,
    GetInvoiceDetailUseCase,
    GetInvoicesListUseCase,
    UpdateInvoiceUseCase,
    DeleteInvoiceUseCase,
  ],
  exports: [
    CreateInvoiceUseCase,
    GetInvoiceDetailUseCase,
    GetInvoicesListUseCase,
    UpdateInvoiceUseCase,
    DeleteInvoiceUseCase,
  ],
})
export class InvoiceModule {}
