export interface SpxOrderItem {
  title: string
  quantity: number
  price: number
}

export interface SpxOrderData {
  recipientName: string
  recipientPhone: string
  address: string
  codAmount: number
  weightGram?: number
  weightKg?: number | string
  notes?: string
  addressType?: 'OLD_3_LEVEL' | 'NEW_2_LEVEL'
  province?: string
  district?: string
  ward?: string
  detailAddress?: string
  items?: SpxOrderItem[]
  productName?: string
  quantity?: number
  productPrice?: number
  linkedOrderCode?: string
  createdAt?: number
}

export interface ParsedSpxAddress {
  province: string
  district: string
  ward: string
  formattedWard: string
  detailAddress: string
  addressType: 'OLD_3_LEVEL' | 'NEW_2_LEVEL'
}

// Chuẩn hóa văn bản tiếng Việt: bỏ dấu tiếng Việt, chữ thường, bỏ ký tự đặc biệt
export function normalizeVnText(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Bỏ các tiền tố hành chính (cả có dấu và không dấu: quận, huyện, thị xã, phường, xã, tỉnh, thành phố...)
export function stripAdminPrefixes(str: string): string {
  if (!str) return ''
  return str
    .replace(
      /^(thành phố|tỉnh|thị xã|quận|huyện|phường|xã|thị trấn|thanh pho|tinh|thi xa|quan|huyen|phuong|xa|thi tran|tp\.?|q\.?|h\.?|p\.?|tx\.?|tt\.?)\s+/gi,
      '',
    )
    .trim()
}

// Chuẩn hóa tên tỉnh sang danh mục chính thức của Việt Nam / SPX
export function normalizeProvinceName(raw: string): string {
  const norm = normalizeVnText(raw)
  if (norm.includes('ho chi minh') || norm.includes('hcm') || norm.includes('sai gon') || norm.includes('tphcm')) {
    return 'Hồ Chí Minh'
  }
  if (norm.includes('ha noi') || norm.includes('hn')) {
    return 'Hà Nội'
  }
  if (norm.includes('da nang') || norm.includes('dn')) {
    return 'Đà Nẵng'
  }
  if (norm.includes('hai phong') || norm.includes('hp')) {
    return 'Hải Phòng'
  }
  if (norm.includes('can tho') || norm.includes('ct')) {
    return 'Cần Thơ'
  }
  if (norm.includes('thai nguyen')) {
    return 'Thái Nguyên'
  }
  return raw.replace(/^(tỉnh|thành phố|tp\.)\s+/i, '').trim()
}

export const HCM_DISTRICT_KEYWORDS = [
  'bình tân', 'bình thạnh', 'tân bình', 'tân phú', 'gò vấp', 'phú nhuận', 'thủ đức',
  'bình chánh', 'hóc môn', 'củ chi', 'nhà bè', 'cần giờ',
  'quận 1', 'quận 2', 'quận 3', 'quận 4', 'quận 5', 'quận 6', 'quận 7', 'quận 8', 'quận 9', 'quận 10', 'quận 11', 'quận 12',
  'q.1', 'q.2', 'q.3', 'q.4', 'q.5', 'q.6', 'q.7', 'q.8', 'q.9', 'q.10', 'q.11', 'q.12',
  'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12',
]

export const HN_DISTRICT_KEYWORDS = [
  'cầu giấy', 'đống đa', 'ba đình', 'hoàn kiếm', 'hai bà trưng', 'hoàng mai', 'thanh xuân',
  'long biên', 'nam từ liêm', 'bắc từ liêm', 'tây hồ', 'hà đông', 'thanh trì', 'gia lâm', 'đông anh', 'sóc sơn', 'hoài đức',
]

const HCM_EXTRA_WARD_KEYWORDS = ['binh tri dong', 'ben nghe', 'tan dinh', 'binh hung hoa']

export function isHcmAdminName(str: string): boolean {
  const s = normalizeVnText(str)
  if (!s) return false
  return (
    HCM_DISTRICT_KEYWORDS.some((k) => s.includes(normalizeVnText(k))) ||
    HCM_EXTRA_WARD_KEYWORDS.some((w) => s.includes(w))
  )
}

export function isHnAdminName(str: string): boolean {
  const s = normalizeVnText(str)
  if (!s) return false
  return HN_DISTRICT_KEYWORDS.some((k) => s.includes(normalizeVnText(k)))
}

// Suy luận Tỉnh/Thành phố (Hồ Chí Minh / Hà Nội) từ văn bản địa chỉ hoặc ngữ cảnh chat
export function inferProvinceFromAddressText(text: string): string {
  const lower = (text || '').toLowerCase()
  if (HCM_DISTRICT_KEYWORDS.some((k) => lower.includes(k))) return 'Hồ Chí Minh'
  if (HN_DISTRICT_KEYWORDS.some((k) => lower.includes(k))) return 'Hà Nội'
  return ''
}

// Khử rò rỉ dữ liệu phường/quận đặc trưng HCM/HN khi tỉnh là tỉnh khác
export function sanitizeCrossProvinceGeo(
  province: string,
  district: string,
  ward: string,
): { district: string; ward: string } {
  let cleanDist = district
  let cleanWard = ward
  const provNorm = normalizeVnText(province || '')

  if (provNorm && !provNorm.includes('ho chi minh') && !provNorm.includes('hcm')) {
    if (cleanWard && isHcmAdminName(cleanWard)) cleanWard = ''
    if (cleanDist && isHcmAdminName(cleanDist)) cleanDist = ''
  }
  if (provNorm && !provNorm.includes('ha noi') && !provNorm.includes('hn')) {
    if (cleanWard && isHnAdminName(cleanWard)) cleanWard = ''
    if (cleanDist && isHnAdminName(cleanDist)) cleanDist = ''
  }

  return { district: cleanDist, ward: cleanWard }
}

// Kiểm tra ward và district có trùng tên hành chính không (ví dụ: "Xã Đức Hòa" & "Huyện Đức Hòa")
export function isWardDistrictDuplicate(ward: string, district: string): boolean {
  const normWard = normalizeVnText(stripAdminPrefixes(ward))
  const normDist = normalizeVnText(stripAdminPrefixes(district))
  return Boolean(
    normWard &&
      normDist &&
      (normWard === normDist || normWard.includes(normDist) || normDist.includes(normWard)),
  )
}

// Bóc tách chi tiết các cấp địa chỉ & phân loại CŨ (3 cấp) / MỚI (2 cấp)
export function parseAddressComponents(orderData: SpxOrderData): ParsedSpxAddress {
  const raw = (orderData.address || '').trim()
  let prov = (orderData.province || '').trim()
  let dist = (orderData.district || '').trim()
  let ward = (orderData.ward || '').trim()
  let detail = (orderData.detailAddress || '').trim()

  const rawLower = raw.toLowerCase()
  const parts = raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)

  // 1. Khử rò rỉ dữ liệu chéo giữa các tỉnh thành & chuẩn hóa tỉnh
  const sanitized = sanitizeCrossProvinceGeo(prov, dist, ward)
  dist = sanitized.district
  ward = sanitized.ward

  if (rawLower.includes('quảng ngãi')) {
    prov = 'Quảng Ngãi'
  } else if (rawLower.includes('thái nguyên')) {
    prov = 'Thái Nguyên'
  } else if (rawLower.includes('đà nẵng') || rawLower.includes('dn')) {
    prov = 'Đà Nẵng'
  } else if (rawLower.includes('tiền giang')) {
    prov = 'Tiền Giang'
  } else if (
    rawLower.includes('hồ chí minh') ||
    rawLower.includes('hcm') ||
    rawLower.includes('sài gòn') ||
    rawLower.includes('tphcm')
  ) {
    prov = 'Hồ Chí Minh'
  } else if (rawLower.includes('hà nội') || rawLower.includes('hn')) {
    prov = 'Hà Nội'
  } else {
    const inferredProv = inferProvinceFromAddressText(rawLower)
    if (inferredProv) {
      prov = inferredProv
    } else if (!prov && parts.length >= 2) {
      prov = parts[parts.length - 1].replace(/^(tỉnh|thành phố|tp\.)\s+/i, '').trim()
    }
  }
  prov = normalizeProvinceName(prov)

  // 1.5 Bổ sung Quận/Huyện nếu chưa có (ưu tiên giữ nguyên segment đầy đủ như "Quận Gò Vấp")
  if (!dist || dist.toLowerCase() === 'hồ chí minh') {
    for (const k of HCM_DISTRICT_KEYWORDS) {
      if (rawLower.includes(k)) {
        const matchedPart = parts.find((part) => part.toLowerCase().includes(k))
        if (matchedPart && /^(quận|huyện|thị xã|tp\.?|q\.?|h\.?|tx\.?)\s+/i.test(matchedPart)) {
          dist = matchedPart.trim()
        } else {
          dist = k.replace(/^q\.?(\d+)$/i, 'Quận $1')
          dist = dist.charAt(0).toUpperCase() + dist.slice(1)
        }
        break
      }
    }
  }

  // 2. Phân loại loại hình địa chỉ: CŨ (3 cấp: có quận/huyện) vs MỚI (2 cấp: chỉ tỉnh - xã)
  const hasDistrict = Boolean(
    dist ||
      rawLower.includes('quận') ||
      rawLower.includes('huyện') ||
      rawLower.includes('thị xã') ||
      rawLower.includes('q.') ||
      rawLower.includes('h.') ||
      rawLower.includes('tx.'),
  )

  let detectedType: 'OLD_3_LEVEL' | 'NEW_2_LEVEL' =
    orderData.addressType || (hasDistrict ? 'OLD_3_LEVEL' : 'NEW_2_LEVEL')

  // 3. Xử lý chính xác Phường/Xã và Địa chỉ chi tiết
  if (detectedType === 'NEW_2_LEVEL') {
    dist = '' // Chế độ 2 cấp tuyệt đối không có Quận/Huyện

    if (!ward || (detail && ward.toLowerCase().includes(detail.toLowerCase()))) {
      if (parts.length >= 3) {
        ward = parts[parts.length - 2].trim()
      } else if (parts.length === 2) {
        ward = parts[1].trim()
      }
    }

    if (
      ward &&
      (ward.length > 40 ||
        ward.toLowerCase().includes('dốc') ||
        ward.toLowerCase().includes('số ') ||
        ward.toLowerCase().includes('ngõ'))
    ) {
      if (parts.length >= 3) {
        ward = parts[parts.length - 2].trim()
      }
    }

    if (!detail) {
      if (parts.length >= 3) {
        detail = parts.slice(0, parts.length - 2).join(', ').trim()
      } else if (parts.length >= 2) {
        detail = parts[0].trim()
      } else {
        detail = raw
      }
    }
  } else {
    if (!dist) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i].toLowerCase()
        if (/(?:^|\s)(quận|huyện|thị xã|q\.|h\.|tx\.)(?:\s|\d|$)/i.test(p)) {
          dist = parts[i].trim()
          break
        }
      }
      if (!dist && parts.length >= 3) {
        dist = parts[parts.length - 2].trim()
      }
    }

    if (!ward) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i].toLowerCase()
        if (
          parts[i] === dist ||
          parts[i] === prov ||
          normalizeProvinceName(parts[i]) === prov
        ) {
          continue
        }
        if (/(?:^|\s)(phường|xã|thị trấn|p\.|tt\.)(?:\s|\d|$)/i.test(p)) {
          ward = parts[i].trim()
          break
        }
      }
      if (!ward && parts.length >= 4) {
        ward = parts[parts.length - 3].trim()
      }
    }

    if (!detail) {
      if (parts.length >= 3) {
        detail = parts.slice(0, parts.length - 2).join(', ').trim()
      } else {
        detail = parts[0] || raw
      }
    }
  }

  // Khử trùng lặp giữa ward và district nếu có tên giống nhau
  if (isWardDistrictDuplicate(ward, dist)) {
    dist = ''
    detectedType = 'NEW_2_LEVEL'
  }

  // Chuẩn hóa tên Phường/Xã
  let cleanWard = (ward || '').trim()
  if (prov && cleanWard.toLowerCase().endsWith(prov.toLowerCase())) {
    cleanWard = cleanWard.slice(0, -prov.length).replace(/[, -]+$/, '').trim()
  }

  let formattedWard = cleanWard
  if (formattedWard && /^\d+$/.test(formattedWard)) {
    formattedWard = `Phường ${formattedWard}`
  }

  // Chuẩn hóa Địa chỉ chi tiết
  let cleanDetail = (detail || '').trim()
  if (prov && cleanDetail.toLowerCase().endsWith(prov.toLowerCase())) {
    cleanDetail = cleanDetail.slice(0, -prov.length).replace(/[, -]+$/, '').trim()
  }
  if (dist && cleanDetail.toLowerCase().endsWith(dist.toLowerCase())) {
    cleanDetail = cleanDetail.slice(0, -dist.length).replace(/[, -]+$/, '').trim()
  }
  if (cleanWard && cleanDetail.toLowerCase().endsWith(cleanWard.toLowerCase())) {
    cleanDetail = cleanDetail.slice(0, -cleanWard.length).replace(/[, -]+$/, '').trim()
  }

  return {
    province: prov,
    district: detectedType === 'OLD_3_LEVEL' ? dist : '',
    ward: cleanWard,
    formattedWard,
    detailAddress: cleanDetail || parts[0] || raw,
    addressType: detectedType,
  }
}

