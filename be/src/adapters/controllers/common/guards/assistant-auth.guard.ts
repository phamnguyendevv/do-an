import { ExecutionContext, Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

import { timingSafeEqual } from 'crypto'
import { Request } from 'express'

/**
 * Bảo vệ các endpoint /api/assistant/* bằng 1 trong 2 cơ chế:
 * 1. Header `x-api-key` khớp với `process.env.ASSISTANT_API_KEY` (dành cho Extension / tích hợp nội bộ)
 * 2. JWT hợp lệ (`Authorization: Bearer <token>` hoặc cookie `access_token`)
 */
@Injectable()
export class AssistantAuthGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>()
    const configuredKey = (process.env.ASSISTANT_API_KEY || '').trim()
    const rawHeader = request.headers['x-api-key']
    const providedKey = Array.isArray(rawHeader)
      ? rawHeader[0]?.trim()
      : (rawHeader || '').trim()

    if (configuredKey && providedKey) {
      const a = Buffer.from(configuredKey, 'utf8')
      const b = Buffer.from(providedKey, 'utf8')
      if (a.length === b.length && timingSafeEqual(a, b)) {
        return true
      }
    }

    return super.canActivate(context)
  }
}
