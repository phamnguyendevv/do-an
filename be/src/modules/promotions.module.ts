import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { PromotionsController } from '@adapters/controllers/promotions/promotions.controller'

import { Promotion } from '@infrastructure/databases/postgresql/entities/promotion.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Promotion])],
  controllers: [PromotionsController],
})
export class PromotionsModule {}
