import { Inject, Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'

import { BookStatusEnum } from '@domain/entities/order-enums.entity'
import {
  StockAuditEntity,
  StockAuditStatusEnum,
} from '@domain/entities/stock-audit.entity'
import { StockMovementTypeEnum } from '@domain/entities/stock-movement.entity'
import {
  IRedisCacheService,
  REDIS_SERVICE,
} from '@domain/services/redis.interface'
import { Book } from '@infrastructure/databases/postgresql/entities/book.entity'
import { StockAudit } from '@infrastructure/databases/postgresql/entities/stock-audit.entity'
import { StockMovement } from '@infrastructure/databases/postgresql/entities/stock-movement.entity'

@Injectable()
export class BalanceStockAuditUseCase {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(REDIS_SERVICE)
    private readonly redisService: IRedisCacheService,
  ) {}

  async execute(auditId: number, balancedBy = 'Admin'): Promise<StockAuditEntity> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const audit = await queryRunner.manager.findOne(StockAudit, {
        where: { id: auditId },
        lock: { mode: 'pessimistic_write' },
      })

      if (!audit) {
        throw new Error(`Không tìm thấy phiếu kiểm kê có ID = ${auditId}`)
      }

      if (audit.status === StockAuditStatusEnum.Balanced) {
        throw new Error('Phiếu kiểm kê này đã được cân bằng kho trước đó!')
      }

      for (const item of audit.items || []) {
        const bookId = Number(item.bookId)
        if (!bookId) continue

        const book = await queryRunner.manager.findOne(Book, {
          where: { id: bookId },
          lock: { mode: 'pessimistic_write' },
        })

        if (!book) continue

        const beforeStock = Number(book.stock)
        const afterStock = Math.max(0, Number(item.actualStock))
        const diff = afterStock - beforeStock

        const newStatus =
          afterStock === 0
            ? BookStatusEnum.OutOfStock
            : afterStock <= (book.minStock || 10)
              ? BookStatusEnum.LowStock
              : BookStatusEnum.InStock

        book.stock = afterStock
        book.status = newStatus
        await queryRunner.manager.save(Book, book)

        // Log StockMovement
        if (diff !== 0) {
          const movement = queryRunner.manager.create(StockMovement, {
            bookId: book.id,
            bookTitle: book.title,
            type: StockMovementTypeEnum.Adjust,
            quantity: Math.abs(diff),
            beforeStock,
            afterStock,
            referenceCode: audit.auditCode,
            note: `Cân bằng kiểm kê [${audit.auditCode}]: ${diff > 0 ? '+' : ''}${diff} cuốn. ${item.reason ? `(Lý do: ${item.reason})` : ''}`,
            createdBy: balancedBy,
          })
          await queryRunner.manager.save(StockMovement, movement)
        }
      }

      audit.status = StockAuditStatusEnum.Balanced
      audit.balancedAt = new Date()
      audit.auditedBy = balancedBy || audit.auditedBy
      const savedAudit = await queryRunner.manager.save(StockAudit, audit)

      await queryRunner.commitTransaction()

      await this.redisService.delPattern('books:*')

      return savedAudit
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }
}
