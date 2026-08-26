import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'

import { CreateInvoiceUseCase } from '@use-cases/invoices/create-invoice.use-case'
import { DeleteInvoiceUseCase } from '@use-cases/invoices/delete-invoice.use-case'
import { GetInvoiceDetailUseCase } from '@use-cases/invoices/get-invoice-detail.use-case'
import { GetInvoicesListUseCase } from '@use-cases/invoices/get-invoices-list.use-case'
import { UpdateInvoiceUseCase } from '@use-cases/invoices/update-invoice.use-case'

import { CheckPolicies } from '@adapters/controllers/common/decorators/check-policies.decorator'
import { JwtAuthGuard } from '@adapters/controllers/common/guards/jwt-auth.guard'

import { CreateInvoiceDto } from './dto/create-invoice.dto'
import { GetInvoicesListDto } from './dto/get-invoices-list.dto'
import { UpdateInvoiceDto } from './dto/update-invoice.dto'
import { InvoicePresenter } from './presenters/invoice.presenter'
import { InvoicesListPresenter } from './presenters/invoices-list.presenter'

@ApiTags('Invoices')
@Controller()
export class InvoicesController {
  constructor(
    private readonly createInvoiceUseCase: CreateInvoiceUseCase,
    private readonly getInvoiceDetailUseCase: GetInvoiceDetailUseCase,
    private readonly getInvoicesListUseCase: GetInvoicesListUseCase,
    private readonly updateInvoiceUseCase: UpdateInvoiceUseCase,
    private readonly deleteInvoiceUseCase: DeleteInvoiceUseCase,
  ) {}

  @Post('/admin/invoices')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create invoice',
    description: 'Create a new invoice for an appointment and order',
  })
  @ApiExtraModels(InvoicePresenter)
  @ApiResponse({
    status: 201,
    description: 'Invoice created successfully',
    type: InvoicePresenter,
  })
  @UseGuards(JwtAuthGuard)
  @CheckPolicies({ action: 'create', subject: 'Invoice' })
  async createInvoice(@Body() createInvoiceDto: CreateInvoiceDto) {
    const invoice = await this.createInvoiceUseCase.execute(createInvoiceDto)
    return new InvoicePresenter(invoice)
  }

  @Get('/admin/invoices/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get invoice detail',
    description: 'Get detailed information of a specific invoice',
  })
  @ApiExtraModels(InvoicePresenter)
  @ApiResponse({
    status: 200,
    description: 'Invoice details retrieved successfully',
    type: InvoicePresenter,
  })
  @UseGuards(JwtAuthGuard)
  @CheckPolicies({ action: 'read', subject: 'Invoice' })
  async getInvoiceDetail(@Param('id', ParseIntPipe) id: number) {
    const invoice = await this.getInvoiceDetailUseCase.execute(id)
    return new InvoicePresenter(invoice)
  }

  @Get('/admin/invoices')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get invoices list',
    description: 'Get list of invoices with filtering and pagination',
  })
  @ApiExtraModels(InvoicesListPresenter)
  @ApiResponse({
    status: 200,
    description: 'Invoices list retrieved successfully',
    type: InvoicesListPresenter,
  })
  @UseGuards(JwtAuthGuard)
  @CheckPolicies({ action: 'read', subject: 'Invoice' })
  async getInvoicesList(@Query() getInvoicesListDto: GetInvoicesListDto) {
    const { data, pagination } =
      await this.getInvoicesListUseCase.execute(getInvoicesListDto)
    return new InvoicesListPresenter(data, pagination)
  }

  @Put('/admin/invoices/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update invoice',
    description: 'Update invoice information',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice updated successfully',
    type: Boolean,
  })
  @UseGuards(JwtAuthGuard)
  @CheckPolicies({ action: 'update', subject: 'Invoice' })
  async updateInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ) {
    return this.updateInvoiceUseCase.execute(id, updateInvoiceDto)
  }

  @Delete('/admin/invoices/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete invoice',
    description: 'Soft delete an invoice',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice deleted successfully',
    type: Boolean,
  })
  @UseGuards(JwtAuthGuard)
  @CheckPolicies({ action: 'delete', subject: 'Invoice' })
  async deleteInvoice(@Param('id', ParseIntPipe) id: number) {
    return this.deleteInvoiceUseCase.execute(id)
  }

  // Provider endpoints
  @Get('/provider/invoices')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get provider invoices',
    description: 'Get list of invoices for the authenticated provider',
  })
  @ApiExtraModels(InvoicesListPresenter)
  @ApiResponse({
    status: 200,
    description: 'Provider invoices list retrieved successfully',
    type: InvoicesListPresenter,
  })
  @UseGuards(JwtAuthGuard)
  @CheckPolicies({ action: 'read', subject: 'Invoice' })
  async getProviderInvoices(
    @Query() getInvoicesListDto: GetInvoicesListDto,
    // TODO: Add User decorator to get providerId from JWT
    // @User('id') providerId: number,
  ) {
    // TODO: Add providerId to search params
    const { data, pagination } =
      await this.getInvoicesListUseCase.execute(getInvoicesListDto)
    return new InvoicesListPresenter(data, pagination)
  }

  @Get('/provider/invoices/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get provider invoice detail',
    description: 'Get detailed information of a specific invoice for provider',
  })
  @ApiExtraModels(InvoicePresenter)
  @ApiResponse({
    status: 200,
    description: 'Provider invoice details retrieved successfully',
    type: InvoicePresenter,
  })
  @UseGuards(JwtAuthGuard)
  @CheckPolicies({ action: 'read', subject: 'Invoice' })
  async getProviderInvoiceDetail(@Param('id', ParseIntPipe) id: number) {
    const invoice = await this.getInvoiceDetailUseCase.execute(id)
    return new InvoicePresenter(invoice)
  }

  // Client endpoints
  @Get('/client/invoices')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get client invoices',
    description: 'Get list of invoices for the authenticated client',
  })
  @ApiExtraModels(InvoicesListPresenter)
  @ApiResponse({
    status: 200,
    description: 'Client invoices list retrieved successfully',
    type: InvoicesListPresenter,
  })
  @UseGuards(JwtAuthGuard)
  @CheckPolicies({ action: 'read', subject: 'Invoice' })
  async getClientInvoices(
    @Query() getInvoicesListDto: GetInvoicesListDto,
    // TODO: Add User decorator to get clientId from JWT
    // @User('id') clientId: number,
  ) {
    // TODO: Add clientId to search params
    const { data, pagination } =
      await this.getInvoicesListUseCase.execute(getInvoicesListDto)
    return new InvoicesListPresenter(data, pagination)
  }

  @Get('/client/invoices/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get client invoice detail',
    description: 'Get detailed information of a specific invoice for client',
  })
  @ApiExtraModels(InvoicePresenter)
  @ApiResponse({
    status: 200,
    description: 'Client invoice details retrieved successfully',
    type: InvoicePresenter,
  })
  @UseGuards(JwtAuthGuard)
  @CheckPolicies({ action: 'read', subject: 'Invoice' })
  async getClientInvoiceDetail(@Param('id', ParseIntPipe) id: number) {
    const invoice = await this.getInvoiceDetailUseCase.execute(id)
    return new InvoicePresenter(invoice)
  }
}
