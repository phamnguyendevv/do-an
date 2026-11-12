import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { SystemSettingsController } from '@adapters/controllers/settings/system-settings.controller'

import { EnvironmentConfigModule } from '@infrastructure/config/environment/environment-config.module'
import { SystemSetting } from '@infrastructure/databases/postgresql/entities/system-setting.entity'
import { CaslModule } from '@infrastructure/services/casl/casl.module'
import { SystemSettingsService } from '@infrastructure/services/settings/system-settings.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemSetting]),
    EnvironmentConfigModule,
    CaslModule,
  ],
  controllers: [SystemSettingsController],
  providers: [SystemSettingsService],
  exports: [SystemSettingsService],
})
export class SystemSettingsModule {}
