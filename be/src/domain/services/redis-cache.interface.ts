export const CACHE__SERVICE = 'CACHE_SERVICE'
export interface IRedisCacheService {
  getValue<T>(key: string): Promise<T | null>
  setValue<T>(key: string, value: T, ttl?: number): Promise<void>
}
