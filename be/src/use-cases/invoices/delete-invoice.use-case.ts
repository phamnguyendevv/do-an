import { Inject, Injectable } from '@nestjs/common'

import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IInvoiceRepositoryInterface,
  INVOICE_REPOSITORY,
} from '@domain/repositories/invoice.repository.interface'

@Injectable()
export class DeleteInvoiceUseCase {
  constructor(
    @Inject(INVOICE_REPOSITORY)
    private readonly invoiceRepository: IInvoiceRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(id: number): Promise<boolean> {
    const existingInvoice = await this.invoiceRepository.findInvoiceById(id)

    if (!existingInvoice) {
      throw this.exceptionsService.notFoundException({
        type: 'InvoiceNotFoundException',
        message: 'Invoice not found',
      })
    }

    const result = await this.invoiceRepository.deleteInvoice(id)

    if (!result) {
      throw this.exceptionsService.badRequestException({
        type: 'InvoiceDeleteFailedException',
        message: 'Failed to delete invoice',
      })
    }

    return result
  }
}
