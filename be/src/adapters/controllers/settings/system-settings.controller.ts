import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { CheckPolicies } from '@adapters/controllers/common/decorators/check-policies.decorator'
import { JwtAuthGuard } from '@adapters/controllers/common/guards/jwt-auth.guard'
import { PoliciesGuard } from '@adapters/controllers/common/guards/policies.guard'

import { SystemSettingsService } from '@infrastructure/services/settings/system-settings.service'

import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto'

@Controller('admin/settings')
@ApiTags('System settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class SystemSettingsController {
  constructor(private readonly settingsService: SystemSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get shared payment and store settings' })
  @CheckPolicies({ action: 'read', subject: 'SystemSetting' })
  async getSettings() {
    return this.settingsService.getSettings()
  }

  @Put()
  @ApiOperation({ summary: 'Update shared payment and store settings' })
  @CheckPolicies({ action: 'update', subject: 'SystemSetting' })
  async updateSettings(@Body() dto: UpdateSystemSettingsDto) {
    return this.settingsService.updateSettings(dto)
  }
}
