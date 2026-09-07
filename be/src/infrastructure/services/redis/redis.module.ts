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
        const client = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD || undefined,
          lazyConnect: true,
          retryStrategy: (times) => {
            if (times > 2) return null
            return Math.min(times * 500, 2000)
          },
        })
        client.on('error', () => {
          // Gracefully suppress unhandled error event
        })
        return client
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
