import type { AnalyzedData, OrderDraft } from '../types/assistant'
import {
  inferProvinceFromAddressText,
  isWardDistrictDuplicate,
  normalizeVnText,
  sanitizeCrossProvinceGeo,
  stripAdminPrefixes,
} from './spx-address'

export { inferProvinceFromAddressText }

/**
 * Chuẩn hóa & ghép nối địa chỉ người nhận, tự động khử trùng lặp (ví dụ: tránh bị "Đức Hòa, Đức Hòa").
 */
export function formatCleanCustomerAddress(
  detail?: string,
  ward?: string,
  district?: string,
  province?: string,
): string {
  const parts: string[] = []

  const cleanDetail = (detail || '').trim()
  const cleanWard = (ward || '').trim()
  const cleanDistrict = (district || '').trim()
  const cleanProvince = (province || '').trim()

  const norm = (s: string) => normalizeVnText(stripAdminPrefixes(s))

  if (cleanDetail) {
    parts.push(cleanDetail)
  }

  const normWard = norm(cleanWard)
  const normDist = norm(cleanDistrict)
  const wardDistDuplicated = isWardDistrictDuplicate(cleanWard, cleanDistrict)

  if (cleanWard) {
    const lastPart = parts.length > 0 ? norm(parts[parts.length - 1]) : ''
    if (!lastPart.includes(normWard)) {
      parts.push(cleanWard)
    }
  }

  if (cleanDistrict && !wardDistDuplicated) {
    const lastPart = parts.length > 0 ? norm(parts[parts.length - 1]) : ''
    if (!lastPart.includes(normDist)) {
      parts.push(cleanDistrict)
    }
  }

  if (cleanProvince) {
    const normProv = norm(cleanProvince)
    const lastPart = parts.length > 0 ? norm(parts[parts.length - 1]) : ''
    if (!lastPart.includes(normProv)) {
      parts.push(cleanProvince)
    }
  }

  return parts.join(', ')
}

/**
 * Tạo OrderDraft mới từ kết quả phân tích AI và bản nháp hiện tại.
 */
export function buildOrderDraftFromAnalysis(
  data: AnalyzedData,
  prev: OrderDraft,
  chatText: string,
  zaloName: string,
  zaloPhone: string,
): OrderDraft {
  const c = data.customer || {}
  const fullAddress = formatCleanCustomerAddress(c.detailAddress, c.ward, c.district, c.province)

  let totalCod = Number(data.totalCod || 0)
  if (totalCod > 0 && totalCod < 1000) totalCod *= 1000

  if (!totalCod || totalCod <= 0) {
    const sumText = `${data.summary || ''}`
    const m = sumText.match(
      /(?:thành|tổng cộng|tổng là|tổng|chốt|cộng.*?thành|thu hộ|cod)[:\s]*(\d+)\s*(k|nghìn|ngàn)?/i,
    )
    if (m) {
      let val = Number(m[1])
      if (m[2] || val < 1000) val *= 1000
      if (val >= 10000) totalCod = val
    }
  }

  if (!totalCod || totalCod <= 0) {
    totalCod =
      (data.items || []).reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0) +
      (Number(data.shippingFee) || 0)
  }

  let inferredProv = c.province || ''
  if (!inferredProv || inferredProv === 'null' || inferredProv === '(Chưa có)') {
    const fullAddrLower = `${c.district || ''} ${c.ward || ''} ${c.detailAddress || ''} ${fullAddress} ${chatText}`
    inferredProv = inferProvinceFromAddressText(fullAddrLower) || inferredProv
  }

  const isSameCustomer = Boolean(
    (c.phone && prev.phone && c.phone === prev.phone) ||
      (c.customerName && prev.customerName && c.customerName === prev.customerName),
  )

  const checkAddr = (fullAddress || c.rawAddress || '').toLowerCase()
  const rawWard =
    c.ward || (isSameCustomer && checkAddr.includes((prev.ward || '').toLowerCase()) ? prev.ward : '')
  const rawDistrict =
    c.district ||
    (isSameCustomer && checkAddr.includes((prev.district || '').toLowerCase()) ? prev.district : '')
  const targetDetail = c.detailAddress || (isSameCustomer ? prev.detailAddress : '')

  const { ward: targetWard, district: targetDistrict } = sanitizeCrossProvinceGeo(
    inferredProv,
    rawDistrict,
    rawWard,
  )

  const calculatedType =
    c.addressType ||
    (targetDistrict || fullAddress.toLowerCase().includes('quận') || fullAddress.toLowerCase().includes('huyện')
      ? 'OLD_3_LEVEL'
      : 'NEW_2_LEVEL')

  return {
    customerName: c.customerName || zaloName || (isSameCustomer ? prev.customerName : ''),
    phone: c.phone || zaloPhone || (isSameCustomer ? prev.phone : ''),
    address: fullAddress || c.rawAddress || (isSameCustomer ? prev.address : ''),
    province: inferredProv || (isSameCustomer ? prev.province : ''),
    district: targetDistrict,
    ward: targetWard,
    detailAddress: targetDetail,
    codAmount: totalCod,
    weightGram: prev.weightGram > 0 ? prev.weightGram : 1000,
    notes: data.summary || (isSameCustomer ? prev.notes : ''),
    addressType: calculatedType,
  }
}
