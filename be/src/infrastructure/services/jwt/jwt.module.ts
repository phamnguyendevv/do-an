import { Module } from '@nestjs/common'
import {
  JwtModule as JwtBaseModule,
  JwtService as JwtBaseService,
} from '@nestjs/jwt'

import { JWT_SERVICE } from '@domain/services/jwt.interface'

import {
  EnvironmentConfigModule,
  EnvironmentConfigService,
} from '@infrastructure/config/environment/environment-config.module'

import { JwtService } from './jwt.service'

@Module({
  imports: [
    JwtBaseModule.registerAsync({
      imports: [EnvironmentConfigModule],
      inject: [EnvironmentConfigService],
      useFactory: (env: EnvironmentConfigService) => ({
        secret: env.getJwtSecret(),
      }),
    }),
    EnvironmentConfigModule,
  ],
  providers: [
    JwtBaseService,
    {
      provide: JWT_SERVICE,
      useClass: JwtService,
    },
  ],
  exports: [JWT_SERVICE],
})
export class JwtModule {}
