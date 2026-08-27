import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Repository } from 'typeorm'

import { ExportReceiptEntity } from '@domain/entities/export-receipt.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import {
  IExportReceiptRepositoryInterface,
  ISearchExportReceiptParams,
} from '@domain/repositories/export-receipt.repository.interface'

import { ExportReceipt } from '../entities/export-receipt.entity'

@Injectable()
export class ExportReceiptRepository implements IExportReceiptRepositoryInterface {
  constructor(
    @InjectRepository(ExportReceipt)
    private readonly receiptRepository: Repository<ExportReceipt>,
  ) {}

  async findReceipts({
    search,
    size,
    page,
    reason,
    orderId,
    startDate,
    endDate,
  }: ISearchExportReceiptParams): Promise<{
    data: ExportReceiptEntity[]
    pagination: IPaginationParams
  }> {
    const limit = size || 50
    const currentPage = page || 1

    const query = this.receiptRepository
      .createQueryBuilder('r')
      .take(limit)
      .skip((currentPage - 1) * limit)
      .orderBy('r.exportDate', 'DESC')

    if (search) {
      query.andWhere(
        '(r.receiptCode ILIKE :search OR r.orderId ILIKE :search OR r.reason ILIKE :search OR r.note ILIKE :search)',
        { search: `%${search}%` },
      )
    }

    if (reason) {
      query.andWhere('r.reason ILIKE :reason', { reason: `%${reason}%` })
    }

    if (orderId) {
      query.andWhere('r.orderId ILIKE :orderId', { orderId: `%${orderId}%` })
    }

    if (startDate) {
      query.andWhere('r.exportDate >= :startDate', { startDate: new Date(startDate) })
    }

    if (endDate) {
      query.andWhere('r.exportDate <= :endDate', { endDate: new Date(endDate) })
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

  async findReceiptById(id: number): Promise<ExportReceiptEntity | null> {
    const receipt = await this.receiptRepository.findOne({
      where: { id },
    })
    return receipt ?? null
  }

  async findReceiptByCode(receiptCode: string): Promise<ExportReceiptEntity | null> {
    const receipt = await this.receiptRepository.findOne({
      where: { receiptCode },
    })
    return receipt ?? null
  }

  async createReceipt(receipt: Partial<ExportReceiptEntity>): Promise<ExportReceiptEntity> {
    const newReceipt = this.receiptRepository.create(receipt)
    return await this.receiptRepository.save(newReceipt)
  }

  async count(): Promise<number> {
    return await this.receiptRepository.count()
  }
}
