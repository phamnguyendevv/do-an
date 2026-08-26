import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { EXCEPTIONS } from '@domain/exceptions/exceptions.interface'
import { CATEGORY_REPOSITORY } from '@domain/repositories/category.repository.interface'
import { SERVICE_REPOSITORY } from '@domain/repositories/service.repository.interface'

import { CreateServiceUseCase } from '@use-cases/services/create-service.use-case'
import { DeleteMyServiceUseCase } from '@use-cases/services/delete-my-service.use-case'
import { DeleteServiceUseCase } from '@use-cases/services/delete-service.use-case'
import { GetDetailServiceUseCase } from '@use-cases/services/get-detail-service.use-case'
import { GetListServiceUseCase } from '@use-cases/services/get-list-category.use-case'
import { UpdateServiceUseCase } from '@use-cases/services/update-service.use-case'

import { ServicesController } from '@adapters/controllers/services/services.controller'

import { Category } from '@infrastructure/databases/postgressql/entities/category.entity'
import { Service } from '@infrastructure/databases/postgressql/entities/service.entity'
import { CategoryRepository } from '@infrastructure/databases/postgressql/repositories/category.repository'
import { ServiceRepository } from '@infrastructure/databases/postgressql/repositories/service.repository'
import { ExceptionsModule } from '@infrastructure/exceptions/exceptions.module'
import { ExceptionsService } from '@infrastructure/exceptions/exceptions.service'
import { CaslModule } from '@infrastructure/services/casl/casl.module'

import { CategoriesModule } from './category.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Service, Category]),
    CaslModule,
    ExceptionsModule,
    CategoriesModule,
  ],

  controllers: [ServicesController],
  providers: [
    {
      provide: SERVICE_REPOSITORY,
      useClass: ServiceRepository,
    },
    {
      provide: CATEGORY_REPOSITORY,
      useClass: CategoryRepository,
    },
    {
      provide: EXCEPTIONS,
      useClass: ExceptionsService,
    },
    CreateServiceUseCase,
    UpdateServiceUseCase,
    GetDetailServiceUseCase,
    DeleteServiceUseCase,
    GetListServiceUseCase,
    DeleteMyServiceUseCase,
  ],
})
export class ServicesModule {}
