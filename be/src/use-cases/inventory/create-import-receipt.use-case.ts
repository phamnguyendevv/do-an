import { Inject, Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'

import {
  CreateImportReceiptInput,
  ImportReceiptEntity,
  ImportReceiptItem,
} from '@domain/entities/import-receipt.entity'
import { BookStatusEnum } from '@domain/entities/order-enums.entity'
import { StockMovementTypeEnum } from '@domain/entities/stock-movement.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  BOOK_REPOSITORY,
  IBookRepositoryInterface,
} from '@domain/repositories/book.repository.interface'
import {
  IImportReceiptRepositoryInterface,
  IMPORT_RECEIPT_REPOSITORY,
} from '@domain/repositories/import-receipt.repository.interface'
import {
  STOCK_MOVEMENT_REPOSITORY,
  IStockMovementRepositoryInterface,
} from '@domain/repositories/stock-movement.repository.interface'
import {
  IRedisCacheService,
  REDIS_SERVICE,
} from '@domain/services/redis.interface'

import { Book } from '@infrastructure/databases/postgresql/entities/book.entity'
import { ImportReceipt } from '@infrastructure/databases/postgresql/entities/import-receipt.entity'
import { StockMovement } from '@infrastructure/databases/postgresql/entities/stock-movement.entity'
import { ActivityLog } from '@infrastructure/databases/postgresql/entities/activity-log.entity'


@Injectable()
export class CreateImportReceiptUseCase {
  constructor(
    @Inject(IMPORT_RECEIPT_REPOSITORY)
    private readonly importReceiptRepository: IImportReceiptRepositoryInterface,
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

  async execute(dto: CreateImportReceiptInput): Promise<ImportReceiptEntity> {
    if (!dto.supplierName || dto.supplierName.trim().length === 0) {
      throw this.exceptionsService.badRequestException({
        type: 'InventoryValidationException',
        message: 'Vui lòng chọn hoặc nhập tên nhà cung cấp',
      })
    }

    if (!dto.lines || dto.lines.length === 0) {
      throw this.exceptionsService.badRequestException({
        type: 'InventoryValidationException',
        message: 'Phiếu nhập phải có ít nhất 1 sản phẩm',
      })
    }

    for (const line of dto.lines) {
      if (!line.quantity || line.quantity <= 0) {
        throw this.exceptionsService.badRequestException({
          type: 'InventoryValidationException',
          message: 'Số lượng nhập phải lớn hơn 0',
        })
      }
      if (line.price < 0) {
        throw this.exceptionsService.badRequestException({
          type: 'InventoryValidationException',
          message: 'Giá nhập không thể âm',
        })
      }
    }

    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const items: ImportReceiptItem[] = []
      let totalItems = 0
      let totalValue = 0

      // Count existing receipts for code generation
      const count = await queryRunner.manager.count(ImportReceipt)
      const receiptCode = `IMP-${1000 + count + 1}`

      for (const line of dto.lines) {
        const bookIdNum = typeof line.bookId === 'number' ? line.bookId : parseInt(String(line.bookId), 10)
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
        const price = line.price || Number(book.purchasePrice)
        const beforeStock = Number(book.stock)
        const afterStock = beforeStock + qty
        const newStatus =
          afterStock === 0
            ? BookStatusEnum.OutOfStock
            : afterStock <= book.minStock
              ? BookStatusEnum.LowStock
              : BookStatusEnum.InStock

        // 1. Update book stock & purchasePrice if provided
        book.stock = afterStock
        book.status = newStatus
        if (line.price > 0) {
          book.purchasePrice = line.price
        }
        await queryRunner.manager.save(Book, book)

        // 2. Record stock movement
        const movement = queryRunner.manager.create(StockMovement, {
          bookId: book.id,
          bookTitle: book.title,
          type: StockMovementTypeEnum.Import,
          quantity: qty,
          beforeStock,
          afterStock,
          referenceCode: receiptCode,
          note: `Nhập từ NCC: ${dto.supplierName}`,
          createdBy: dto.createdBy || 'Admin',
        })
        await queryRunner.manager.save(StockMovement, movement)

        items.push({
          bookId: book.id,
          title: book.title,
          quantity: qty,
          price,
        })
        totalItems += qty
        totalValue += qty * price
      }

      const receipt = queryRunner.manager.create(ImportReceipt, {
        receiptCode,
        supplierId: dto.supplierId,
        supplierName: dto.supplierName,
        importDate: dto.importDate ? new Date(dto.importDate) : new Date(),
        totalItems,
        totalValue,
        note: dto.note || '',
        items,
        createdBy: dto.createdBy || 'Admin',
      })

      const savedReceipt = await queryRunner.manager.save(ImportReceipt, receipt)
      await queryRunner.manager.save(ActivityLog, queryRunner.manager.create(ActivityLog, {
        actorName: dto.createdBy || 'Admin', action: 'CREATE', resourceType: 'ImportReceipt',
        resourceId: String(savedReceipt.id), description: `Tạo phiếu nhập ${savedReceipt.receiptCode}`,
        metadata: { totalItems, totalValue },
      }))
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
