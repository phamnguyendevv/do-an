import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Like, Repository } from 'typeorm'

import { StockAuditEntity } from '@domain/entities/stock-audit.entity'
import { IStockAuditRepositoryInterface } from '@domain/repositories/stock-audit.repository.interface'

import { StockAudit } from '../entities/stock-audit.entity'

@Injectable()
export class StockAuditRepository implements IStockAuditRepositoryInterface {
  constructor(
    @InjectRepository(StockAudit)
    private readonly auditRepository: Repository<StockAudit>,
  ) {}

  async createAudit(
    audit: Partial<StockAuditEntity>,
  ): Promise<StockAuditEntity> {
    const created = this.auditRepository.create(audit)
    return await this.auditRepository.save(created)
  }

  async getAudits(params?: {
    page?: number
    size?: number
    status?: string
    search?: string
  }): Promise<{
    data: StockAuditEntity[]
    pagination: { total: number; page: number; size: number }
  }> {
    const page = params?.page || 1
    const size = params?.size || 50
    const skip = (page - 1) * size

    const where: any = {}
    if (params?.status && params.status !== 'all') {
      where.status = params.status
    }
    if (params?.search) {
      where.title = Like(`%${params.search}%`)
    }

    const [data, total] = await this.auditRepository.findAndCount({
      where,
      skip,
      take: size,
      order: { createdAt: 'DESC' },
    })

    return {
      data,
      pagination: { total, page, size },
    }
  }

  async getAuditById(id: number): Promise<StockAuditEntity | null> {
    return await this.auditRepository.findOne({ where: { id } })
  }

  async updateAudit(
    id: number,
    payload: Partial<StockAuditEntity>,
  ): Promise<StockAuditEntity> {
    await this.auditRepository.update(id, payload as any)
    const updated = await this.getAuditById(id)
    if (!updated) throw new Error('Stock audit not found after update')
    return updated
  }
}
