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

import { CreatePromotionUseCase } from '@use-cases/promotions/create-promotion.use-case'
import { DeletePromotionUseCase } from '@use-cases/promotions/delete-promotion.use-case'
import { GetPromotionUseCase } from '@use-cases/promotions/get-detail-promotion.use-case'
import { GetListPromotionsByClientUseCase } from '@use-cases/promotions/get-list-promotion-by-client.use-case.'
import { GetListPromotionsUseCase } from '@use-cases/promotions/get-list-promotions.use-case'
import { UpdatePromotionUseCase } from '@use-cases/promotions/update-promotion.use-case'

import { CreatePromotionDto } from '@adapters/controllers/promotions/dto/create-promotion.dto'
import { GetListPromotionDto } from '@adapters/controllers/promotions/dto/get-list-promotion.dto'
import { UpdatePromotionDto } from '@adapters/controllers/promotions/dto/update-promotion.dto'
import { GetDetailPromotionPresenter } from '@adapters/controllers/promotions/presenters/get-list-promotion.presenter'
import { GetListPromotionsPresenter } from '@adapters/controllers/promotions/presenters/get-list-promotions.presenter'

import { CheckPolicies } from '../common/decorators/check-policies.decorator'
import { ApiResponseType } from '../common/decorators/swagger-response.decorator'
import { User } from '../common/decorators/user.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { PoliciesGuard } from '../common/guards/policies.guard'

@Controller()
@ApiTags('Promotions')
@ApiResponse({
  status: 401,
  description: 'No authorization token was found',
})
@ApiResponse({ status: 500, description: 'Internal error' })
@ApiResponse({ status: 403, description: 'Forbidden access' })
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class PromotionsController {
  constructor(
    private readonly createPromotionUseCase: CreatePromotionUseCase,
    private readonly deletePromotionUseCase: DeletePromotionUseCase,
    private readonly getListPromotionsUseCase: GetListPromotionsUseCase,
    private readonly getListPromotionsByClientUseCase: GetListPromotionsByClientUseCase,
    private readonly getPromotionUseCase: GetPromotionUseCase,
    private readonly updatePromotionUseCase: UpdatePromotionUseCase,
  ) {}

  @Post('/provider/promotions')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create promotion',
    description:
      'Create a new promotion, usageLimit là số lần sử dụng, maxDiscount là số tiền giảm tối đa )',
  })
  @ApiResponseType(GetDetailPromotionPresenter, true)
  @CheckPolicies({ action: 'create', subject: 'Promotion' })
  async create(
    @Body() createPromotionDto: CreatePromotionDto,
    @User('id') userId: number,
  ) {
    const promotion = await this.createPromotionUseCase.execute(
      createPromotionDto,
      userId,
    )
    return new GetDetailPromotionPresenter(promotion)
  }

  @Get('/provider/promotions')
  @ApiExtraModels(GetListPromotionsPresenter)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all promotions',
    description: 'Retrieve a list of all promotions',
  })
  @ApiResponseType(GetListPromotionsPresenter, true)
  @CheckPolicies({ action: 'read', subject: 'Promotion' })
  async findAll(
    @Query() getListDto: GetListPromotionDto,
    @User('id') userId: number,
  ) {
    const { data, pagination } = await this.getListPromotionsUseCase.execute(
      getListDto,
      userId,
    )
    return new GetListPromotionsPresenter(data, pagination)
  }
  @Get('/user/promotions')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all promotions',
    description: 'Retrieve a list of all promotions',
  })
  @ApiExtraModels(GetListPromotionsPresenter)
  @ApiResponseType(GetListPromotionsPresenter, true)
  @CheckPolicies({ action: 'read', subject: 'Promotion' })
  async findAllPromotion(
    @Query() getListDto: GetListPromotionDto,
    @User('id') userId: number,
  ) {
    const { data, pagination } =
      await this.getListPromotionsByClientUseCase.execute(getListDto, userId)
    return new GetListPromotionsPresenter(data, pagination)
  }

  @Get('/provider/promotions/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get detail promotion',
    description: 'Retrieve a detail promotion',
  })
  @ApiResponseType(GetDetailPromotionPresenter, true)
  @CheckPolicies({ action: 'read', subject: 'Promotion' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @User('id') userId: number,
  ) {
    const promotion = await this.getPromotionUseCase.execute(id, userId)
    return new GetDetailPromotionPresenter(promotion)
  }

  @Put('/provider/promotions/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Update promotion',
    description: 'Update an existing promotion by ID',
  })
  @CheckPolicies({ action: 'update', subject: 'Promotion' })
  async update(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePromotionDto: UpdatePromotionDto,
  ) {
    const isUpdated = await this.updatePromotionUseCase.execute(
      {
        id,
        userId,
      },
      updatePromotionDto,
    )
    return isUpdated
  }

  @Delete('/provider/promotions/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete promotion',
    description: 'Delete an existing promotion by ID',
  })
  @CheckPolicies({ action: 'delete', subject: 'Promotion' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    const isDelete = await this.deletePromotionUseCase.execute(id)
    return isDelete
  }
}
