import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ActivityLog } from '@infrastructure/databases/postgresql/entities/activity-log.entity'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { PoliciesGuard } from '../common/guards/policies.guard'
import { CheckPolicies } from '../common/decorators/check-policies.decorator'
import { ListActivityLogsDto } from './dto/activity-log.dto'

@Controller('admin/activity-logs')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class ActivityLogsController {
  constructor(@InjectRepository(ActivityLog) private readonly repository: Repository<ActivityLog>) {}

  @Get()
  @CheckPolicies({ action: 'read', subject: 'ActivityLog' })
  async list(@Query() query: ListActivityLogsDto) {
    const page = query.page || 1
    const size = query.size || 50
    const queryBuilder = this.repository.createQueryBuilder('log').orderBy('log.created_at', 'DESC').take(size).skip((page - 1) * size)
    if (query.action) queryBuilder.andWhere('log.action = :action', { action: query.action })
    if (query.resourceType) queryBuilder.andWhere('log.resource_type = :resourceType', { resourceType: query.resourceType })
    if (query.search) queryBuilder.andWhere('(log.description ILIKE :search OR log.actor_name ILIKE :search)', { search: `%${query.search}%` })
    const [data, total] = await queryBuilder.getManyAndCount()
    return { data, pagination: { total, page, size } }
  }
}
