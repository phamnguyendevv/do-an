import Redis from 'ioredis'

import { IException } from '@domain/exceptions/exceptions.interface'

import { RedisService } from '@infrastructure/services/redis/redis.service'

describe('RedisService', () => {
  it('clears matching in-memory entries when invalidating a key pattern', async () => {
    const redisClient = {
      get: jest.fn().mockRejectedValue(new Error('Redis unavailable')),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      scanStream: jest.fn(() => ({
        async *[Symbol.asyncIterator]() {
          yield ['books:list:page=1']
        },
      })),
    } as unknown as Redis
    const service = new RedisService({} as IException, redisClient)

    await service.setValue('books:list:page=1', { stock: 4 })
    await service.setValue('orders:list:page=1', { id: 'order-1' })

    await service.delPattern('books:*')

    await expect(service.getValue('books:list:page=1')).resolves.toBeNull()
    await expect(service.getValue('orders:list:page=1')).resolves.toEqual({
      id: 'order-1',
    })
  })
})
