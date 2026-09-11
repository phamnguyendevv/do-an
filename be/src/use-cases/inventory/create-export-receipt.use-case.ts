import { Inject, Injectable } from '@nestjs/common'

import { DataSource } from 'typeorm'

import {
  ExportReceiptEntity,
  ExportReceiptItem,
} from '@domain/entities/export-receipt.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  BOOK_REPOSITORY,
  IBookRepositoryInterface,
} from '@domain/repositories/book.repository.interface'
import {
  EXPORT_RECEIPT_REPOSITORY,
  IExportReceiptRepositoryInterface,
} from '@domain/repositories/export-receipt.repository.interface'
import {
  IStockMovementRepositoryInterface,
  STOCK_MOVEMENT_REPOSITORY,
} from '@domain/repositories/stock-movement.repository.interface'
import {
  IRedisCacheService,
  REDIS_SERVICE,
} from '@domain/services/redis.interface'

import { ActivityLog } from '@infrastructure/databases/postgresql/entities/activity-log.entity'
import { Book } from '@infrastructure/databases/postgresql/entities/book.entity'
import { ExportReceipt } from '@infrastructure/databases/postgresql/entities/export-receipt.entity'
import { StockMovement } from '@infrastructure/databases/postgresql/entities/stock-movement.entity'

@Injectable()
export class CreateExportReceiptUseCase {
  constructor(
    @Inject(EXPORT_RECEIPT_REPOSITORY)
    private readonly exportReceiptRepository: IExportReceiptRepositoryInterface,
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepository: IBookRepositoryInterface,
    @Inject(STOCK_MOVEMENT_REPOSITORY)
    private readonly stockMovementRepository: IStockMovementRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
    @Inject(REDIS_SERVICE)
    private readonly redisService: IRedisCacheService,
    private readonly dataSource: DataSource,
  ) {}

  async execute(dto: {
    orderId?: string
    reason: string
    note?: string
    lines: Array<{ bookId: number | string; quantity: number; price?: number }>
    createdBy?: string
  }): Promise<ExportReceiptEntity> {
    if (!dto.reason || dto.reason.trim().length === 0) {
      throw this.exceptionsService.badRequestException({
        type: 'InventoryValidationException',
        message: 'Vui lòng nhập lý do xuất kho',
      })
    }

    if (!dto.lines || dto.lines.length === 0) {
      throw this.exceptionsService.badRequestException({
        type: 'InventoryValidationException',
        message: 'Phiếu xuất phải có ít nhất 1 sản phẩm',
      })
    }

    for (const line of dto.lines) {
      if (!line.quantity || line.quantity <= 0) {
        throw this.exceptionsService.badRequestException({
          type: 'InventoryValidationException',
          message: 'Số lượng xuất phải lớn hơn 0',
        })
      }
    }

    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const items: ExportReceiptItem[] = []
      let totalItems = 0

      // Count existing receipts for code generation
      const count = await queryRunner.manager.count(ExportReceipt)
      const receiptCode = `EXP-${2000 + count + 1}`

      for (const line of dto.lines) {
        const bookIdNum =
          typeof line.bookId === 'number'
            ? line.bookId
            : parseInt(String(line.bookId), 10)
        if (isNaN(bookIdNum)) {
          throw this.exceptionsService.badRequestException({
            type: 'InventoryValidationException',
            message: `Mã sách không hợp lệ: ${line.bookId}`,
          })
        }

        const book = await queryRunner.manager.findOne(Book, {
          where: { id: bookIdNum },
          lock: { mode: 'pessimistic_write' },
        })

        if (!book) {
          throw this.exceptionsService.notFoundException({
            type: 'BookNotFoundException',
            message: `Không tìm thấy sách với ID: ${bookIdNum}`,
          })
        }

        const qty = line.quantity
        const beforeStock = Number(book.stock)

        if (beforeStock < qty) {
          throw this.exceptionsService.badRequestException({
            type: 'StockShortageException',
            message: `Không đủ tồn kho: Sách "${book.title}" chỉ còn ${beforeStock} cuốn (yêu cầu xuất ${qty})`,
          })
        }

        const afterStock = beforeStock - qty
        const newStatus =
          afterStock === 0
            ? 'OUT_OF_STOCK'
            : afterStock <= book.minStock
              ? 'LOW_STOCK'
              : 'IN_STOCK'

        // 1. Update book stock
        book.stock = afterStock
        book.status = newStatus
        await queryRunner.manager.save(Book, book)

        // 2. Record stock movement
        const movement = queryRunner.manager.create(StockMovement, {
          bookId: book.id,
          bookTitle: book.title,
          type: 'EXPORT',
          quantity: -qty,
          beforeStock,
          afterStock,
          referenceCode: receiptCode,
          note: `Lý do: ${dto.reason}${dto.orderId ? ` (Đơn: ${dto.orderId})` : ''}`,
          createdBy: dto.createdBy || 'Admin',
        })
        await queryRunner.manager.save(StockMovement, movement)

        items.push({
          bookId: book.id,
          title: book.title,
          quantity: qty,
          price: line.price || Number(book.sellingPrice),
        })
        totalItems += qty
      }

      const receipt = queryRunner.manager.create(ExportReceipt, {
        receiptCode,
        orderId: dto.orderId,
        reason: dto.reason,
        exportDate: new Date(),
        totalItems,
        note: dto.note || '',
        items,
        createdBy: dto.createdBy || 'Admin',
      })

      const savedReceipt = await queryRunner.manager.save(
        ExportReceipt,
        receipt,
      )
      await queryRunner.manager.save(
        ActivityLog,
        queryRunner.manager.create(ActivityLog, {
          actorName: dto.createdBy || 'Admin',
          action: 'CREATE',
          resourceType: 'ExportReceipt',
          resourceId: String(savedReceipt.id),
          description: `Tạo phiếu xuất ${savedReceipt.receiptCode}`,
          metadata: { totalItems, reason: dto.reason },
        }),
      )
      await queryRunner.commitTransaction()

      await this.redisService.delPattern('books:*')

      return savedReceipt
    } catch (err) {
      await queryRunner.rollbackTransaction()
      throw err
    } finally {
      await queryRunner.release()
    }
  }
}
