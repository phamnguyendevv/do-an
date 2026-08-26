import { Inject, Injectable } from '@nestjs/common'

import { InvoiceEntity } from '@domain/entities/invoice.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IInvoiceRepositoryInterface,
  INVOICE_REPOSITORY,
} from '@domain/repositories/invoice.repository.interface'

@Injectable()
export class GetInvoiceDetailUseCase {
  constructor(
    @Inject(INVOICE_REPOSITORY)
    private readonly invoiceRepository: IInvoiceRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(id: number): Promise<InvoiceEntity> {
    const invoice = await this.invoiceRepository.findInvoiceById(id)

    if (!invoice) {
      throw this.exceptionsService.notFoundException({
        type: 'InvoiceNotFoundException',
        message: 'Invoice not found',
      })
    }

    return invoice
  }
}
