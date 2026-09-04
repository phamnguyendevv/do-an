import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CustomersController } from '@adapters/controllers/customers/customers.controller'
import { Customer } from '@infrastructure/databases/postgresql/entities/customer.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Customer])],
  controllers: [CustomersController],
})
export class CustomersModule {}
