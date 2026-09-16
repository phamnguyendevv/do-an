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
import { InjectRepository } from '@nestjs/typeorm'

import { Repository } from 'typeorm'

import { Promotion } from '@infrastructure/databases/postgresql/entities/promotion.entity'

import { CheckPolicies } from '../common/decorators/check-policies.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { PoliciesGuard } from '../common/guards/policies.guard'
import {
  CreatePromotionDto,
  ListPromotionsDto,
  UpdatePromotionDto,
  ValidatePromotionDto,
} from './dto/promotion.dto'

@Controller('admin/promotions')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class PromotionsController {
  constructor(
    @InjectRepository(Promotion)
    private readonly repository: Repository<Promotion>,
  ) {}

  @Get()
  @CheckPolicies({ action: 'read', subject: 'Promotion' })
  async list(@Query() query: ListPromotionsDto) {
    const page = query.page || 1
    const size = query.size || 50
    const [data, total] = await this.repository.findAndCount({
      where: query.search
        ? [{ code: query.search }, { name: query.search }]
        : {},
      order: { createdAt: 'DESC' },
      take: size,
      skip: (page - 1) * size,
    })
    return { data, pagination: { total, page, size } }
  }

  @Post('validate')
  @CheckPolicies({ action: 'read', subject: 'Promotion' })
  async validate(@Body() dto: ValidatePromotionDto) {
    const promotion = await this.repository.findOne({
      where: { code: dto.code.toUpperCase(), isActive: true },
    })
    const now = new Date()
    if (
      !promotion ||
      promotion.startsAt > now ||
      promotion.endsAt < now ||
      (promotion.usageLimit !== null &&
        promotion.usageLimit !== undefined &&
        promotion.usedCount >= promotion.usageLimit) ||
      dto.orderValue < Number(promotion.minOrderValue)
    )
      return { valid: false, discount: 0 }
    let discount =
      promotion.discountType === 'PERCENTAGE'
        ? (dto.orderValue * Number(promotion.discountValue)) / 100
        : Number(promotion.discountValue)
    if (promotion.maxDiscount !== null && promotion.maxDiscount !== undefined)
      discount = Math.min(discount, Number(promotion.maxDiscount))
    return {
      valid: true,
      promotion,
      discount: Math.min(discount, dto.orderValue),
    }
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'Promotion' })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.repository.findOneBy({ id })
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'Promotion' })
  create(@Body() dto: CreatePromotionDto) {
    return this.repository.save(
      this.repository.create({
        ...dto,
        code: dto.code.toUpperCase(),
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
      }),
    )
  }

  @Put(':id')
  @CheckPolicies({ action: 'update', subject: 'Promotion' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePromotionDto,
  ) {
    await this.repository.update(
      { id },
      {
        ...dto,
        ...(dto.startsAt ? { startsAt: new Date(dto.startsAt) } : {}),
        ...(dto.endsAt ? { endsAt: new Date(dto.endsAt) } : {}),
      },
    )
    return this.get(id)
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'Promotion' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return (await this.repository.delete({ id })).affected !== 0
  }
}
