import {
  InvoiceEntity,
  InvoiceStatusEnum,
} from '@domain/entities/invoice.entity'
import { IPaginationParams } from '@domain/entities/search.entity'

export interface ISearchInvoiceParams {
  id?: number
  search?: string
  page?: number
  size?: number
  invoiceNumber?: string
  appointmentId?: number
  orderId?: number
  providerId?: number
  clientId?: number
  status?: InvoiceStatusEnum
  issueDate?: Date
  dueDate?: Date
  minAmount?: number
  maxAmount?: number
  currency?: string
  startDate?: Date
  endDate?: Date
}

export const INVOICE_REPOSITORY = 'INVOICE_REPOSITORY_INTERFACE'

export interface IInvoiceRepositoryInterface {
  createInvoice(invoice: Partial<InvoiceEntity>): Promise<InvoiceEntity>
  findInvoiceById(id: number): Promise<InvoiceEntity | null>
  findInvoiceByNumber(invoiceNumber: string): Promise<InvoiceEntity | null>
  findInvoicesByAppointment(appointmentId: number): Promise<InvoiceEntity[]>
  findInvoicesByOrder(orderId: number): Promise<InvoiceEntity[]>
  getInvoices(
    params: ISearchInvoiceParams,
  ): Promise<{ data: InvoiceEntity[]; pagination: IPaginationParams }>
  updateInvoice(id: number, invoice: Partial<InvoiceEntity>): Promise<boolean>
  deleteInvoice(id: number): Promise<boolean>
  generateInvoiceNumber(): Promise<string>
}
