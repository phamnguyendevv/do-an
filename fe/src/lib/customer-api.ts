import { apiRequest } from './api-client'

export type CustomerApiItem = {
  id: number
  name: string
  phone: string
  email?: string
  address?: string
  note?: string
  totalOrders: number
  totalSpent: number
  lastOrderAt?: string
}

export const customerApi = {
  list(params?: { search?: string; page?: number; size?: number }) {
    const query = new URLSearchParams()
    if (params?.search) query.set('search', params.search)
    if (params?.page) query.set('page', String(params.page))
    if (params?.size) query.set('size', String(params.size))
    const qs = query.toString()
    return apiRequest<{ data: CustomerApiItem[]; pagination: { total: number; page: number; size: number } }>(`/admin/customers${qs ? `?${qs}` : ''}`)
  },
  create(payload: Partial<CustomerApiItem>) { return apiRequest<CustomerApiItem>('/admin/customers', { method: 'POST', body: JSON.stringify(payload) }) },
  update(id: number, payload: Partial<CustomerApiItem>) { return apiRequest<CustomerApiItem>(`/admin/customers/${id}`, { method: 'PUT', body: JSON.stringify(payload) }) },
  remove(id: number) { return apiRequest<boolean>(`/admin/customers/${id}`, { method: 'DELETE' }) },
}
