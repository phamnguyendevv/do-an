import { Inject, Injectable } from '@nestjs/common'

import { ImportReceiptEntity } from '@domain/entities/import-receipt.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import {
  IImportReceiptRepositoryInterface,
  IMPORT_RECEIPT_REPOSITORY,
  ISearchImportReceiptParams,
} from '@domain/repositories/import-receipt.repository.interface'

@Injectable()
export class GetImportReceiptsUseCase {
  constructor(
    @Inject(IMPORT_RECEIPT_REPOSITORY)
    private readonly importReceiptRepository: IImportReceiptRepositoryInterface,
  ) {}

  async execute(params: ISearchImportReceiptParams): Promise<{
    data: ImportReceiptEntity[]
    pagination: IPaginationParams
  }> {
    return await this.importReceiptRepository.findReceipts(params)
  }

  async getDetail(id: number): Promise<ImportReceiptEntity | null> {
    return await this.importReceiptRepository.findReceiptById(id)
  }
}
