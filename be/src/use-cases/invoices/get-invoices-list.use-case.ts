import { Inject, Injectable } from '@nestjs/common'

import { InvoiceEntity } from '@domain/entities/invoice.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import {
  IInvoiceRepositoryInterface,
  INVOICE_REPOSITORY,
  ISearchInvoiceParams,
} from '@domain/repositories/invoice.repository.interface'

@Injectable()
export class GetInvoicesListUseCase {
  constructor(
    @Inject(INVOICE_REPOSITORY)
    private readonly invoiceRepository: IInvoiceRepositoryInterface,
  ) {}

  async execute(
    params: ISearchInvoiceParams,
  ): Promise<{ data: InvoiceEntity[]; pagination: IPaginationParams }> {
    return this.invoiceRepository.getInvoices(params)
  }
}
