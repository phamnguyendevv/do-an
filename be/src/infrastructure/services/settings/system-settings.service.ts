import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Repository } from 'typeorm'

import { EnvironmentConfigService } from '@infrastructure/config/environment/environment-config.service'
import { SystemSetting } from '@infrastructure/databases/postgresql/entities/system-setting.entity'
import type { SystemSettingValue } from '@infrastructure/databases/postgresql/entities/system-setting.entity'

export type SystemSettingsData = SystemSettingValue

type StoredSystemSettings = {
  sepay?: Partial<SystemSettingsData['sepay']>
  branding?: Partial<SystemSettingsData['branding']>
}

@Injectable()
export class SystemSettingsService {
  private readonly settingsId = 'global'

  constructor(
    @InjectRepository(SystemSetting)
    private readonly repository: Repository<SystemSetting>,
    private readonly environmentConfig: EnvironmentConfigService,
  ) {}

  async getSettings(): Promise<SystemSettingsData> {
    const record = await this.repository.findOneBy({ id: this.settingsId })
    const stored = record?.value as StoredSystemSettings | undefined
    const defaults = this.getDefaults()

    return {
      sepay: { ...defaults.sepay, ...stored?.sepay },
      branding: { ...defaults.branding, ...stored?.branding },
    }
  }

  async updateSettings(updates: {
    sepay?: Partial<SystemSettingsData['sepay']>
    branding?: Partial<SystemSettingsData['branding']>
  }): Promise<SystemSettingsData> {
    const current = await this.getSettings()
    const settings: SystemSettingsData = {
      sepay: { ...current.sepay, ...updates.sepay },
      branding: { ...current.branding, ...updates.branding },
    }
    await this.repository.save({
      id: this.settingsId,
      value: settings,
    })
    return settings
  }

  async getSepaySettings(): Promise<SystemSettingsData['sepay']> {
    return (await this.getSettings()).sepay
  }

  private getDefaults(): SystemSettingsData {
    return {
      sepay: {
        bank: this.environmentConfig.getSepayBank(),
        accountNumber: this.environmentConfig.getSepayAccount(),
        accountName: this.environmentConfig.getSepayAccountName(),
        qrTemplate: 'compact',
      },
      branding: {
        storeName: 'NHÀ SÁCH BOOKSTOCK',
        address: 'Số 123 Đường Sách, Q.1, TP. Hồ Chí Minh',
        hotline: '1900 6868',
        website: 'bookstock.vn',
        footerNote: 'Xin cảm ơn Quý khách & Hẹn gặp lại!',
      },
    }
  }
}
