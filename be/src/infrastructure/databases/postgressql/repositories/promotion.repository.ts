import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Repository } from 'typeorm'

import { PromotionEntity } from '@domain/entities/promotion.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import {
  IPromotionRepositoryInterface,
  ISearchPromotionParams,
} from '@domain/repositories/promotion.repository.interface'

import { Promotion } from '../entities/promotion.entity'

@Injectable()
export class PromotionRepository implements IPromotionRepositoryInterface {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
  ) {}

  async createPromotion(
    entity: Partial<PromotionEntity>,
  ): Promise<PromotionEntity> {
    const newPromotion = this.promotionRepository.create(entity)
    return this.promotionRepository.save(newPromotion)
  }

  async getListPromotion(
    props: ISearchPromotionParams,
  ): Promise<{ data: PromotionEntity[]; pagination: IPaginationParams }> {
    const page = props.page || 1
    const size = props.size || 10
    const queryBuilder =
      this.promotionRepository.createQueryBuilder('promotion')
    if (props.id) {
      queryBuilder.andWhere('promotion.id = :id', { id: props.id })
    }
    if (props.providerId) {
      queryBuilder.andWhere('promotion.providerId = :providerId', {
        providerId: props.providerId,
      })
    }

    if (props.search) {
      queryBuilder.andWhere(
        '(promotion.name ILIKE :search OR promotion.code ILIKE :search)',
        { search: `%${props.search}%` },
      )
    }
    queryBuilder.andWhere('promotion.isDeleted = :isDeleted', {
      isDeleted: false,
    })

    const [data, total] = await queryBuilder
      .skip((page - 1) * size)
      .take(size)
      .getManyAndCount()

    return {
      data,
      pagination: {
        total,
        page,
        size,
      },
    }
  }

  async findPromotionById(id: number): Promise<PromotionEntity> {
    const promotion = await this.promotionRepository.findOneBy({
      id,
      isDeleted: false,
    })
    if (!promotion) {
      throw new Error('Promotion not found')
    }
    return promotion
  }

  async findPromotionByCode(code: string): Promise<PromotionEntity | null> {
    const promotion = await this.promotionRepository.findOneBy({
      code,
      isDeleted: false,
    })
    return promotion
  }

  async findOnePromotion(params: {
    id: number
    userId: number
  }): Promise<PromotionEntity | null> {
    const promotion = await this.promotionRepository.findOneBy({
      id: params.id,
      providerId: params.userId,
      isDeleted: false,
      isActive: true,
    })
    return promotion ? promotion : null
  }

  async updatePromotion(
    params: { id: number; userId: number },
    entity: Partial<PromotionEntity>,
  ): Promise<boolean> {
    const updatedTask = await this.promotionRepository.update(
      {
        id: params.id,
        providerId: params.userId,
      },
      entity,
    )

    if (updatedTask.affected === 0) return false

    return true
  }

  async deletePromotion(id: number): Promise<boolean> {
    const isDelete = await this.promotionRepository.update(id, {
      isDeleted: true,
    })
    if (isDelete.affected === 0) return false
    return true
  }
}
