import { StockAuditEntity } from '@domain/entities/stock-audit.entity'

export const STOCK_AUDIT_REPOSITORY = 'STOCK_AUDIT_REPOSITORY_INTERFACE'

export interface IStockAuditRepositoryInterface {
  createAudit(audit: Partial<StockAuditEntity>): Promise<StockAuditEntity>
  getAudits(params?: {
    page?: number
    size?: number
    status?: string
    search?: string
  }): Promise<{ data: StockAuditEntity[]; pagination: { total: number; page: number; size: number } }>
  getAuditById(id: number): Promise<StockAuditEntity | null>
  updateAudit(id: number, payload: Partial<StockAuditEntity>): Promise<StockAuditEntity>
}
