import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { ILike, Repository } from 'typeorm'

import { ActivityLog } from '../entities/activity-log.entity'

@Injectable()
export class ActivityLogRepository {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly repository: Repository<ActivityLog>,
  ) {}

  async createLog(payload: Partial<ActivityLog>) {
    return this.repository.save(this.repository.create(payload))
  }

  async findLogs(query: {
    search?: string
    action?: string
    resourceType?: string
    page?: number
    size?: number
  }) {
    const page = query.page || 1
    const size = query.size || 50
    const where = {
      ...(query.action ? { action: query.action } : {}),
      ...(query.resourceType ? { resourceType: query.resourceType } : {}),
      ...(query.search ? { description: ILike(`%${query.search}%`) } : {}),
    }
    const [data, total] = await this.repository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: size,
      skip: (page - 1) * size,
    })
    return { data, pagination: { total, page, size } }
  }
}
