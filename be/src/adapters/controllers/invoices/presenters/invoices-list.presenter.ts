import { ApiProperty } from '@nestjs/swagger'

import { InvoiceEntity } from '@domain/entities/invoice.entity'
import { IPaginationParams } from '@domain/entities/search.entity'

import { InvoicePresenter } from './invoice.presenter'

export class InvoicesListPresenter {
  @ApiProperty({ type: [InvoicePresenter] })
  data: InvoicePresenter[]

  @ApiProperty()
  pagination: IPaginationParams

  constructor(invoices: InvoiceEntity[], pagination: IPaginationParams) {
    this.data = invoices.map((invoice) => new InvoicePresenter(invoice))
    this.pagination = pagination
  }
}
