export const ACTIVITY_LOG_SERVICE = 'ACTIVITY_LOG_SERVICE'

export interface IActivityLogService {
  record(payload: {
    actorId?: number
    actorName: string
    actorRole?: string
    action: string
    resourceType: string
    resourceId?: string
    description?: string
    metadata?: Record<string, unknown>
    ipAddress?: string
  }): Promise<void>
}
