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

import { CreateSupplierUseCase } from '@use-cases/suppliers/create-supplier.use-case'
import { DeleteSupplierUseCase } from '@use-cases/suppliers/delete-supplier.use-case'
import { GetDetailSupplierUseCase } from '@use-cases/suppliers/get-detail-supplier.use-case'
import { GetListSuppliersUseCase } from '@use-cases/suppliers/get-list-suppliers.use-case'
import { UpdateSupplierUseCase } from '@use-cases/suppliers/update-supplier.use-case'

import { CheckPolicies } from '../common/decorators/check-policies.decorator'
import { ApiResponseType } from '../common/decorators/swagger-response.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { PoliciesGuard } from '../common/guards/policies.guard'
import { CreateSupplierDto } from './dto/create-supplier.dto'
import { GetListSuppliersDto } from './dto/get-list-suppliers.dto'
import { UpdateSupplierDto } from './dto/update-supplier.dto'
import { GetListSuppliersPresenter } from './presenters/get-list-suppliers.presenter'
import { SupplierPresenter } from './presenters/supplier.presenter'

@Controller()
@ApiTags('Suppliers')
@ApiResponse({
  status: 401,
  description: 'No authorization token was found',
})
@ApiResponse({ status: 500, description: 'Internal error' })
@ApiResponse({ status: 403, description: 'Forbidden access' })
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class SuppliersController {
  constructor(
    private readonly getListSuppliersUseCase: GetListSuppliersUseCase,
    private readonly createSupplierUseCase: CreateSupplierUseCase,
    private readonly updateSupplierUseCase: UpdateSupplierUseCase,
    private readonly deleteSupplierUseCase: DeleteSupplierUseCase,
    private readonly getDetailSupplierUseCase: GetDetailSupplierUseCase,
  ) {}

  @Get('/users/suppliers')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all suppliers for users',
    description: 'Retrieve a list of all suppliers',
  })
  @ApiExtraModels(GetListSuppliersPresenter)
  @ApiResponseType(GetListSuppliersPresenter, true)
  @CheckPolicies({ action: 'read', subject: 'Supplier' })
  async getSuppliers(@Query() queryParams: GetListSuppliersDto) {
    const { data, pagination } =
      await this.getListSuppliersUseCase.execute(queryParams)
    return new GetListSuppliersPresenter(data, pagination)
  }

  @Get('/admin/suppliers')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List suppliers (Admin)',
    description: 'Retrieve a list of all suppliers for admin',
  })
  @ApiExtraModels(GetListSuppliersPresenter)
  @ApiResponseType(GetListSuppliersPresenter, true)
  @CheckPolicies({ action: 'read', subject: 'Supplier' })
  async getAdminSuppliers(@Query() queryParams: GetListSuppliersDto) {
    const { data, pagination } =
      await this.getListSuppliersUseCase.execute(queryParams)
    return new GetListSuppliersPresenter(data, pagination)
  }

  @Get('/admin/suppliers/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get supplier by ID' })
  @ApiExtraModels(SupplierPresenter)
  @ApiResponseType(SupplierPresenter, true)
  @CheckPolicies({ action: 'read', subject: 'Supplier' })
  async getSupplierById(@Param('id', ParseIntPipe) id: number) {
    const supplier = await this.getDetailSupplierUseCase.execute({ id })
    return new SupplierPresenter(supplier)
  }

  @Post('/admin/suppliers')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new supplier' })
  @CheckPolicies({ action: 'create', subject: 'Supplier' })
  @ApiExtraModels(SupplierPresenter)
  @ApiResponseType(SupplierPresenter, true)
  async createSupplier(@Body() createSupplierDto: CreateSupplierDto) {
    const supplier = await this.createSupplierUseCase.execute(createSupplierDto)
    return new SupplierPresenter(supplier)
  }

  @Put('/admin/suppliers/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing supplier' })
  @CheckPolicies({ action: 'update', subject: 'Supplier' })
  @ApiResponse({ status: 200, description: 'Supplier updated successfully' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async updateSupplier(
    @Body() updateSupplierDto: UpdateSupplierDto,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.updateSupplierUseCase.execute({ id }, updateSupplierDto)
  }

  @Delete('/admin/suppliers/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a supplier' })
  @CheckPolicies({ action: 'delete', subject: 'Supplier' })
  @ApiResponse({ status: 200, description: 'Supplier deleted successfully' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async deleteSupplier(@Param('id', ParseIntPipe) id: number): Promise<boolean> {
    return await this.deleteSupplierUseCase.execute({ id })
  }
}
