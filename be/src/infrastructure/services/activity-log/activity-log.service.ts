import { Injectable } from '@nestjs/common'

import {
  ACTIVITY_LOG_SERVICE,
  IActivityLogService,
} from '@domain/services/activity-log.service.interface'

import { ActivityLogRepository } from '@infrastructure/databases/postgresql/repositories/activity-log.repository'

@Injectable()
export class ActivityLogService implements IActivityLogService {
  constructor(private readonly repository: ActivityLogRepository) {}

  async record(
    payload: Parameters<IActivityLogService['record']>[0],
  ): Promise<void> {
    await this.repository.createLog(payload)
  }
}

export const ActivityLogServiceProvider = {
  provide: ACTIVITY_LOG_SERVICE,
  useClass: ActivityLogService,
}
