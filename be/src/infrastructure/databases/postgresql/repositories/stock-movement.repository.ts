import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Repository } from 'typeorm'

import { StockMovementEntity } from '@domain/entities/stock-movement.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import {
  IStockMovementRepositoryInterface,
  ISearchStockMovementParams,
} from '@domain/repositories/stock-movement.repository.interface'

import { StockMovement } from '../entities/stock-movement.entity'

@Injectable()
export class StockMovementRepository implements IStockMovementRepositoryInterface {
  constructor(
    @InjectRepository(StockMovement)
    private readonly movementRepository: Repository<StockMovement>,
  ) {}

  async findMovements({
    search,
    size,
    page,
    bookId,
    type,
    startDate,
    endDate,
  }: ISearchStockMovementParams): Promise<{
    data: StockMovementEntity[]
    pagination: IPaginationParams
  }> {
    const limit = size || 50
    const currentPage = page || 1

    const query = this.movementRepository
      .createQueryBuilder('sm')
      .take(limit)
      .skip((currentPage - 1) * limit)
      .orderBy('sm.createdAt', 'DESC')

    if (search) {
      query.andWhere(
        '(sm.bookTitle ILIKE :search OR sm.referenceCode ILIKE :search OR sm.note ILIKE :search)',
        { search: `%${search}%` },
      )
    }

    if (bookId) {
      query.andWhere('sm.bookId = :bookId', { bookId })
    }

    if (type) {
      query.andWhere('sm.type = :type', { type })
    }

    if (startDate) {
      query.andWhere('sm.createdAt >= :startDate', { startDate: new Date(startDate) })
    }

    if (endDate) {
      query.andWhere('sm.createdAt <= :endDate', { endDate: new Date(endDate) })
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

  async createMovement(movement: Partial<StockMovementEntity>): Promise<StockMovementEntity> {
    const newMovement = this.movementRepository.create(movement)
    return await this.movementRepository.save(newMovement)
  }

  async getMovementStats(params: { startDate?: Date; endDate?: Date }): Promise<{
    totalImportQty: number
    totalExportQty: number
    totalSaleQty: number
    totalRestockQty: number
  }> {
    const query = this.movementRepository.createQueryBuilder('sm')

    if (params.startDate) {
      query.andWhere('sm.createdAt >= :startDate', { startDate: params.startDate })
    }

    if (params.endDate) {
      query.andWhere('sm.createdAt <= :endDate', { endDate: params.endDate })
    }

    const rows = await query
      .select('sm.type', 'type')
      .addSelect('SUM(ABS(sm.quantity))', 'totalQty')
      .groupBy('sm.type')
      .getRawMany()

    let totalImportQty = 0
    let totalExportQty = 0
    let totalSaleQty = 0
    let totalRestockQty = 0

    for (const r of rows) {
      const q = Number(r.totalQty || 0)
      if (r.type === 'IMPORT') totalImportQty = q
      else if (r.type === 'EXPORT') totalExportQty = q
      else if (r.type === 'SALE') totalSaleQty = q
      else if (r.type === 'RESTOCK') totalRestockQty = q
    }

    return {
      totalImportQty,
      totalExportQty,
      totalSaleQty,
      totalRestockQty,
    }
  }
}
