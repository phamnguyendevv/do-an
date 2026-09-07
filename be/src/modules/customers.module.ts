import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CustomersController } from '@adapters/controllers/customers/customers.controller'
import { Customer } from '@infrastructure/databases/postgresql/entities/customer.entity'
import { CaslModule } from '@infrastructure/services/casl/casl.module'

@Module({
  imports: [TypeOrmModule.forFeature([Customer]), CaslModule],
  controllers: [CustomersController],
})
export class CustomersModule {}
