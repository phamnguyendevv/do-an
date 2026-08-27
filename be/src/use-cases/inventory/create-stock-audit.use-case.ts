import { Inject, Injectable } from '@nestjs/common'
import {
  IStockAuditRepositoryInterface,
  STOCK_AUDIT_REPOSITORY,
} from '@domain/repositories/stock-audit.repository.interface'
import { StockAuditEntity, StockAuditItemEntity } from '@domain/entities/stock-audit.entity'

export interface CreateStockAuditDto {
  title?: string
  auditDate?: string
  note?: string
  auditedBy?: string
  items: Array<{
    bookId: number
    title: string
    systemStock: number
    actualStock: number
    reason?: string
  }>
}

@Injectable()
export class CreateStockAuditUseCase {
  constructor(
    @Inject(STOCK_AUDIT_REPOSITORY)
    private readonly auditRepository: IStockAuditRepositoryInterface,
  ) {}

  async execute(dto: CreateStockAuditDto): Promise<StockAuditEntity> {
    const auditCode = `AUD-${Date.now().toString().slice(-6)}`
    const auditDate = dto.auditDate || new Date().toISOString()
    const title = dto.title || `Kiểm kê kho ngày ${new Date().toLocaleDateString('vi-VN')}`

    const items: StockAuditItemEntity[] = (dto.items || []).map((it) => ({
      bookId: it.bookId,
      title: it.title,
      systemStock: Number(it.systemStock) || 0,
      actualStock: Number(it.actualStock) || 0,
      diffQuantity: (Number(it.actualStock) || 0) - (Number(it.systemStock) || 0),
      reason: it.reason,
    }))

    const totalSystemStock = items.reduce((s, it) => s + it.systemStock, 0)
    const totalActualStock = items.reduce((s, it) => s + it.actualStock, 0)
    const totalDiff = items.reduce((s, it) => s + it.diffQuantity, 0)

    return await this.auditRepository.createAudit({
      auditCode,
      title,
      auditDate,
      status: 'DRAFT',
      items,
      totalSystemStock,
      totalActualStock,
      totalDiff,
      note: dto.note,
      auditedBy: dto.auditedBy || 'Admin',
    })
  }
}
