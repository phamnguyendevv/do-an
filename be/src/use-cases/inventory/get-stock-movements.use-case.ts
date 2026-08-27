import { Inject, Injectable } from '@nestjs/common'

import { StockMovementEntity } from '@domain/entities/stock-movement.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import {
  IStockMovementRepositoryInterface,
  ISearchStockMovementParams,
  STOCK_MOVEMENT_REPOSITORY,
} from '@domain/repositories/stock-movement.repository.interface'

@Injectable()
export class GetStockMovementsUseCase {
  constructor(
    @Inject(STOCK_MOVEMENT_REPOSITORY)
    private readonly stockMovementRepository: IStockMovementRepositoryInterface,
  ) {}

  async execute(params: ISearchStockMovementParams): Promise<{
    data: StockMovementEntity[]
    pagination: IPaginationParams
  }> {
    return await this.stockMovementRepository.findMovements(params)
  }
}
