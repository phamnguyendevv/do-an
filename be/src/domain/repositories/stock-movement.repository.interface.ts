import { IPaginationParams } from '@domain/entities/search.entity'
import {
  StockMovementEntity,
  StockMovementType,
} from '@domain/entities/stock-movement.entity'

export interface ISearchStockMovementParams {
  size?: number
  page?: number
  bookId?: number
  type?: StockMovementType
  search?: string
  startDate?: Date
  endDate?: Date
}

export const STOCK_MOVEMENT_REPOSITORY = 'STOCK_MOVEMENT_REPOSITORY_INTERFACE'

export interface IStockMovementRepositoryInterface {
  findMovements(params: ISearchStockMovementParams): Promise<{
    data: StockMovementEntity[]
    pagination: IPaginationParams
  }>
  createMovement(
    movement: Partial<StockMovementEntity>,
  ): Promise<StockMovementEntity>
  getMovementStats(params: { startDate?: Date; endDate?: Date }): Promise<{
    totalImportQty: number
    totalExportQty: number
    totalSaleQty: number
    totalRestockQty: number
  }>
}
