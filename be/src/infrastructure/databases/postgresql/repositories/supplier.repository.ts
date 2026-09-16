import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Repository } from 'typeorm'

import { IPaginationParams } from '@domain/entities/search.entity'
import { SupplierEntity } from '@domain/entities/supplier.entity'
import {
  ISearchSupplierParams,
  ISupplierRepositoryInterface,
} from '@domain/repositories/supplier.repository.interface'

import { Supplier } from '../entities/supplier.entity'

const DEFAULT_SELECT_FIELDS: (keyof Supplier)[] = [
  'id',
  'name',
  'contactName',
  'phone',
  'email',
  'address',
  'note',
  'createdAt',
  'updatedAt',
]

@Injectable()
export class SupplierRepository implements ISupplierRepositoryInterface {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
  ) {}

  async findSuppliers({ search, size, page }: ISearchSupplierParams): Promise<{
    data: SupplierEntity[]
    pagination: IPaginationParams
  }> {
    const limit = size || 100
    const currentPage = page || 1

    const query = this.supplierRepository
      .createQueryBuilder('supplier')
      .where('supplier.isDeleted = false')
      .take(limit)
      .skip((currentPage - 1) * limit)
      .orderBy('supplier.createdAt', 'DESC')

    if (search) {
      query.andWhere(
        '(supplier.name ILIKE :search OR supplier.contactName ILIKE :search OR supplier.phone ILIKE :search OR supplier.email ILIKE :search)',
        { search: `%${search}%` },
      )
    }

    const [data, total] = await query.getManyAndCount()
    const pagination: IPaginationParams = {
      total,
      page: currentPage,
      size: limit,
    }
    return { data, pagination }
  }

  async createSupplier(supplier: Partial<Supplier>): Promise<Supplier> {
    const newSupplier = this.supplierRepository.create(supplier)
    await this.supplierRepository.save(newSupplier)
    return newSupplier
  }

  async updateSupplier(
    params: { id: number },
    supplier: Partial<SupplierEntity>,
  ): Promise<boolean> {
    const result = await this.supplierRepository.update(
      { id: params.id },
      supplier,
    )
    return (result.affected ?? 0) > 0
  }

  async deleteSupplier(params: { id: number }): Promise<boolean> {
    try {
      const result = await this.supplierRepository.update(
        { id: params.id },
        { isDeleted: true },
      )
      return (result.affected ?? 0) > 0
    } catch {
      return false
    }
  }

  async findSupplierById(id: number): Promise<SupplierEntity | null> {
    const supplier = await this.supplierRepository.findOne({
      where: { id, isDeleted: false },
      select: DEFAULT_SELECT_FIELDS,
    })
    return supplier || null
  }
}
