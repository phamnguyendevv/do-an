import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { EXCEPTIONS } from '@domain/exceptions/exceptions.interface'
import { SUPPLIER_REPOSITORY } from '@domain/repositories/supplier.repository.interface'

import { CreateSupplierUseCase } from '@use-cases/suppliers/create-supplier.use-case'
import { DeleteSupplierUseCase } from '@use-cases/suppliers/delete-supplier.use-case'
import { GetDetailSupplierUseCase } from '@use-cases/suppliers/get-detail-supplier.use-case'
import { GetListSuppliersUseCase } from '@use-cases/suppliers/get-list-suppliers.use-case'
import { UpdateSupplierUseCase } from '@use-cases/suppliers/update-supplier.use-case'

import { SuppliersController } from '@adapters/controllers/suppliers/suppliers.controller'

import { Supplier } from '@infrastructure/databases/postgresql/entities/supplier.entity'
import { SupplierRepository } from '@infrastructure/databases/postgresql/repositories/supplier.repository'
import { ExceptionsModule } from '@infrastructure/exceptions/exceptions.module'
import { ExceptionsService } from '@infrastructure/exceptions/exceptions.service'
import { CaslModule } from '@infrastructure/services/casl/casl.module'

@Module({
  imports: [TypeOrmModule.forFeature([Supplier]), CaslModule, ExceptionsModule],
  controllers: [SuppliersController],
  providers: [
    {
      provide: SUPPLIER_REPOSITORY,
      useClass: SupplierRepository,
    },
    {
      provide: EXCEPTIONS,
      useClass: ExceptionsService,
    },
    GetListSuppliersUseCase,
    CreateSupplierUseCase,
    UpdateSupplierUseCase,
    DeleteSupplierUseCase,
    GetDetailSupplierUseCase,
  ],
  exports: [SUPPLIER_REPOSITORY],
})
export class SuppliersModule {}
