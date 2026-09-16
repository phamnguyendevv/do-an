import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { ActivityLogsController } from '@adapters/controllers/activity-logs/activity-logs.controller'

import { ActivityLog } from '@infrastructure/databases/postgresql/entities/activity-log.entity'

@Module({
  imports: [TypeOrmModule.forFeature([ActivityLog])],
  controllers: [ActivityLogsController],
})
export class ActivityLogsModule {}
