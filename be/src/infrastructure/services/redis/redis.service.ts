import { Inject, Injectable, Logger } from '@nestjs/common'

import Redis from 'ioredis'

import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IRedisCacheService,
  REDIS_CLIENT,
} from '@domain/services/redis.interface'

@Injectable()
export class RedisService implements IRedisCacheService {
  private readonly logger = new Logger(RedisService.name)

  constructor(
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
  ) {}

  async getValue<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redisClient.get(key)
      return value ? JSON.parse(value) : null
    } catch (err: any) {
      this.logger.warn(`Redis get error for key "${key}": ${err?.message || err}`)
      return null
    }
  }

  async setValue<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const ttls = ttl || 60
      await this.redisClient.set(key, JSON.stringify(value), 'EX', ttls)
    } catch (err: any) {
      this.logger.warn(`Redis set error for key "${key}": ${err?.message || err}`)
    }
  }

  async delValue(key: string): Promise<void> {
    try {
      await this.redisClient.del(key)
    } catch (err: any) {
      this.logger.warn(`Redis del error for key "${key}": ${err?.message || err}`)
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const stream = this.redisClient.scanStream({
        match: pattern,
        count: 100,
      })

      const keys: string[] = []
      for await (const resultKeys of stream) {
        if (resultKeys && resultKeys.length > 0) {
          keys.push(...resultKeys)
        }
      }

      if (keys.length > 0) {
        const chunkSize = 100
        for (let i = 0; i < keys.length; i += chunkSize) {
          const chunk = keys.slice(i, i + chunkSize)
          await this.redisClient.del(...chunk)
        }
        this.logger.log(`Deleted ${keys.length} keys matching pattern: ${pattern}`)
      }
    } catch (err: any) {
      this.logger.warn(`Redis delPattern error for pattern "${pattern}": ${err?.message || err}`)
    }
  }
}

