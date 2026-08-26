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

import { CreateCategoryUseCase } from '@use-cases/categories/create-category.use-case'
import { DeleteCategoryUseCase } from '@use-cases/categories/delete-category.use.case'
import { GetDetailCategoryUseCase } from '@use-cases/categories/get-detail-category.use-case'
import { GetListCategoryUseCase } from '@use-cases/categories/get-list-category.use-case'
import { UpdateCategoryUseCase } from '@use-cases/categories/update-category.use-case'

import { CheckPolicies } from '../common/decorators/check-policies.decorator'
import { ApiResponseType } from '../common/decorators/swagger-response.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { PoliciesGuard } from '../common/guards/policies.guard'
import { CreateCategoryDto } from './dto/create-categories.dto'
import { GetListCategoriesDto } from './dto/get-list-categories.dto'
import { UpdateCategoryDto } from './dto/update-categories.dto'
import { CreateCategoryPresenter } from './presenters/create-category.presenter'
import { GetDetailCategoryPresenter } from './presenters/get-detail-category.presenter'
import { GetListCategoriesPresenter } from './presenters/get-list-category.presenter'

@Controller()
@ApiTags('Categories')
@ApiResponse({
  status: 401,
  description: 'No authorization token was found',
})
@ApiResponse({ status: 500, description: 'Internal error' })
@ApiResponse({ status: 403, description: 'Forbidden access' })
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class CategoriesController {
  constructor(
    private readonly getCategoriesUseCase: GetListCategoryUseCase,
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly deleteCategoryUseCase: DeleteCategoryUseCase,
    private readonly getDetailCategoryUseCase: GetDetailCategoryUseCase,
  ) {}

  @Get('/users/categories')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all categories for users',
    description: 'Retrieve a list of all categories',
  })
  @ApiExtraModels(GetListCategoriesPresenter)
  @ApiResponseType(GetListCategoriesPresenter, true)
  @CheckPolicies({ action: 'read', subject: 'Category' })
  async getCategories(@Query() queryParams: GetListCategoriesDto) {
    const { data, pagination } =
      await this.getCategoriesUseCase.execute(queryParams)
    return new GetListCategoriesPresenter(data, pagination)
  }

  @Get('/admin/categories')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List categories (Admin)',
    description: 'Retrieve a list of all categories for admin',
  })
  @ApiExtraModels(GetListCategoriesPresenter)
  @ApiResponseType(GetListCategoriesPresenter, true)
  @CheckPolicies({ action: 'read', subject: 'Category' })
  async getAdminCategories(@Query() queryParams: GetListCategoriesDto) {
    const { data, pagination } =
      await this.getCategoriesUseCase.execute(queryParams)
    return new GetListCategoriesPresenter(data, pagination)
  }

  @Get('/admin/categories/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiExtraModels(GetDetailCategoryPresenter)
  @ApiResponseType(GetDetailCategoryPresenter, true)
  @CheckPolicies({ action: 'read', subject: 'Category' })
  async getCategoryById(@Param('id', ParseIntPipe) id: number) {
    const category = await this.getDetailCategoryUseCase.execute({
      id,
    })
    return new GetDetailCategoryPresenter(category)
  }

  @Post('/admin/categories')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new category' })
  @CheckPolicies({ action: 'create', subject: 'Category' })
  @ApiExtraModels(CreateCategoryPresenter)
  @ApiResponseType(CreateCategoryPresenter, true)
  async createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    const category = await this.createCategoryUseCase.execute(createCategoryDto)
    return new CreateCategoryPresenter(category)
  }

  @Put('/admin/categories/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing category' })
  @CheckPolicies({ action: 'update', subject: 'Category' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updateCategory(
    @Body() updateCategoryData: UpdateCategoryDto,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const isUpdated = await this.updateCategoryUseCase.execute(
      { id },
      updateCategoryData,
    )
    return isUpdated
  }

  @Delete('/admin/categories/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a category' })
  @ApiResponse({ status: 204, description: 'Category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @CheckPolicies({ action: 'delete', subject: 'Category' })
  async deleteCategory(@Param('id') id: number): Promise<boolean> {
    const isDeleted = await this.deleteCategoryUseCase.execute({
      id,
    })

    return isDeleted
  }
}
