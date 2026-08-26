import { Global, Module } from '@nestjs/common'

import Redis from 'ioredis'

import { REDIS_CLIENT, REDIS_SERVICE } from '@domain/services/redis.interface'

import { ExceptionsModule } from '@infrastructure/exceptions/exceptions.module'

import { RedisService } from './redis.service'

@Global()
@Module({
  imports: [ExceptionsModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        return new Redis(
          'redis://default:SsrVXI2aTA6UuUdFBH0KOCSHLdJ6nP0o@redis-16947.c245.us-east-1-3.ec2.redns.redis-cloud.com:16947',
        )
      },
    },
    {
      provide: REDIS_SERVICE,
      useClass: RedisService,
    },
  ],
  exports: [REDIS_CLIENT, REDIS_SERVICE],
})
export class RedisModule {}
