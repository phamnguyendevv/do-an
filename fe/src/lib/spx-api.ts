import { apiRequest } from './api-client'
import type { ShippingStatus } from '@/types'

export interface SpxCheckpoint {
  time: string
  timeFormatted: string
  status: string
  description: string
  location?: string
}

export interface SpxTrackingResult {
  success: boolean
  trackingCode: string
  carrier: string
  carrierUrl: string
  status: string
  statusText: string
  statusCode?: string | number
  source: 'SPX_API' | 'SYSTEM_ESTIMATE' | 'NOT_FOUND'
  isDelivered: boolean
  isReturned: boolean
  isCancelled: boolean
  isShipping: boolean
  checkpoints: SpxCheckpoint[]
  order?: {
    id: number
    orderCode: string
    customerName: string
    customerPhone: string
    customerAddress: string
    subtotal: number
    shippingFee: number
    total: number
    payment: string
    status: string
    shippingMethod: string
    trackingCode?: string
    note?: string
    items: any[]
    createdAt: string
    updatedAt: string
  } | null
  message?: string
}

export const spxApi = {
  /**
   * Tra cứu thông tin vận đơn SPX theo mã tracking (hoặc mã đơn hàng)
   */
  async trackOrder(trackingCode: string): Promise<SpxTrackingResult> {
    const clean = (trackingCode || '').trim()
    if (!clean) {
      throw new Error('Vui lòng nhập mã vận đơn SPX')
    }
    return apiRequest<SpxTrackingResult>(`/shipping/spx/track/${encodeURIComponent(clean)}`)
  },

  /**
   * Đồng bộ trạng thái đơn hàng từ SPX vào cơ sở dữ liệu
   */
  async syncOrderStatus(trackingCode: string): Promise<{
    updated: boolean
    orderCode?: string
    oldStatus?: string
    newStatus?: string
    message: string
  }> {
    const clean = (trackingCode || '').trim()
    return apiRequest(`/shipping/spx/sync/${encodeURIComponent(clean)}`, {
      method: 'POST',
    })
  },
}

/**
 * Chuyển đổi trạng thái SPX sang ShippingStatus chuẩn của giao diện
 */
export function mapSpxStatus(spxStatus: string): ShippingStatus {
  const s = (spxStatus || '').toUpperCase()
  if (s === '5' || s === 'DELIVERED') return 'DELIVERED'
  if (s === '6' || s === 'DELIVERY_FAILED') return 'FAILED'
  if (s === '7' || s === 'RETURNED' || s === 'RETURNING') return 'RETURNED'
  if (s === '8' || s === 'CANCELLED') return 'CANCELLED'
  if (s === '4' || s === 'OUT_FOR_DELIVERY' || s === 'DELIVERING') return 'OUT_FOR_DELIVERY'
  if (s === '3' || s === 'IN_TRANSIT') return 'IN_TRANSIT'
  if (s === '2' || s === 'PICKED_UP') return 'PICKED_UP'
  if (s === '1' || s === 'ORDER_CREATED') return 'WAITING_PICKUP'
  return 'IN_TRANSIT'
}
