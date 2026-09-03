import { apiRequest } from './api-client'

export type PromotionApiItem = {
  id: number
  code: string
  name: string
  discountType: 'PERCENTAGE' | 'FIXED'
  discountValue: number
  minOrderValue: number
  maxDiscount?: number
  usageLimit?: number
  usedCount: number
  startsAt: string
  endsAt: string
  isActive: boolean
  note?: string
}

export const promotionApi = {
  list(params?: { search?: string; page?: number; size?: number }) {
    const query = new URLSearchParams()
    if (params?.search) query.set('search', params.search)
    if (params?.page) query.set('page', String(params.page))
    if (params?.size) query.set('size', String(params.size))
    const qs = query.toString()
    return apiRequest<{ data: PromotionApiItem[]; pagination: { total: number; page: number; size: number } }>(`/admin/promotions${qs ? `?${qs}` : ''}`)
  },
  create(payload: Partial<PromotionApiItem>) { return apiRequest<PromotionApiItem>('/admin/promotions', { method: 'POST', body: JSON.stringify(payload) }) },
  update(id: number, payload: Partial<PromotionApiItem>) { return apiRequest<PromotionApiItem>(`/admin/promotions/${id}`, { method: 'PUT', body: JSON.stringify(payload) }) },
  remove(id: number) { return apiRequest<boolean>(`/admin/promotions/${id}`, { method: 'DELETE' }) },
  validate(code: string, orderValue: number) { return apiRequest<{ valid: boolean; discount: number }>(`/admin/promotions/validate`, { method: 'POST', body: JSON.stringify({ code, orderValue }) }) },
}
