import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm'

export interface SystemSettingValue {
  sepay: {
    bank: string
    accountNumber: string
    accountName: string
    qrTemplate: 'compact' | 'compact2' | 'qr_only' | 'default'
  }
  branding: {
    storeName: string
    address: string
    hotline: string
    website: string
    footerNote: string
  }
}

@Entity('system_settings')
export class SystemSetting {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  public id!: string

  @Column({ type: 'jsonb' })
  public value!: SystemSettingValue

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public updatedAt!: Date
}
