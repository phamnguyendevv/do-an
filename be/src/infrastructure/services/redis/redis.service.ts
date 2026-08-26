import { Inject, Injectable } from '@nestjs/common'

import Redis from 'ioredis'

import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IRedisCacheService,
  REDIS_CLIENT,
} from '@domain/services/redis.interface'

@Injectable()
export class RedisService implements IRedisCacheService {
  constructor(
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
  ) {}

  async getValue<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redisClient.get(key)
      return value ? JSON.parse(value) : null
    } catch {
      throw this.exceptionsService.internalServerErrorException({
        type: 'RedisGetError',
        message: `Failed to get value from cache for key: ${key}`,
      })
    }
  }
  async setValue<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const ttls = ttl || 60
      await this.redisClient.set(key, JSON.stringify(value), 'EX', ttls)
    } catch {
      throw this.exceptionsService.internalServerErrorException({
        type: 'RedisSetError',
        message: `Failed to set value in cache for key: ${key}`,
      })
    }
  }
  async delValue(key: string): Promise<void> {
    try {
      await this.redisClient.del(key)
    } catch {
      throw this.exceptionsService.internalServerErrorException({
        type: 'RedisDeleteError',
        message: `Failed to delete value from cache for key: ${key}`,
      })
    }
  }
}
