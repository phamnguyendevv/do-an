import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common'
import { CheckPolicies } from '../common/decorators/check-policies.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { PoliciesGuard } from '../common/guards/policies.guard'
import { Customer } from '@infrastructure/databases/postgresql/entities/customer.entity'
import { InjectRepository } from '@nestjs/typeorm'
import { ILike, Repository } from 'typeorm'
import { CreateCustomerDto, ListCustomersDto, UpdateCustomerDto } from './dto/customer.dto'

@Controller('admin/customers')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class CustomersController {
  constructor(@InjectRepository(Customer) private readonly repository: Repository<Customer>) {}

  @Get()
  @CheckPolicies({ action: 'read', subject: 'Customer' })
  async list(@Query() query: ListCustomersDto) {
    const page = query.page || 1
    const size = query.size || 50
    const where = query.search
      ? [{ name: ILike(`%${query.search}%`) }, { phone: ILike(`%${query.search}%`) }, { email: ILike(`%${query.search}%`) }]
      : {}
    const [data, total] = await this.repository.findAndCount({ where, order: { createdAt: 'DESC' }, take: size, skip: (page - 1) * size })
    return { data, pagination: { total, page, size } }
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'Customer' })
  get(@Param('id', ParseIntPipe) id: number) { return this.repository.findOneBy({ id }) }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'Customer' })
  create(@Body() dto: CreateCustomerDto) { return this.repository.save(this.repository.create(dto)) }

  @Put(':id')
  @CheckPolicies({ action: 'update', subject: 'Customer' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCustomerDto) {
    await this.repository.update({ id }, dto)
    return this.get(id)
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'Customer' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return (await this.repository.delete({ id })).affected !== 0
  }
}
