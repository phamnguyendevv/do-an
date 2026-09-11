import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { EXCEPTIONS } from '@domain/exceptions/exceptions.interface'
import { BOOK_REPOSITORY } from '@domain/repositories/book.repository.interface'
import { EXPORT_RECEIPT_REPOSITORY } from '@domain/repositories/export-receipt.repository.interface'
import { IMPORT_RECEIPT_REPOSITORY } from '@domain/repositories/import-receipt.repository.interface'
import { STOCK_AUDIT_REPOSITORY } from '@domain/repositories/stock-audit.repository.interface'
import { STOCK_MOVEMENT_REPOSITORY } from '@domain/repositories/stock-movement.repository.interface'

import { BalanceStockAuditUseCase } from '@use-cases/inventory/balance-stock-audit.use-case'
import { CreateExportReceiptUseCase } from '@use-cases/inventory/create-export-receipt.use-case'
import { CreateImportReceiptUseCase } from '@use-cases/inventory/create-import-receipt.use-case'
import { CreateStockAuditUseCase } from '@use-cases/inventory/create-stock-audit.use-case'
import { GetExportReceiptsUseCase } from '@use-cases/inventory/get-export-receipts.use-case'
import { GetImportReceiptsUseCase } from '@use-cases/inventory/get-import-receipts.use-case'
import { GetInventorySummaryUseCase } from '@use-cases/inventory/get-inventory-summary.use-case'
import { GetStockAuditsUseCase } from '@use-cases/inventory/get-stock-audits.use-case'
import { GetStockMovementsUseCase } from '@use-cases/inventory/get-stock-movements.use-case'

import { InventoryController } from '@adapters/controllers/inventory/inventory.controller'

import { Book } from '@infrastructure/databases/postgresql/entities/book.entity'
import { ExportReceipt } from '@infrastructure/databases/postgresql/entities/export-receipt.entity'
import { ImportReceipt } from '@infrastructure/databases/postgresql/entities/import-receipt.entity'
import { StockAudit } from '@infrastructure/databases/postgresql/entities/stock-audit.entity'
import { StockMovement } from '@infrastructure/databases/postgresql/entities/stock-movement.entity'
import { BookRepository } from '@infrastructure/databases/postgresql/repositories/book.repository'
import { ExportReceiptRepository } from '@infrastructure/databases/postgresql/repositories/export-receipt.repository'
import { ImportReceiptRepository } from '@infrastructure/databases/postgresql/repositories/import-receipt.repository'
import { StockAuditRepository } from '@infrastructure/databases/postgresql/repositories/stock-audit.repository'
import { StockMovementRepository } from '@infrastructure/databases/postgresql/repositories/stock-movement.repository'
import { ExceptionsModule } from '@infrastructure/exceptions/exceptions.module'
import { ExceptionsService } from '@infrastructure/exceptions/exceptions.service'
import { CaslModule } from '@infrastructure/services/casl/casl.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ImportReceipt,
      ExportReceipt,
      StockMovement,
      Book,
      StockAudit,
    ]),
    CaslModule,
    ExceptionsModule,
  ],
  controllers: [InventoryController],
  providers: [
    {
      provide: IMPORT_RECEIPT_REPOSITORY,
      useClass: ImportReceiptRepository,
    },
    {
      provide: EXPORT_RECEIPT_REPOSITORY,
      useClass: ExportReceiptRepository,
    },
    {
      provide: STOCK_MOVEMENT_REPOSITORY,
      useClass: StockMovementRepository,
    },
    {
      provide: STOCK_AUDIT_REPOSITORY,
      useClass: StockAuditRepository,
    },
    {
      provide: BOOK_REPOSITORY,
      useClass: BookRepository,
    },
    {
      provide: EXCEPTIONS,
      useClass: ExceptionsService,
    },
    CreateImportReceiptUseCase,
    GetImportReceiptsUseCase,
    CreateExportReceiptUseCase,
    GetExportReceiptsUseCase,
    GetStockMovementsUseCase,
    GetInventorySummaryUseCase,
    CreateStockAuditUseCase,
    GetStockAuditsUseCase,
    BalanceStockAuditUseCase,
  ],
  exports: [
    IMPORT_RECEIPT_REPOSITORY,
    EXPORT_RECEIPT_REPOSITORY,
    STOCK_MOVEMENT_REPOSITORY,
    STOCK_AUDIT_REPOSITORY,
  ],
})
export class InventoryModule {}