// Helper tính khối lượng (kg) và số lượng đồng bộ từ orderData
export function resolveWeightKgAndQty(orderData: SpxOrderData): { weightKg: number; quantity: number } {
  let weightKg = Number(orderData.weightKg || 0)
  if (!weightKg || weightKg <= 0) {
    const gram = Number(orderData.weightGram || 0)
    weightKg = gram > 0 ? Math.max(0.1, Math.round((gram / 1000) * 100) / 100) : 1
  }

  let quantity = Number(orderData.quantity || 0)
  if (!quantity || quantity <= 0) {
    quantity = orderData.items?.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0) || 1
  }
  quantity = Math.max(1, Math.round(quantity))

  return { weightKg, quantity }
}

// Kiểm tra xem địa chỉ hiển thị trong ô Cascader có khớp với đoạn text nhập vào không
export function checkCascaderAddressMatches(
  displayedCascader: string,
  inputText: string,
  targetOrderData?: SpxOrderData,
  spxWarning: string | null = null,
): { isMatch: boolean; reason: string } {
  if (
    !displayedCascader ||
    displayedCascader.includes('Please Select') ||
    displayedCascader.includes('Vui lòng chọn')
  ) {
    return { isMatch: false, reason: 'Chưa có Tỉnh/Huyện/Xã nào được chọn' }
  }

  if (spxWarning) {
    return { isMatch: false, reason: `SPX cảnh báo: "${spxWarning}"` }
  }

  const parts = displayedCascader
    .split(/[/,]/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 0) {
    return { isMatch: false, reason: 'Không phân tách được các cấp địa chỉ' }
  }

  const normInput = normalizeVnText(
    `${inputText} ${targetOrderData?.address || ''} ${targetOrderData?.province || ''} ${targetOrderData?.district || ''} ${targetOrderData?.ward || ''}`,
  )

  // Cấp 1: Tỉnh / Thành phố
  const provRaw = parts[0]
  const provClean = normalizeVnText(stripAdminPrefixes(provRaw))
  const provOfficial = normalizeVnText(normalizeProvinceName(provRaw))

  const hasProvinceInInput =
    normInput.includes(provClean) ||
    normInput.includes(provOfficial) ||
    (provOfficial.includes('ho chi minh') &&
      (normInput.includes('hcm') || normInput.includes('sai gon') || normInput.includes('tphcm'))) ||
    (provOfficial.includes('ha noi') && normInput.includes('hn')) ||
    (provOfficial.includes('da nang') && normInput.includes('dn')) ||
    (provOfficial.includes('hai phong') && normInput.includes('hp'))

  if (!hasProvinceInInput) {
    return {
      isMatch: false,
      reason: `Tỉnh "${provRaw}" không xuất hiện trong địa chỉ nhập vào!`,
    }
  }

  // Cấp 2 & 3: Quận/Huyện & Phường/Xã
  if (parts.length >= 3) {
    const distRaw = parts[1]
    const distClean = normalizeVnText(stripAdminPrefixes(distRaw))
    const wardRaw = parts[2]
    const wardClean = normalizeVnText(stripAdminPrefixes(wardRaw))

    const targetDistClean = normalizeVnText(stripAdminPrefixes(targetOrderData?.district || ''))
    const targetWardClean = normalizeVnText(stripAdminPrefixes(targetOrderData?.ward || ''))

    const matchDistDirect =
      Boolean(targetDistClean) &&
      (distClean === targetDistClean ||
        distClean.includes(targetDistClean) ||
        targetDistClean.includes(distClean))
    const matchWardDirect =
      Boolean(targetWardClean) &&
      (wardClean === targetWardClean ||
        wardClean.includes(targetWardClean) ||
        targetWardClean.includes(wardClean))

    const hasDist = matchDistDirect || (distClean.length >= 2 && normInput.includes(distClean))
    const hasWard = matchWardDirect || (wardClean.length >= 2 && normInput.includes(wardClean))

    if (!hasDist && !hasWard) {
      return {
        isMatch: false,
        reason: `Cả Huyện "${distRaw}" và Xã "${wardRaw}" đều không khớp với địa chỉ nhập vào!`,
      }
    }
  } else if (parts.length === 2) {
    const secondRaw = parts[1]
    const secondClean = normalizeVnText(stripAdminPrefixes(secondRaw))

    const targetWardClean = normalizeVnText(stripAdminPrefixes(targetOrderData?.ward || ''))
    const targetDistClean = normalizeVnText(stripAdminPrefixes(targetOrderData?.district || ''))

    const matchDirect =
      (Boolean(targetWardClean) &&
        (secondClean === targetWardClean ||
          secondClean.includes(targetWardClean) ||
          targetWardClean.includes(secondClean))) ||
      (Boolean(targetDistClean) &&
        (secondClean === targetDistClean ||
          secondClean.includes(targetDistClean) ||
          targetDistClean.includes(secondClean)))

    const hasSecond = matchDirect || (secondClean.length >= 2 && normInput.includes(secondClean))

    if (!hasSecond) {
      return {
        isMatch: false,
        reason: `Cấp "${secondRaw}" không khớp với địa chỉ nhập vào!`,
      }
    }
  }

  return { isMatch: true, reason: 'Địa chỉ đã khớp chuẩn' }
}
