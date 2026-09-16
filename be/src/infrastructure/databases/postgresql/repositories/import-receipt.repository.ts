import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Repository } from 'typeorm'

import { ImportReceiptEntity } from '@domain/entities/import-receipt.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import {
  IImportReceiptRepositoryInterface,
  ISearchImportReceiptParams,
} from '@domain/repositories/import-receipt.repository.interface'

import { ImportReceipt } from '../entities/import-receipt.entity'

@Injectable()
export class ImportReceiptRepository
  implements IImportReceiptRepositoryInterface
{
  constructor(
    @InjectRepository(ImportReceipt)
    private readonly receiptRepository: Repository<ImportReceipt>,
  ) {}

  async findReceipts({
    search,
    size,
    page,
    supplierId,
    supplierName,
    startDate,
    endDate,
  }: ISearchImportReceiptParams): Promise<{
    data: ImportReceiptEntity[]
    pagination: IPaginationParams
  }> {
    const limit = size || 50
    const currentPage = page || 1

    const query = this.receiptRepository
      .createQueryBuilder('r')
      .take(limit)
      .skip((currentPage - 1) * limit)
      .orderBy('r.importDate', 'DESC')

    if (search) {
      query.andWhere(
        '(r.receiptCode ILIKE :search OR r.supplierName ILIKE :search OR r.note ILIKE :search)',
        { search: `%${search}%` },
      )
    }

    if (supplierId) {
      query.andWhere('r.supplierId = :supplierId', { supplierId })
    }

    if (supplierName) {
      query.andWhere('r.supplierName ILIKE :supplierName', {
        supplierName: `%${supplierName}%`,
      })
    }

    if (startDate) {
      query.andWhere('r.importDate >= :startDate', {
        startDate: new Date(startDate),
      })
    }

    if (endDate) {
      query.andWhere('r.importDate <= :endDate', { endDate: new Date(endDate) })
    }

    const [data, total] = await query.getManyAndCount()

    return {
      data,
      pagination: {
        total,
        page: currentPage,
        size: limit,
      },
    }
  }

  async findReceiptById(id: number): Promise<ImportReceiptEntity | null> {
    const receipt = await this.receiptRepository.findOne({
      where: { id },
    })
    return receipt ?? null
  }

  async findReceiptByCode(
    receiptCode: string,
  ): Promise<ImportReceiptEntity | null> {
    const receipt = await this.receiptRepository.findOne({
      where: { receiptCode },
    })
    return receipt ?? null
  }

  async createReceipt(
    receipt: Partial<ImportReceiptEntity>,
  ): Promise<ImportReceiptEntity> {
    const newReceipt = this.receiptRepository.create(receipt)
    return await this.receiptRepository.save(newReceipt)
  }

  async count(): Promise<number> {
    return await this.receiptRepository.count()
  }
}
