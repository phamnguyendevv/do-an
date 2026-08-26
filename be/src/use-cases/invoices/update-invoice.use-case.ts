import { Inject, Injectable } from '@nestjs/common'

import { InvoiceEntity } from '@domain/entities/invoice.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IInvoiceRepositoryInterface,
  INVOICE_REPOSITORY,
} from '@domain/repositories/invoice.repository.interface'

@Injectable()
export class UpdateInvoiceUseCase {
  constructor(
    @Inject(INVOICE_REPOSITORY)
    private readonly invoiceRepository: IInvoiceRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(
    id: number,
    updateData: Partial<InvoiceEntity>,
  ): Promise<boolean> {
    const existingInvoice = await this.invoiceRepository.findInvoiceById(id)

    if (!existingInvoice) {
      throw this.exceptionsService.notFoundException({
        type: 'InvoiceNotFoundException',
        message: 'Invoice not found',
      })
    }

    this.validateUpdateData(updateData)

    const result = await this.invoiceRepository.updateInvoice(id, updateData)

    if (!result) {
      throw this.exceptionsService.badRequestException({
        type: 'InvoiceUpdateFailedException',
        message: 'Failed to update invoice',
      })
    }

    return result
  }

  private validateUpdateData(updateData: Partial<InvoiceEntity>): void {
    if (updateData.totalAmount !== undefined && updateData.totalAmount <= 0) {
      throw this.exceptionsService.badRequestException({
        type: 'InvalidTotalAmountException',
        message: 'Total amount must be greater than 0',
      })
    }

    if (updateData.subtotal !== undefined && updateData.subtotal <= 0) {
      throw this.exceptionsService.badRequestException({
        type: 'InvalidSubtotalException',
        message: 'Subtotal must be greater than 0',
      })
    }

    if (
      updateData.discountAmount !== undefined &&
      updateData.discountAmount < 0
    ) {
      throw this.exceptionsService.badRequestException({
        type: 'InvalidDiscountAmountException',
        message: 'Discount amount cannot be negative',
      })
    }

    if (updateData.taxAmount !== undefined && updateData.taxAmount < 0) {
      throw this.exceptionsService.badRequestException({
        type: 'InvalidTaxAmountException',
        message: 'Tax amount cannot be negative',
      })
    }
  }
}
