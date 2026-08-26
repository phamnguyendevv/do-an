import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { IAuth2Config } from '@domain/config/auth2.interface'
import { IDatabaseConfig } from '@domain/config/database.interface'
import { IJwtConfig } from '@domain/config/jwt.interface'
import { INodeMailerConfig } from '@domain/config/node-mailer.interface'

@Injectable()
export class EnvironmentConfigService
  implements IDatabaseConfig, IJwtConfig, INodeMailerConfig, IAuth2Config
{
  constructor(private readonly configService: ConfigService) {}

  getNodeEnv(): string {
    return this.configService.get<string>('NODE_ENV') || ''
  }

  getDatabaseEngine(): string {
    return this.configService.get<string>('DATABASE_ENGINE') || ''
  }

  getDatabaseHost(): string {
    return this.configService.get<string>('DATABASE_HOST') || ''
  }

  getDatabasePort(): number {
    return this.configService.get<number>('DATABASE_PORT') || 0
  }

  getDatabaseUser(): string {
    return this.configService.get<string>('DATABASE_USER') || ''
  }

  getDatabasePassword(): string {
    return this.configService.get<string>('DATABASE_PASSWORD') || ''
  }

  getDatabaseName(): string {
    return this.configService.get<string>('DATABASE_NAME') || ''
  }

  getDatabaseSchema(): string {
    return this.configService.get<string>('DATABASE_SCHEMA') || 'public'
  }

  getDatabaseSync(): boolean {
    return this.configService.get<boolean>('DATABASE_SYNCHRONIZE') || false
  }

  getJwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET') || ''
  }

  getJwtExpirationTime(): string {
    return this.configService.get<string>('JWT_EXPIRATION_TIME') || ''
  }

  getJwtRefreshSecret(): string {
    return this.configService.get<string>('JWT_REFRESH_SECRET') || ''
  }

  getMaintenanceMode(): boolean {
    return this.configService.get<boolean>('MAINTENANCE_MODE') || false
  }

  getMaintenanceMessage(): string | undefined {
    return this.configService.get<string>('MAINTENANCE_MESSAGE')
  }

  getJwtRefreshExpirationTime(): string {
    return this.configService.get<string>('JWT_REFRESH_EXPIRATION_TIME') || ''
  }

  getHostNodeMailer(): string {
    return this.configService.get<string>('NODEMAILER_HOST') || ''
  }
  getPortNodeMailer(): number {
    return this.configService.get<number>('NODEMAILER_PORT') || 587
  }

  getEmailUsername(): string {
    return this.configService.get<string>('EMAIL_USERNAME') || ''
  }
  getEmailPassword(): string {
    return this.configService.get<string>('EMAIL_PASSWORD') || ''
  }

  getClientUrl(): string {
    return this.configService.get<string>('GOOGLE_CALLBACK_URL') || ''
  }
  getGoogleClientId(): string {
    return this.configService.get<string>('GOOGLE_CLIENT_ID') || ''
  }
  getGoogleClientSecret(): string {
    return this.configService.get<string>('GOOGLE_CLIENT_SECRET') || ''
  }

  getStripeSecretKey(): string {
    return this.configService.get<string>('STRIPE_SECRET_KEY') || ''
  }

  getRedisUrl(): string {
    return this.configService.get<string>('REDIS_URL') || ''
  }

  getStripeWebhookSecret(): string {
    return this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || ''
  }
  getFEUrl(): string {
    return this.configService.get<string>('FRONTEND_URL') || ''
  }
}
