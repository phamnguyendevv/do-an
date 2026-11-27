import type { AddressVerificationResult, AnalyzedData } from '../types/assistant'

/**
 * Unwrap lớp ngoài của NestJS ResponseInterceptor (`{ data: ... }`).
 */
export function unwrapResponseEnvelope<T = any>(json: any): T | null {
  if (!json || typeof json !== 'object') return null
  if ('data' in json && json.data !== undefined && json.data !== null) {
    return json.data as T
  }
  return json as T
}

/**
 * Unwrap lớp ngoài `{ data: { success, data } }` của AssistantController.
 */
function unwrapAssistantPayload(json: Record<string, any>): Record<string, any> {
  return json.data &&
    typeof json.data === 'object' &&
    ('success' in json.data || 'data' in json.data)
    ? json.data
    : json
}

function formatApiErrorMessage(rawErr: unknown, fallback: string): string {
  if (!rawErr) return fallback
  if (typeof rawErr === 'string') return rawErr
  if (Array.isArray(rawErr)) return rawErr.join(', ')
  if (typeof rawErr === 'object') {
    const msg = (rawErr as Record<string, any>).message
    return typeof msg === 'string' ? msg : JSON.stringify(rawErr)
  }
  return String(rawErr)
}

/**
 * Unwrap kết quả API `/api/assistant/analyze-chat`.
 */
export function unwrapAnalyzeChatResponse(
  json: any,
  resOk: boolean,
): { ok: boolean; data?: AnalyzedData; errorMessage?: string } {
  if (!json || typeof json !== 'object') {
    return { ok: false, errorMessage: 'Phản hồi máy chủ không hợp lệ.' }
  }

  const inner = unwrapAssistantPayload(json)
  const isSuccess = inner?.success !== undefined ? Boolean(inner.success) : resOk
  const resultData = inner?.data || json?.data

  if (
    resOk &&
    isSuccess &&
    resultData &&
    typeof resultData === 'object' &&
    !('error' in resultData && !resultData.intent)
  ) {
    return { ok: true, data: resultData as AnalyzedData }
  }

  const rawErr =
    inner?.error ||
    json?.error?.message ||
    (typeof json?.error === 'string' ? json.error : null) ||
    json?.message

  return {
    ok: false,
    errorMessage: formatApiErrorMessage(rawErr, 'Lỗi khi phân tích hội thoại.'),
  }
}

/**
 * Unwrap kết quả API `/api/assistant/verify-address` qua ResponseInterceptor 2 tầng.
 */
export function unwrapVerifyAddressResponse(json: any): AddressVerificationResult | null {
  if (!json || typeof json !== 'object') return null

  const inner = unwrapAssistantPayload(json)
  if (inner?.success === false) {
    return null
  }

  const candidate = inner?.data || (inner?.province || inner?.overviewAi ? inner : null)
  if (candidate && typeof candidate === 'object' && (candidate.province || candidate.overviewAi)) {
    return candidate as AddressVerificationResult
  }

  return null
}

/**
 * Unwrap kết quả API `/api/assistant/create-order`.
 */
export function unwrapCreateOrderResponse(json: any): {
  orderCode?: string
  trackingCode?: string | null
  order?: Record<string, any>
  errorMessage?: string
} {
  if (!json || typeof json !== 'object') {
    return { errorMessage: 'Phản hồi máy chủ không hợp lệ.' }
  }

  const inner = unwrapAssistantPayload(json)
  const actualOrder = inner?.data || json?.data

  if (actualOrder && typeof actualOrder === 'object' && actualOrder.orderCode) {
    return {
      orderCode: actualOrder.orderCode,
      trackingCode: actualOrder.trackingCode || null,
      order: actualOrder,
    }
  }

  return {
    errorMessage: formatApiErrorMessage(
      json?.message || json?.error,
      'Không thể tạo đơn hàng trên máy chủ.',
    ),
  }
}

/**
 * Unwrap kết quả API `/api/v1/shipping/spx/track/:code` hoặc `/api/assistant/track-spx/:code`.
 */
export function unwrapTrackSpxResponse(json: any): Record<string, any> | null {
  const data = unwrapResponseEnvelope<Record<string, any>>(json)
  if (data && typeof data === 'object' && ('trackingCode' in data || 'status' in data || 'checkpoints' in data)) {
    return data
  }
  return null
}
