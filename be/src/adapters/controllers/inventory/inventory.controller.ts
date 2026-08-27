import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'

import { BalanceStockAuditUseCase } from '@use-cases/inventory/balance-stock-audit.use-case'
import { CreateExportReceiptUseCase } from '@use-cases/inventory/create-export-receipt.use-case'
import { CreateImportReceiptUseCase } from '@use-cases/inventory/create-import-receipt.use-case'
import { CreateStockAuditUseCase } from '@use-cases/inventory/create-stock-audit.use-case'
import { GetExportReceiptsUseCase } from '@use-cases/inventory/get-export-receipts.use-case'
import { GetImportReceiptsUseCase } from '@use-cases/inventory/get-import-receipts.use-case'
import { GetInventorySummaryUseCase } from '@use-cases/inventory/get-inventory-summary.use-case'
import { GetStockAuditsUseCase } from '@use-cases/inventory/get-stock-audits.use-case'
import { GetStockMovementsUseCase } from '@use-cases/inventory/get-stock-movements.use-case'

import { CheckPolicies } from '../common/decorators/check-policies.decorator'
import { User } from '../common/decorators/user.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { PoliciesGuard } from '../common/guards/policies.guard'
import { CreateExportReceiptDto } from './dto/create-export-receipt.dto'
import { CreateImportReceiptDto } from './dto/create-import-receipt.dto'
import { GetListReceiptsDto } from './dto/get-list-receipts.dto'
import { GetStockMovementsDto } from './dto/get-stock-movements.dto'
import {
  CreateStockAuditControllerDto,
  GetListAuditsDto,
} from './dto/stock-audit.dto'

@Controller('admin/inventory')
@ApiTags('Inventory - Kho Hàng')
@ApiResponse({ status: 401, description: 'No authorization token was found' })
@ApiResponse({ status: 403, description: 'Forbidden access' })
@ApiResponse({ status: 500, description: 'Internal error' })
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class InventoryController {
  constructor(
    private readonly createImportReceiptUseCase: CreateImportReceiptUseCase,
    private readonly getImportReceiptsUseCase: GetImportReceiptsUseCase,
    private readonly createExportReceiptUseCase: CreateExportReceiptUseCase,
    private readonly getExportReceiptsUseCase: GetExportReceiptsUseCase,
    private readonly getStockMovementsUseCase: GetStockMovementsUseCase,
    private readonly getInventorySummaryUseCase: GetInventorySummaryUseCase,
    private readonly createStockAuditUseCase: CreateStockAuditUseCase,
    private readonly getStockAuditsUseCase: GetStockAuditsUseCase,
    private readonly balanceStockAuditUseCase: BalanceStockAuditUseCase,
  ) {}

  @Get('summary')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tổng quan tồn kho & thống kê nhập xuất' })
  @CheckPolicies({ action: 'read', subject: 'StockMovement' })
  async getSummary() {
    return await this.getInventorySummaryUseCase.execute()
  }

  // ===== PHIẾU NHẬP KHO =====
  @Post('import')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo phiếu nhập kho (tăng tồn kho & ghi sổ kho)' })
  @CheckPolicies({ action: 'create', subject: 'ImportReceipt' })
  async createImport(@Body() dto: CreateImportReceiptDto) {
    return await this.createImportReceiptUseCase.execute(dto)
  }

  @Get('import')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Danh sách phiếu nhập kho' })
  @CheckPolicies({ action: 'read', subject: 'ImportReceipt' })
  async getImports(@Query() query: GetListReceiptsDto) {
    return await this.getImportReceiptsUseCase.execute({
      ...query,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    })
  }

  @Get('import/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chi tiết phiếu nhập kho' })
  @CheckPolicies({ action: 'read', subject: 'ImportReceipt' })
  async getImportDetail(@Param('id', ParseIntPipe) id: number) {
    return await this.getImportReceiptsUseCase.getDetail(id)
  }

  // ===== PHIẾU XUẤT KHO =====
  @Post('export')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo phiếu xuất kho (giảm tồn kho & ghi sổ kho)' })
  @CheckPolicies({ action: 'create', subject: 'ExportReceipt' })
  async createExport(@Body() dto: CreateExportReceiptDto) {
    return await this.createExportReceiptUseCase.execute(dto)
  }

  @Get('export')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Danh sách phiếu xuất kho' })
  @CheckPolicies({ action: 'read', subject: 'ExportReceipt' })
  async getExports(@Query() query: GetListReceiptsDto) {
    return await this.getExportReceiptsUseCase.execute({
      ...query,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    })
  }

  @Get('export/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chi tiết phiếu xuất kho' })
  @CheckPolicies({ action: 'read', subject: 'ExportReceipt' })
  async getExportDetail(@Param('id', ParseIntPipe) id: number) {
    return await this.getExportReceiptsUseCase.getDetail(id)
  }

  // ===== SỔ KHO / BIẾN ĐỘNG TỒN KHO =====
  @Get('movements')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lịch sử biến động tồn kho (Sổ kho chi tiết)' })
  @CheckPolicies({ action: 'read', subject: 'StockMovement' })
  async getStockMovements(@Query() query: GetStockMovementsDto) {
    return await this.getStockMovementsUseCase.execute({
      ...query,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    })
  }

  // ===== KIỂM KÊ KHO & CÂN BẰNG TỒN KHO =====
  @Post('audit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo phiếu kiểm kê kho' })
  @CheckPolicies({ action: 'create', subject: 'StockMovement' })
  async createAudit(@Body() dto: CreateStockAuditControllerDto, @User('username') userName?: string) {
    return await this.createStockAuditUseCase.execute({
      ...dto,
      auditedBy: userName || 'Admin',
    })
  }

  @Get('audit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Danh sách phiếu kiểm kê kho' })
  @CheckPolicies({ action: 'read', subject: 'StockMovement' })
  async getAudits(@Query() query: GetListAuditsDto) {
    return await this.getStockAuditsUseCase.execute(query)
  }

  @Get('audit/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chi tiết phiếu kiểm kê kho' })
  @CheckPolicies({ action: 'read', subject: 'StockMovement' })
  async getAuditDetail(@Param('id', ParseIntPipe) id: number) {
    return await this.getStockAuditsUseCase.getById(id)
  }

  @Post('audit/:id/balance')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cân bằng tồn kho theo phiếu kiểm kê (ghi log Sổ kho)' })
  @CheckPolicies({ action: 'update', subject: 'StockMovement' })
  async balanceAudit(@Param('id', ParseIntPipe) id: number, @User('username') userName?: string) {
    return await this.balanceStockAuditUseCase.execute(id, userName || 'Admin')
  }
}
