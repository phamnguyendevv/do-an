import { Repository } from 'typeorm'

import { EnvironmentConfigService } from '@infrastructure/config/environment/environment-config.service'
import { SystemSetting } from '@infrastructure/databases/postgresql/entities/system-setting.entity'
import { SystemSettingsService } from '@infrastructure/services/settings/system-settings.service'

describe('SystemSettingsService', () => {
  let repository: jest.Mocked<
    Pick<Repository<SystemSetting>, 'findOneBy' | 'save'>
  >
  let service: SystemSettingsService

  beforeEach(() => {
    repository = {
      findOneBy: jest.fn(),
      save: jest.fn(),
    }
    service = new SystemSettingsService(
      repository as unknown as Repository<SystemSetting>,
      {
        getSepayBank: jest.fn().mockReturnValue('MBBank'),
        getSepayAccount: jest.fn().mockReturnValue('123456'),
        getSepayAccountName: jest.fn().mockReturnValue('BookStock'),
      } as unknown as EnvironmentConfigService,
    )
  })

  it('uses backend environment defaults when no saved settings exist', async () => {
    repository.findOneBy.mockResolvedValue(null)

    await expect(service.getSettings()).resolves.toEqual({
      sepay: {
        bank: 'MBBank',
        accountNumber: '123456',
        accountName: 'BookStock',
        qrTemplate: 'compact',
      },
      branding: {
        storeName: 'NHÀ SÁCH BOOKSTOCK',
        address: 'Số 123 Đường Sách, Q.1, TP. Hồ Chí Minh',
        hotline: '1900 6868',
        website: 'bookstock.vn',
        footerNote: 'Xin cảm ơn Quý khách & Hẹn gặp lại!',
      },
    })
  })

  it('merges updates with saved settings and persists the shared configuration', async () => {
    repository.findOneBy.mockResolvedValue({
      id: 'global',
      value: {
        sepay: {
          bank: 'MBBank',
          accountNumber: '123456',
          accountName: 'BookStock',
          qrTemplate: 'compact',
        },
        branding: {
          storeName: 'Old name',
          address: 'Address',
          hotline: '1900',
          website: 'example.com',
          footerNote: 'Thanks',
        },
      },
      updatedAt: new Date(),
    })
    repository.save.mockResolvedValue({} as SystemSetting)

    await expect(
      service.updateSettings({ branding: { storeName: 'New name' } }),
    ).resolves.toMatchObject({
      branding: { storeName: 'New name', website: 'example.com' },
      sepay: { accountNumber: '123456' },
    })
    expect(repository.save).toHaveBeenCalledWith({
      id: 'global',
      value: expect.objectContaining({
        branding: expect.objectContaining({ storeName: 'New name' }),
        sepay: expect.objectContaining({ accountNumber: '123456' }),
      }),
    })
  })
})
