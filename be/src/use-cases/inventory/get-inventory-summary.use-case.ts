import { Inject, Injectable } from '@nestjs/common'

import { DataSource } from 'typeorm'

import {
  IStockMovementRepositoryInterface,
  STOCK_MOVEMENT_REPOSITORY,
} from '@domain/repositories/stock-movement.repository.interface'

import { Book } from '@infrastructure/databases/postgresql/entities/book.entity'

@Injectable()
export class GetInventorySummaryUseCase {
  constructor(
    @Inject(STOCK_MOVEMENT_REPOSITORY)
    private readonly stockMovementRepository: IStockMovementRepositoryInterface,
    private readonly dataSource: DataSource,
  ) {}

  async execute() {
    const bookRepo = this.dataSource.getRepository(Book)

    const raw = await bookRepo
      .createQueryBuilder('b')
      .select('COUNT(b.id)', 'totalTitles')
      .addSelect('SUM(b.stock)', 'totalStock')
      .addSelect('SUM(b.stock * b.purchasePrice)', 'inventoryValue')
      .addSelect(
        `COUNT(CASE WHEN b.status = 'LOW_STOCK' THEN 1 END)`,
        'lowStockCount',
      )
      .addSelect(
        `COUNT(CASE WHEN b.status = 'OUT_OF_STOCK' THEN 1 END)`,
        'outOfStockCount',
      )
      .getRawOne()

    const movements = await this.stockMovementRepository.getMovementStats({})

    return {
      totalTitles: Number(raw?.totalTitles || 0),
      totalStock: Number(raw?.totalStock || 0),
      inventoryValue: Number(raw?.inventoryValue || 0),
      lowStockCount: Number(raw?.lowStockCount || 0),
      outOfStockCount: Number(raw?.outOfStockCount || 0),
      stats: movements,
    }
  }
}
