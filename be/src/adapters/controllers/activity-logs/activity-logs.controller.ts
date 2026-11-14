import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Repository } from 'typeorm'

import { ActivityLog } from '@infrastructure/databases/postgresql/entities/activity-log.entity'

import { CheckPolicies } from '../common/decorators/check-policies.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { PoliciesGuard } from '../common/guards/policies.guard'
import { ListActivityLogsDto } from './dto/activity-log.dto'

@Controller('admin/activity-logs')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class ActivityLogsController {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly repository: Repository<ActivityLog>,
  ) {}

  @Get()
  @CheckPolicies({ action: 'read', subject: 'ActivityLog' })
  async list(@Query() query: ListActivityLogsDto) {
    const page = Number(query.page) || 1
    const size = Number(query.size) || 20
    const queryBuilder = this.repository
      .createQueryBuilder('log')
      .select([
        'log.id',
        'log.actorId',
        'log.actorName',
        'log.actorRole',
        'log.action',
        'log.resourceType',
        'log.resourceId',
        'log.description',
        'log.ipAddress',
        'log.createdAt',
      ])
      .orderBy('log.createdAt', 'DESC')
      .take(size)
      .skip((page - 1) * size)
    if (query.action)
      queryBuilder.andWhere('log.action = :action', { action: query.action })
    if (query.resourceType)
      queryBuilder.andWhere('log.resourceType = :resourceType', {
        resourceType: query.resourceType,
      })
    if (query.search)
      queryBuilder.andWhere(
        '(log.description ILIKE :search OR log.actorName ILIKE :search)',
        { search: `%${query.search}%` },
      )
    const [data, total] = await queryBuilder.getManyAndCount()
    return { data, pagination: { total, page, size } }
  }
}
