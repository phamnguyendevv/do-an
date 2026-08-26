import {
  MailerOptions,
  MailerModule as NestMailerModule,
} from '@nestjs-modules/mailer'
import { Module } from '@nestjs/common'

import { EXCEPTIONS } from '@domain/exceptions/exceptions.interface'

import {
  EnvironmentConfigModule,
  EnvironmentConfigService,
} from '@infrastructure/config/environment/environment-config.module'
import { ExceptionsModule } from '@infrastructure/exceptions/exceptions.module'
import { ExceptionsService } from '@infrastructure/exceptions/exceptions.service'

import { StripeModule } from '../stripe/stripe.module'
import { NodeMailerService } from './mailer.service'

@Module({
  imports: [
    EnvironmentConfigModule,
    StripeModule,
    NestMailerModule,
    ExceptionsModule,
    NestMailerModule.forRootAsync({
      imports: [EnvironmentConfigModule],
      inject: [EnvironmentConfigService],
      useFactory: (configService: EnvironmentConfigService): MailerOptions => ({
        transport: {
          host: configService.getHostNodeMailer(),
          port: configService.getPortNodeMailer(),
          secure: false,
          auth: {
            user: configService.getEmailUsername(),
            pass: configService.getEmailPassword(),
          },
        },
        defaults: {
          from: `"No Reply" <${configService.getEmailUsername()}>`,
        },
      }),
    }),
  ],
  providers: [
    NodeMailerService,
    {
      provide: EXCEPTIONS,
      useClass: ExceptionsService,
    },
  ],
  exports: [NodeMailerService],
})
export class MailerModule {}
