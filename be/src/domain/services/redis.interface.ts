export const REDIS_SERVICE = 'REDIS_SERVICE'
export const REDIS_CLIENT = 'REDIS_CLIENT'
export interface IRedisCacheService {
  getValue<T>(key: string): Promise<T | null>
  setValue<T>(key: string, value: T, ttl?: number): Promise<void>
  delValue(key: string): Promise<void>
}
