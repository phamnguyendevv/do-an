import { Inject, Injectable } from '@nestjs/common'

import { ExportReceiptEntity } from '@domain/entities/export-receipt.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import {
  EXPORT_RECEIPT_REPOSITORY,
  IExportReceiptRepositoryInterface,
  ISearchExportReceiptParams,
} from '@domain/repositories/export-receipt.repository.interface'

@Injectable()
export class GetExportReceiptsUseCase {
  constructor(
    @Inject(EXPORT_RECEIPT_REPOSITORY)
    private readonly exportReceiptRepository: IExportReceiptRepositoryInterface,
  ) {}

  async execute(params: ISearchExportReceiptParams): Promise<{
    data: ExportReceiptEntity[]
    pagination: IPaginationParams
  }> {
    return await this.exportReceiptRepository.findReceipts(params)
  }

  async getDetail(id: number): Promise<ExportReceiptEntity | null> {
    return await this.exportReceiptRepository.findReceiptById(id)
  }
}
