import { Inject, Injectable } from '@nestjs/common'
import {
  IStockAuditRepositoryInterface,
  STOCK_AUDIT_REPOSITORY,
} from '@domain/repositories/stock-audit.repository.interface'
import { StockAuditEntity } from '@domain/entities/stock-audit.entity'

@Injectable()
export class GetStockAuditsUseCase {
  constructor(
    @Inject(STOCK_AUDIT_REPOSITORY)
    private readonly auditRepository: IStockAuditRepositoryInterface,
  ) {}

  async execute(params?: {
    page?: number
    size?: number
    status?: string
    search?: string
  }): Promise<{ data: StockAuditEntity[]; pagination: { total: number; page: number; size: number } }> {
    return await this.auditRepository.getAudits(params)
  }

  async getById(id: number): Promise<StockAuditEntity | null> {
    return await this.auditRepository.getAuditById(id)
  }
}
