import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import Stripe from 'stripe'

import {
  STRIPE_CLIENT,
  STRIPE_SERVICE,
} from '@domain/services/stripe.interface'

import { EnvironmentConfigModule } from '@infrastructure/config/environment/environment-config.module'
import { EnvironmentConfigService } from '@infrastructure/config/environment/environment-config.service'
import { ExceptionsModule } from '@infrastructure/exceptions/exceptions.module'

import { StripeService } from './stripe.service'

@Module({
  imports: [ConfigModule.forRoot(), EnvironmentConfigModule, ExceptionsModule],
  // controllers: [StripeController],
  providers: [
    {
      provide: STRIPE_CLIENT,
      inject: [EnvironmentConfigService],
      useFactory: (configService: EnvironmentConfigService) => {
        const secretKey = configService.getStripeSecretKey()
        return new Stripe(secretKey)
      },
    },
    {
      provide: STRIPE_SERVICE,
      useClass: StripeService,
    },
  ],
  exports: [STRIPE_SERVICE, STRIPE_CLIENT],
})
export class StripeModule {}
