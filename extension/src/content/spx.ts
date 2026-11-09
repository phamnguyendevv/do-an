// Content Script for SPX (Shopee Xpress - spx.vn / shopee.vn)
// Tự động nhận diện loại địa chỉ MỚI (2 cấp) / CŨ (3 cấp), bóc tách Tỉnh / Huyện / Xã / Số nhà,
// điền form RPA chính xác từng ô và GIỮ NGUYÊN TAB để người dùng kiểm tra thủ công (KHÔNG TỰ TẮT).

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
  createdAt?: number
}

console.log('[Bookstore AI] SPX content script loaded on:', window.location.href)

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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
      ''
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

// Helper kiểm tra phần tử có đang hiển thị thực tế trên màn hình không
function isElementVisible(el: Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  if (
    style.opacity === '0' &&
    !el.classList.contains('ant-select-selection-search-input') &&
    !el.closest('.ant-select')
  ) {
    return false
  }
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

// Bóc tách chi tiết các cấp địa chỉ & phân loại CŨ (3 cấp) / MỚI (2 cấp)
export function parseAddressComponents(orderData: SpxOrderData) {
  let raw = (orderData.address || '').trim()
  let prov = (orderData.province || '').trim()
  let dist = (orderData.district || '').trim()
  let ward = (orderData.ward || '').trim()
  let detail = (orderData.detailAddress || '').trim()

  const rawLower = raw.toLowerCase()
  const rawNorm = normalizeVnText(raw)
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean)

  // 1. Danh sách từ khóa quận/huyện HCM và HN
  const hcmKeywords = [
    'bình tân', 'bình thạnh', 'tân bình', 'tân phú', 'gò vấp', 'phú nhuận', 'thủ đức',
    'bình chánh', 'hóc môn', 'củ chi', 'nhà bè', 'cần giờ',
    'quận 1', 'quận 2', 'quận 3', 'quận 4', 'quận 5', 'quận 6', 'quận 7', 'quận 8', 'quận 9', 'quận 10', 'quận 11', 'quận 12',
    'q.1', 'q.2', 'q.3', 'q.4', 'q.5', 'q.6', 'q.7', 'q.8', 'q.9', 'q.10', 'q.11', 'q.12',
    'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12',
  ]
  const hnKeywords = [
    'cầu giấy', 'đống đa', 'ba đình', 'hoàn kiếm', 'hai bà trưng', 'hoàng mai', 'thanh xuân',
    'long biên', 'nam từ liêm', 'bắc từ liêm', 'tây hồ', 'hà đông', 'thanh trì', 'gia lâm', 'đông anh', 'sóc sơn', 'hoài đức',
  ]

  // SANITIZE: Chống rò rỉ dữ liệu chéo giữa các tỉnh thành (ví dụ: Tỉnh Quảng Ngãi nhưng lại bị dính Phường Bình Trị Đông / Bình Tân từ đơn TP.HCM trước)
  const isHcmWardOrDist = (str: string) => {
    const s = normalizeVnText(str)
    return (
      hcmKeywords.some((k) => s.includes(k)) ||
      s.includes('binh tri dong') ||
      s.includes('ben nghe') ||
      s.includes('tan dinh')
    )
  }
  const isHnWardOrDist = (str: string) => {
    const s = normalizeVnText(str)
    return hnKeywords.some((k) => s.includes(k))
  }

  const provNorm = normalizeVnText(prov || '')
  if (provNorm && !provNorm.includes('ho chi minh') && !provNorm.includes('hcm')) {
    if (ward && isHcmWardOrDist(ward)) {
      console.warn(`[Bookstore AI] Phát hiện Phường/Xã HCM "${ward}" lạc vào tỉnh "${prov}", loại bỏ ngay!`)
      ward = ''
    }
    if (dist && isHcmWardOrDist(dist)) {
      console.warn(`[Bookstore AI] Phát hiện Quận/Huyện HCM "${dist}" lạc vào tỉnh "${prov}", loại bỏ ngay!`)
      dist = ''
    }
  }
  if (provNorm && !provNorm.includes('ha noi') && !provNorm.includes('hn')) {
    if (ward && isHnWardOrDist(ward)) {
      console.warn(`[Bookstore AI] Phát hiện Phường/Xã HN "${ward}" lạc vào tỉnh "${prov}", loại bỏ ngay!`)
      ward = ''
    }
    if (dist && isHnWardOrDist(dist)) {
      console.warn(`[Bookstore AI] Phát hiện Quận/Huyện HN "${dist}" lạc vào tỉnh "${prov}", loại bỏ ngay!`)
      dist = ''
    }
  }

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
    rawLower.includes('tphcm') ||
    hcmKeywords.some((k) => rawLower.includes(k))
  ) {
    prov = 'Hồ Chí Minh'
  } else if (
    rawLower.includes('hà nội') ||
    rawLower.includes('hn') ||
    hnKeywords.some((k) => rawLower.includes(k))
  ) {
    prov = 'Hà Nội'
  } else if (!prov && parts.length >= 2) {
    prov = parts[parts.length - 1].replace(/^(tỉnh|thành phố|tp\.)\s+/i, '').trim()
  }
  prov = normalizeProvinceName(prov)

  // 1.5 Bổ sung Quận/Huyện nếu chưa có
  if (!dist || dist.toLowerCase() === 'hồ chí minh') {
    for (const k of hcmKeywords) {
      if (rawLower.includes(k)) {
        dist = k.replace(/^q(\d+)$/i, 'Quận $1')
        dist = dist.charAt(0).toUpperCase() + dist.slice(1)
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
    rawLower.includes('tx.')
  )

  let detectedType: 'OLD_3_LEVEL' | 'NEW_2_LEVEL' =
    orderData.addressType || (hasDistrict ? 'OLD_3_LEVEL' : 'NEW_2_LEVEL')

  // 3. Xử lý chính xác Phường/Xã và Địa chỉ chi tiết
  if (detectedType === 'NEW_2_LEVEL') {
    dist = '' // Chế độ 2 cấp tuyệt đối không có Quận/Huyện

    // Trích xuất ward nếu chưa có hoặc ward bị gán nhầm bằng detailAddress
    if (!ward || (detail && ward.toLowerCase().includes(detail.toLowerCase()))) {
      if (parts.length >= 3) {
        ward = parts[parts.length - 2].trim()
      } else if (parts.length === 2) {
        ward = parts[1].trim()
      }
    }

    // Nếu ward bị quá dài (> 40 ký tự) hoặc chứa các từ chỉ số nhà / đường ngõ, reset lại
    if (ward && (ward.length > 40 || ward.toLowerCase().includes('dốc') || ward.toLowerCase().includes('số ') || ward.toLowerCase().includes('ngõ'))) {
      if (parts.length >= 3) {
        ward = parts[parts.length - 2].trim()
      }
    }

    // Trích xuất detailAddress nếu chưa có
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
    // Chế độ 3 cấp (CŨ)
    if (!dist) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i].toLowerCase()
        if (p.includes('quận') || p.includes('huyện') || p.includes('thị xã') || p.includes('q.') || p.includes('h.') || p.includes('tx.')) {
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
        if (p.includes('phường') || p.includes('xã') || p.includes('thị trấn') || p.includes('p.') || p.includes('tt.')) {
          if (parts[i] !== dist && parts[i] !== prov) {
            ward = parts[i].trim()
            break
          }
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

  // Khử trùng lặp giữa ward và district nếu có tên giống nhau (ví dụ: ward="Đức Hòa", district="Đức Hòa")
  const normWardName = normalizeVnText(stripAdminPrefixes(ward))
  const normDistName = normalizeVnText(stripAdminPrefixes(dist))
  if (normWardName && normDistName && (normWardName === normDistName || normWardName.includes(normDistName) || normDistName.includes(normWardName))) {
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

  // Chuẩn hóa Địa chỉ chi tiết (chỉ số nhà, tên đường, ngõ xóm - không chứa Phường/Quận/Tỉnh)
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

// Danh sách các tiêu đề Section của SPX để phân định ranh giới
const SECTION_KEYWORDS = [
  '1. địa chỉ người gửi',
  '2. địa chỉ người nhận',
  '3. loại dịch vụ',
  '4. thông tin bưu gửi',
  '5. dịch vụ',
  '6. thông tin gửi hàng',
  '7. khuyến mãi',
]

// Tìm chính xác thẻ Card của Section mà KHÔNG BAO GIỜ bao trùm section khác hoặc thẻ form toàn trang
function getSectionContainer(sectionKeyword: string): HTMLElement | null {
  const targetLower = sectionKeyword.toLowerCase()
  const allElements = Array.from(
    document.querySelectorAll('h1, h2, h3, h4, h5, h6, div, span, p, label')
  ) as HTMLElement[]

  const heading = allElements.find((el) => {
    if (!isElementVisible(el)) return false
    const t = (el.textContent || '').trim().toLowerCase()
    if (t.length > 60 || t.length < 3) return false
    return t.includes(targetLower)
  })

  if (!heading) return null

  const otherKeywords = SECTION_KEYWORDS.filter(
    (k) => !k.includes(targetLower) && !targetLower.includes(k),
  )

  let bestContainer: HTMLElement = heading.parentElement || heading
  let cur: HTMLElement | null = heading.parentElement

  while (cur && cur !== document.body && cur.tagName !== 'FORM') {
    const containsOther = otherKeywords.some((otherKw) => {
      return Array.from(cur!.querySelectorAll('h1, h2, h3, h4, h5, h6, div, span, p')).some((sub) => {
        const subText = (sub.textContent || '').trim().toLowerCase()
        return subText.length <= 60 && subText.includes(otherKw)
      })
    })

    if (containsOther) {
      break
    }

    bestContainer = cur
    cur = cur.parentElement
  }

  return bestContainer
}

// Wrapper tìm Section container theo nhiều từ khóa
function findSectionContainer(headingKeywords: string[]): HTMLElement | null {
  for (const kw of headingKeywords) {
    const sec = getSectionContainer(kw)
    if (sec) return sec
  }
  return null
}

// Helper gõ phím từng ký tự mô phỏng người dùng thật cho các input có mask/validation phức tạp
function simulateTyping(input: HTMLElement | null, text: string) {
  if (!input) return
  input.focus()

  try {
    const tracker = (input as any)._valueTracker
    if (tracker) {
      tracker.setValue('')
    }
  } catch (_) { }

  // Xóa sạch giá trị cũ
  if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
    input.value = ''
  }

  // Gõ từng ký tự
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const isDigit = /\d/.test(char)
    const code = isDigit ? `Digit${char}` : `Key${char.toUpperCase()}`
    const charCode = char.charCodeAt(0)
    const keyOpts = { key: char, code, charCode, keyCode: charCode, which: charCode, bubbles: true }
    try {
      input.dispatchEvent(new KeyboardEvent('keydown', keyOpts))
      input.dispatchEvent(new KeyboardEvent('keypress', keyOpts))
    } catch (_) { }

    try {
      document.execCommand('insertText', false, char)
    } catch (_) { }

    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      if (!input.value.endsWith(char)) {
        input.value += char
      }
    }

    try {
      input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, data: char, inputType: 'insertText' }))
      input.dispatchEvent(new KeyboardEvent('keyup', keyOpts))
    } catch (_) { }
  }

  // Đảm bảo giá trị cuối cùng được gán qua prototype setter
  const proto =
    input instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (nativeInputValueSetter && (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) {
    nativeInputValueSetter.call(input, text)
  }

  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
  input.dispatchEvent(new Event('blur', { bubbles: true }))

  // Hiệu ứng viền xanh
  input.style.transition = 'all 0.3s ease'
  input.style.border = '2px solid #10b981'
  input.style.backgroundColor = '#ecfdf5'
}

// Helper điền giá trị tương thích tuyệt đối với React / Vue Synthetic Events & Ant Design
function setInputValue(input: HTMLElement | null, value: string | number) {
  if (!input) return
  const strVal = String(value)
  input.focus()

  // 1. Reset internal valueTracker của React để React không bỏ qua sự kiện onChange/input
  try {
    const tracker = (input as any)._valueTracker
    if (tracker) {
      tracker.setValue('')
    }
  } catch (_) { }

  // 2. Dùng document.execCommand để kích hoạt engine gõ phím native của trình duyệt
  try {
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      input.select()
      document.execCommand('selectAll', false, undefined)
      document.execCommand('insertText', false, strVal)
    }
  } catch (_) { }

  // 3. Native value setter descriptor để gán chắc chắn vào instance
  const proto =
    input instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set

  if (nativeInputValueSetter && (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) {
    nativeInputValueSetter.call(input, strVal)
  } else if ('value' in input) {
    ; (input as any).value = strVal
  }

  // 4. Dispatch đầy đủ chuỗi sự kiện Synthetic & Native (không dispatch key 'a' để tránh hỏng ô số)
  input.dispatchEvent(new Event('focus', { bubbles: true }))
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  try {
    input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, data: strVal }))
  } catch (_) { }
  input.dispatchEvent(new Event('change', { bubbles: true }))
  input.dispatchEvent(new Event('blur', { bubbles: true }))

  // Hiệu ứng viền xanh nổi bật để người dùng dễ quan sát trực quan
  input.style.transition = 'all 0.3s ease'
  input.style.border = '2px solid #10b981'
  input.style.backgroundColor = '#ecfdf5'
  input.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.25)'

  const wrapper = input.closest('.ant-input-affix-wrapper, .input-group, [class*="wrapper"]') as HTMLElement
  if (wrapper) {
    wrapper.style.borderColor = '#10b981'
    wrapper.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.25)'
  }
}

// Helper điền các ô số Ant Design (InputNumber) tương thích tuyệt đối với rc-input-number
function setAntDesignNumber(input: HTMLInputElement | null, value: number | string) {
  if (!input) return
  const strVal = String(value)
  input.focus()

  try {
    const tracker = (input as any)._valueTracker
    if (tracker) tracker.setValue('')
  } catch (_) { }

  try {
    input.select()
    document.execCommand('selectAll', false, undefined)
    document.execCommand('insertText', false, strVal)
  } catch (_) { }

  const proto = window.HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (setter) {
    setter.call(input, strVal)
  } else {
    input.value = strVal
  }

  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  try {
    input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, data: strVal }))
  } catch (_) { }
  input.dispatchEvent(new Event('change', { bubbles: true }))
  input.dispatchEvent(new Event('blur', { bubbles: true }))

  const cleanCurrent = (input.value || '').replace(/\D/g, '')
  const cleanTarget = strVal.replace(/\D/g, '')
  if (cleanCurrent !== cleanTarget) {
    simulateTyping(input, strVal)
  }

  input.style.transition = 'all 0.3s ease'
  input.style.border = '2px solid #10b981'
  input.style.backgroundColor = '#ecfdf5'
}

// Helper an toàn để dispatch click mouse events và gọi click() nếu có
function safelyClick(el: Element | null | undefined): boolean {
  if (!el) return false
  try {
    if (typeof (el as any).scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' })
    }
  } catch (_) { }

  const opts = { bubbles: true, cancelable: true, view: window }
  try { el.dispatchEvent(new PointerEvent('pointerdown', opts)) } catch (_) { }
  try { el.dispatchEvent(new MouseEvent('mousedown', opts)) } catch (_) { }
  try { el.dispatchEvent(new PointerEvent('pointerup', opts)) } catch (_) { }
  try { el.dispatchEvent(new MouseEvent('mouseup', opts)) } catch (_) { }

  try {
    if (typeof (el as any).click === 'function') {
      (el as any).click()
      return true
    }
  } catch (_) { }

  return false
}

// Helper dispatch click mouse events
function dispatchMouseClick(el: Element | null | undefined) {
  safelyClick(el)
}

// ==================== 1. CHỌN LOẠI ĐỊA CHỈ: MỚI (2 CẤP) / CŨ (3 CẤP) ====================
function selectAddressTypeRadio(type: 'OLD_3_LEVEL' | 'NEW_2_LEVEL'): boolean {
  const isOld = type === 'OLD_3_LEVEL'
  console.log(`[Bookstore AI] Đang chọn loại địa chỉ: ${isOld ? 'Địa chỉ CŨ (3 cấp)' : 'Địa chỉ MỚI (2 cấp)'}...`)

  const sec2 = findSectionContainer(['2. Địa chỉ người nhận', 'Địa chỉ người nhận']) || document.body

  // 1. Quét tìm thẻ label/wrapper chứa chính xác "3 cấp" hoặc "2 cấp"
  const allLabels = Array.from(sec2.querySelectorAll('label, .ant-radio-wrapper')) as HTMLElement[]
  for (const lbl of allLabels) {
    const text = (lbl.textContent || '').trim().toLowerCase()
    const matchOld = isOld && (text.includes('3 cấp') || text.includes('cũ')) && !text.includes('2 cấp')
    const matchNew = !isOld && (text.includes('2 cấp') || text.includes('mới')) && !text.includes('3 cấp')
    if (matchOld || matchNew) {
      console.log(`[Bookstore AI] Tìm thấy label radio: "${lbl.textContent?.trim()}"`)
      const radioInput = lbl.querySelector('input[type="radio"]') as HTMLInputElement | null
      const isAlreadyChecked =
        radioInput?.checked ||
        lbl.classList.contains('ant-radio-wrapper-checked') ||
        lbl.querySelector('.ant-radio-checked') !== null

      if (isAlreadyChecked) {
        console.log(`[Bookstore AI] Radio "${lbl.textContent?.trim()}" ĐÃ Ở ĐÚNG CHẾ ĐỘ, KHÔNG click lại để tránh SPX reset form!`)
        return true
      }

      const inner = lbl.querySelector('.ant-radio-inner, .ant-radio') as HTMLElement | null
      const clickable = inner || radioInput || lbl

      safelyClick(clickable)
      if (radioInput && !radioInput.checked) {
        radioInput.checked = true
        radioInput.dispatchEvent(new Event('input', { bubbles: true }))
        radioInput.dispatchEvent(new Event('change', { bubbles: true }))
      }
      return true
    }
  }

  // 2. Fallback: Theo vị trí radio trong nhóm "Chọn loại địa chỉ"
  // SPX: Radio 0 = "Địa chỉ MỚI (2 cấp)", Radio 1 = "Địa chỉ CŨ (3 cấp)"
  const secRadios = Array.from(sec2.querySelectorAll('input[type="radio"]')) as HTMLInputElement[]
  if (secRadios.length >= 2) {
    const targetRadio = isOld ? secRadios[1] : secRadios[0]
    if (targetRadio) {
      if (targetRadio.checked) {
        console.log(`[Bookstore AI] Radio index ${isOld ? 1 : 0} đã checked, không click lại.`)
        return true
      }
      console.log(`[Bookstore AI] Chọn radio theo index: ${isOld ? 1 : 0}`)
      targetRadio.checked = true
      targetRadio.dispatchEvent(new Event('input', { bubbles: true }))
      targetRadio.dispatchEvent(new Event('change', { bubbles: true }))
      safelyClick(targetRadio)
      const parent = targetRadio.parentElement
      if (parent) safelyClick(parent)
      return true
    }
  }

  return false
}

// Đảm bảo radio chuyển đúng và chờ SPX cập nhật lại layout cascader
async function ensureAddressTypeRadio(type: 'OLD_3_LEVEL' | 'NEW_2_LEVEL'): Promise<boolean> {
  const isOld = type === 'OLD_3_LEVEL'
  const sec2 = findSectionContainer(['2. Địa chỉ người nhận', 'Địa chỉ người nhận']) || document.body
  const wrappers = Array.from(sec2.querySelectorAll('label, .ant-radio-wrapper')) as HTMLElement[]
  for (const w of wrappers) {
    const text = (w.textContent || '').trim().toLowerCase()
    const isTarget = isOld
      ? (text.includes('3 cấp') || text.includes('cũ')) && !text.includes('2 cấp')
      : (text.includes('2 cấp') || text.includes('mới')) && !text.includes('3 cấp')

    if (isTarget) {
      const radioInput = w.querySelector('input[type="radio"]') as HTMLInputElement | null
      const isAntChecked = w.classList.contains('ant-radio-wrapper-checked') || w.querySelector('.ant-radio-checked') !== null
      if (radioInput?.checked || isAntChecked) {
        console.log(`[Bookstore AI] Đã xác nhận radio ở đúng chế độ: ${type}, không cần click lại.`)
        return true
      }
    }
  }

  selectAddressTypeRadio(type)
  await sleep(350)
  return true
}

// ==================== 2. TÍNH NĂNG "DÁN VÀ NHẬP TỰ ĐỘNG" THÔNG MINH CỦA SPX ====================
function findSmartImportButton(): HTMLElement | null {
  const sec2 = findSectionContainer(['2. Địa chỉ người nhận', 'Địa chỉ người nhận']) || document.body

  const candidates = Array.from(sec2.querySelectorAll('button, a, span, div')).filter((el) => {
    if (!isElementVisible(el)) return false
    const t = (el.textContent || '').trim().toLowerCase()
    return t === 'tự động điền' || t === 'dán và nhập tự động' || t === 'tự động nhập' || t === 'dán và nhập'
  }) as HTMLElement[]

  if (candidates.length > 0) {
    candidates.sort((a, b) => {
      const aBtn = a.tagName === 'BUTTON' || a.getAttribute('role') === 'button' || a.className.includes('btn') ? 1 : 0
      const bBtn = b.tagName === 'BUTTON' || b.getAttribute('role') === 'button' || b.className.includes('btn') ? 1 : 0
      if (aBtn !== bBtn) return bBtn - aBtn
      return a.children.length - b.children.length
    })
    console.log('[Bookstore AI] Đã tìm thấy nút Smart Import từ Section 2:', candidates[0])
    return candidates[0].closest('button, a, [role="button"]') || candidates[0]
  }

  return null
}

function findSmartImportInput(): HTMLInputElement | HTMLTextAreaElement | null {
  const sec2 = findSectionContainer(['2. Địa chỉ người nhận', 'Địa chỉ người nhận']) || document.body

  // 1. Tìm input nằm cùng container với nút "Tự động điền"
  const pasteBtn = findSmartImportButton()
  if (pasteBtn) {
    let p: HTMLElement | null = pasteBtn.parentElement
    let d = 0
    while (p && d < 4) {
      const inp = p.querySelector('textarea, input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])') as HTMLInputElement | HTMLTextAreaElement | null
      if (inp && isElementVisible(inp)) {
        console.log('[Bookstore AI] Đã tìm thấy ô Nhập tự động cạnh nút Tự động điền:', inp)
        return inp
      }
      p = p.parentElement
      d++
    }
  }

  const allInputs = Array.from(
    sec2.querySelectorAll('textarea, input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])')
  ) as Array<HTMLInputElement | HTMLTextAreaElement>

  // 2. Tìm theo placeholder hoặc text gợi ý ví dụ
  for (const el of allInputs) {
    const ph = (el.getAttribute('placeholder') || '').toLowerCase()
    if (
      ph.includes('nhập toàn bộ thông tin') ||
      ph.includes('tự động điền') ||
      ph.includes('điền tên, số điện thoại và địa chỉ') ||
      ph.includes('toàn bộ thông tin') ||
      ph.includes('nguyen van a') ||
      ph.includes('0908888888')
    ) {
      if (isElementVisible(el)) return el
    }
  }

  // 3. Tìm theo label "Nhập tự động"
  const labels = Array.from(sec2.querySelectorAll('label, div, span, p')).filter((el) => {
    if (el.children.length > 2) return false
    const t = (el.textContent || '').trim().toLowerCase()
    return t === 'nhập tự động' || t.includes('nhập tự động')
  }) as HTMLElement[]

  for (const lbl of labels) {
    let p: HTMLElement | null = lbl.parentElement
    let depth = 0
    while (p && depth < 4) {
      const inp = p.querySelector('textarea, input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])') as HTMLInputElement | HTMLTextAreaElement | null
      if (inp && isElementVisible(inp)) return inp
      p = p.parentElement
      depth++
    }
  }

  // 4. Fallback: Ô textarea đầu tiên trong section 2
  const textareas = Array.from(sec2.querySelectorAll('textarea')).filter(isElementVisible) as HTMLTextAreaElement[]
  if (textareas.length > 0) return textareas[0]

  return null
}

async function fillSmartImport(orderData: SpxOrderData, addrInfo: any): Promise<boolean> {
  const smartInput = findSmartImportInput()
  if (!smartInput) {
    console.warn('[Bookstore AI] Không tìm thấy ô Nhập tự động!')
    return false
  }

  const isOld = addrInfo.addressType === 'OLD_3_LEVEL'
  const wardToUse = addrInfo.formattedWard || addrInfo.ward || ''
  let distToUse = (addrInfo.district || '').trim()
  if (isOld && distToUse && /^\d+$/.test(distToUse)) {
    distToUse = `Quận ${distToUse}`
  }
  const provToUse = normalizeProvinceName(addrInfo.province)

  // Khử trùng lặp nếu ward và district cùng tên (tránh bị "Đức Hòa, Đức Hòa")
  const normWard = normalizeVnText(stripAdminPrefixes(wardToUse))
  const normDist = normalizeVnText(stripAdminPrefixes(distToUse))
  if (normWard && normDist && (normWard === normDist || normWard.includes(normDist) || normDist.includes(normWard))) {
    distToUse = ''
  }

  // Số điện thoại chuẩn 10 chữ số bắt đầu bằng 0 cho ô Nhập tự động
  const cleanPhoneNoPrefix = (orderData.recipientPhone || '').trim().replace(/^(\+84|84|0)/, '')
  const cleanPhone10 = `0${cleanPhoneNoPrefix}`

  // Mẫu SPX quy định: Nguyen Van A, 0908888888, 12 Le Duan, Phuong Ben Nghe, Quan 1, TP. Ho Chi Minh
  const fullLoc = (isOld && distToUse)
    ? [wardToUse, distToUse, provToUse].filter(Boolean).join(', ')
    : [wardToUse, provToUse].filter(Boolean).join(', ')

  const smartPayload = `${orderData.recipientName}, ${cleanPhone10}, ${addrInfo.detailAddress}, ${fullLoc}`
  console.log('[Bookstore AI] Đang kích hoạt Smart Import SPX với payload chuẩn:', smartPayload)

  smartInput.focus()
  setInputValue(smartInput, smartPayload)
  smartInput.dispatchEvent(new Event('input', { bubbles: true }))
  smartInput.dispatchEvent(new Event('change', { bubbles: true }))
  await sleep(400)

  // Tìm nút "Tự động điền"
  let pasteBtn = findSmartImportButton()
  if (!pasteBtn) {
    await sleep(300)
    pasteBtn = findSmartImportButton()
  }

  if (pasteBtn) {
    console.log('[Bookstore AI] ĐANG BẤM NÚT "Tự động điền"...', pasteBtn)
    safelyClick(pasteBtn)
    await sleep(800) // Chờ engine nội bộ SPX phân tích và điền form hoàn tất

    // RÀNG BUỘC THEO YÊU CẦU NGƯỜI DÙNG:
    // "khi ấn tự động điền thì đã điền được rồi mà không cần phải ấn thêm vào địa chỉ chi tiết"
    // "ki tự động điền rồi thì giữ nguyên, không ấn hay gõ thêm vào địa chỉ chi tiết nưuax"
    // Rút sạch focus ra khỏi mọi ô input để đóng ngay popup gợi ý nếu có
    try {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }))
    } catch (_) { }

    console.log('[Bookstore AI] Đã bấm nút "Tự động điền"! GIỮ NGUYÊN toàn bộ Mục 2 người nhận, không ấn hay gõ thêm.')

    // RÀNG BUỘC THEO YÊU CẦU NGƯỜI DÙNG:
    // Kiểm tra ô Tỉnh / Huyện / Xã đã đúng chưa, nếu chưa đúng tự động chuyển 2 cấp <-> 3 cấp và điền lại
    try {
      isAutoCorrecting = true
      await verifyAndAutoCorrectSmartAddress(smartPayload, orderData)
    } finally {
      isAutoCorrecting = false
    }

    return true
  }

  console.warn('[Bookstore AI] Không tìm thấy nút Tự động điền!')
  return false
}

// ==================== 2.1. GIÁM SÁT VÀ TỰ ĐỘNG CHUYỂN ĐỔI 2 CẤP <-> 3 CẤP CHO ĐỊA CHỈ SPX ====================
let isAutoCorrecting = false

// Nhận diện loại địa chỉ hiện tại đang được chọn (CŨ 3 cấp hay MỚI 2 cấp)
function getCurrentAddressType(): 'OLD_3_LEVEL' | 'NEW_2_LEVEL' {
  const sec2 = findSectionContainer(['2. Địa chỉ người nhận', 'Địa chỉ người nhận']) || document.body
  const allLabels = Array.from(sec2.querySelectorAll('label, .ant-radio-wrapper')) as HTMLElement[]

  for (const lbl of allLabels) {
    const text = (lbl.textContent || '').trim().toLowerCase()
    const isChecked =
      lbl.classList.contains('ant-radio-wrapper-checked') ||
      lbl.querySelector('.ant-radio-checked') !== null ||
      (lbl.querySelector('input[type="radio"]') as HTMLInputElement)?.checked

    if (isChecked) {
      if (text.includes('2 cấp') || text.includes('mới')) return 'NEW_2_LEVEL'
      if (text.includes('3 cấp') || text.includes('cũ')) return 'OLD_3_LEVEL'
    }
  }

  const secRadios = Array.from(sec2.querySelectorAll('input[type="radio"]')) as HTMLInputElement[]
  if (secRadios.length >= 2) {
    if (secRadios[0].checked) return 'NEW_2_LEVEL'
    if (secRadios[1].checked) return 'OLD_3_LEVEL'
  }

  return 'OLD_3_LEVEL'
}

// Đọc giá trị địa chỉ đang hiển thị thực tế trong ô Cascader / Select Tỉnh / Quận-Huyện / Phường-Xã
function getDisplayedCascaderAddress(): string {
  const sec2 = findSectionContainer(['2. Địa chỉ người nhận', 'Địa chỉ người nhận']) || document.body

  // 1. Quét theo label chứa "Tỉnh"
  const labels = Array.from(sec2.querySelectorAll('label, div, span')).filter((el) => {
    if (el.children.length > 2) return false
    const t = (el.textContent || '').trim().toLowerCase()
    return t.includes('tỉnh /') || t.includes('tỉnh/quận') || t.includes('tỉnh/thành') || t.includes('phường-xã')
  }) as HTMLElement[]

  for (const lbl of labels) {
    let p: HTMLElement | null = lbl.closest('.ant-form-item, .form-item, div') || lbl.parentElement
    let depth = 0
    while (p && depth < 5) {
      const picker = p.querySelector(
        '.ant-cascader-picker, .ant-select, [class*="cascader"], [class*="select"], [role="combobox"]'
      ) as HTMLElement | null
      if (picker && isElementVisible(picker)) {
        const labelEl = picker.querySelector(
          '.ant-cascader-picker-label, .ant-select-selection-item, [class*="picker-label"], [class*="selection-item"]'
        )
        const text = (labelEl?.textContent || picker.textContent || '').replace(/\s+/g, ' ').trim()
        if (text && !text.includes('Please Select') && !text.includes('Vui lòng chọn')) {
          return text
        }
      }
      const inp = p.querySelector('input')
      if (inp && inp.value && isElementVisible(inp)) {
        return inp.value.trim()
      }
      p = p.parentElement
      depth++
    }
  }

  // 2. Fallback qua findCascaderTrigger()
  const trigger = findCascaderTrigger()
  if (trigger) {
    const labelEl = trigger.querySelector(
      '.ant-cascader-picker-label, .ant-select-selection-item, [class*="picker-label"], [class*="selection-item"]'
    )
    const text = (labelEl?.textContent || trigger.textContent || '').replace(/\s+/g, ' ').trim()
    if (text && !text.includes('Please Select') && !text.includes('Vui lòng chọn')) {
      return text
    }
  }

  return ''
}

// Kiểm tra xem SPX có hiển thị dòng cảnh báo màu cam "Địa chỉ này có thể chưa được khớp chính xác" không
function getSpxAddressWarningText(): string | null {
  const sec2 = findSectionContainer(['2. Địa chỉ người nhận', 'Địa chỉ người nhận']) || document.body
  const candidates = Array.from(sec2.querySelectorAll('div, span, p')).filter((el) => {
    if (el.children.length > 3) return false
    const t = (el.textContent || '').trim().toLowerCase()
    return (
      t.includes('chưa được khớp chính xác') ||
      t.includes('không khớp chính xác') ||
      t.includes('chưa khớp chính xác') ||
      t.includes('vui lòng kiểm tra và xác nhận') ||
      t.includes('địa chỉ này có thể chưa được khớp')
    )
  })
  if (candidates.length > 0) {
    return candidates[0].textContent?.trim() || 'Địa chỉ có thể chưa được khớp chính xác'
  }
  return null
}

// Kiểm tra xem địa chỉ hiển thị trong ô Cascader có khớp với đoạn text nhập vào không
function checkCascaderAddressMatches(
  displayedCascader: string,
  inputText: string,
  targetOrderData?: SpxOrderData
): { isMatch: boolean; reason: string } {
  if (!displayedCascader || displayedCascader.includes('Please Select') || displayedCascader.includes('Vui lòng chọn')) {
    return { isMatch: false, reason: 'Chưa có Tỉnh/Huyện/Xã nào được chọn' }
  }

  // 1. Kiểm tra cảnh báo từ SPX
  const spxWarning = getSpxAddressWarningText()
  if (spxWarning) {
    return { isMatch: false, reason: `SPX cảnh báo: "${spxWarning}"` }
  }

  // 2. Tách các cấp trong Cascader (SPX dùng dấu "/" ngăn cách các cấp)
  const parts = displayedCascader.split(/[\/,]/).map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) {
    return { isMatch: false, reason: 'Không phân tách được các cấp địa chỉ' }
  }

  const normInput = normalizeVnText(
    `${inputText} ${targetOrderData?.address || ''} ${targetOrderData?.province || ''} ${targetOrderData?.district || ''} ${targetOrderData?.ward || ''}`
  )

  // Cấp 1: Tỉnh / Thành phố
  const provRaw = parts[0]
  const provClean = normalizeVnText(stripAdminPrefixes(provRaw))
  const provOfficial = normalizeVnText(normalizeProvinceName(provRaw))

  const hasProvinceInInput =
    normInput.includes(provClean) ||
    normInput.includes(provOfficial) ||
    (provOfficial.includes('ho chi minh') && (normInput.includes('hcm') || normInput.includes('sai gon') || normInput.includes('tphcm'))) ||
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
      !!targetDistClean &&
      (distClean === targetDistClean || distClean.includes(targetDistClean) || targetDistClean.includes(distClean))
    const matchWardDirect =
      !!targetWardClean &&
      (wardClean === targetWardClean || wardClean.includes(targetWardClean) || targetWardClean.includes(wardClean))

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
      (!!targetWardClean && (secondClean === targetWardClean || secondClean.includes(targetWardClean) || targetWardClean.includes(secondClean))) ||
      (!!targetDistClean && (secondClean === targetDistClean || secondClean.includes(targetDistClean) || targetDistClean.includes(secondClean)))

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

// Bảng thông báo nổi cảnh báo địa chỉ SPX không khớp
function showAddressMismatchAlert(inputText: string, displayedCascader: string, reason: string) {
  removeAddressMismatchAlert()

  const alertBox = document.createElement('div')
  alertBox.id = 'spx-ai-address-mismatch-banner'
  alertBox.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999999;
    background: #fff2f0;
    border: 2px solid #ff4d4f;
    border-radius: 10px;
    padding: 14px 20px;
    box-shadow: 0 10px 30px rgba(255, 77, 79, 0.35);
    max-width: 650px;
    width: 90%;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #262626;
    animation: fadeInDown 0.3s ease;
  `

  alertBox.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 12px;">
      <div style="font-size: 26px; line-height: 1;">⚠️</div>
      <div style="flex: 1;">
        <div style="font-weight: 700; font-size: 15px; color: #cf1322; margin-bottom: 6px;">
          CẢNH BÁO: TỈNH / HUYỆN / XÃ KHÔNG KHỚP VỚI ĐỊA CHỈ NHẬP VÀO!
        </div>
        <div style="font-size: 13px; line-height: 1.5; color: #434343;">
          Hệ thống đã tự động thử cả <b>Địa chỉ 3 cấp</b> và <b>Địa chỉ 2 cấp</b> nhưng SPX vẫn không khớp chuẩn:<br/>
          • <b>Địa chỉ khách cung cấp:</b> <span style="color: #0958d9;">${inputText}</span><br/>
          • <b>SPX đang tự điền:</b> <span style="color: #cf1322; font-weight: 700;">${displayedCascader || '(Chưa chọn)'}</span><br/>
          • <b>Lý do lệch:</b> <span style="color: #d4380d; font-weight: 600;">${reason}</span>
        </div>
        <div style="margin-top: 10px; padding: 8px 12px; background: #fffbe6; border: 1px solid #ffe58f; border-radius: 6px; font-size: 13px; font-weight: 600; color: #d46b08;">
          👉 <b>HÀNH ĐỘNG CẦN LÀM:</b> Vui lòng bấm vào ô <u>Tỉnh / Quận-Huyện / Phường-Xã</u> (đang viền đỏ nhấp nháy bên dưới) để chọn thủ công đúng địa chỉ của khách!
        </div>
      </div>
      <button id="close-spx-address-alert" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #8c8c8c; padding: 0 4px;">✕</button>
    </div>
  `

  document.body.appendChild(alertBox)

  const closeBtn = alertBox.querySelector('#close-spx-address-alert')
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      alertBox.remove()
    })
  }

  setTimeout(() => {
    try { alertBox.remove() } catch (_) { }
  }, 30000)
}

function removeAddressMismatchAlert() {
  const existing = document.getElementById('spx-ai-address-mismatch-banner')
  if (existing) {
    existing.remove()
  }
}

function highlightCascaderWarning() {
  const trigger = findCascaderTrigger()
  if (trigger) {
    trigger.style.transition = 'all 0.3s ease'
    trigger.style.border = '2px solid #ff4d4f'
    trigger.style.backgroundColor = '#fff1f0'
    trigger.style.boxShadow = '0 0 12px rgba(255, 77, 79, 0.6)'
    try { trigger.scrollIntoView({ block: 'center', behavior: 'smooth' }) } catch (_) { }
  }
}

function highlightCascaderSuccess() {
  const trigger = findCascaderTrigger()
  if (trigger) {
    trigger.style.transition = 'all 0.3s ease'
    trigger.style.border = '2px solid #10b981'
    trigger.style.backgroundColor = '#ecfdf5'
    trigger.style.boxShadow = '0 0 8px rgba(16, 185, 129, 0.4)'
  }
}

/**
 * Thuật toán kiểm tra và tự động đổi 2 cấp <-> 3 cấp theo yêu cầu người dùng:
 * 1. Kiểm tra lại ô Tỉnh/Huyện/Xã đã đúng như text nhập vào chưa.
 * 2. Nếu chưa đúng: chuyển sang 2 cấp nếu đang là 3 cấp, hoặc chuyển sang 3 cấp nếu đang là 2 cấp.
 * 3. Bấm "Tự động điền" lại một lần nữa để kiểm tra.
 * 4. Nếu vẫn không chuẩn thì hiển thị thông báo cảnh báo nổi bật.
 */
async function verifyAndAutoCorrectSmartAddress(
  inputText: string,
  orderData?: SpxOrderData
): Promise<{ success: boolean; displayedCascader: string; errorReason?: string }> {
  // Tải orderData từ storage nếu chưa có
  if (!orderData) {
    try {
      const stored = await new Promise<any>((resolve) => {
        chrome.storage?.local?.get(['pendingSpxOrder', 'lastParsedOrder'], resolve)
      })
      orderData = stored?.pendingSpxOrder || stored?.lastParsedOrder
    } catch (_) { }
  }

  // 1. Chờ SPX cập nhật sau lần tự điền đầu
  await sleep(750)

  // Nếu SPX mở popup gợi ý địa chỉ chi tiết, chọn gợi ý phù hợp
  if (orderData) {
    const addrInfo = parseAddressComponents(orderData)
    await selectAddressSuggestionIfPresent(addrInfo)
  }

  let displayedCascader = getDisplayedCascaderAddress()
  const initialType = orderData?.addressType || getCurrentAddressType()

  console.log(`[Bookstore AI] 🔍 Kiểm tra địa chỉ lần 1 (Chế độ hiện tại: ${initialType}):`, {
    inputText,
    displayedCascader,
  })

  // Đánh giá khớp địa chỉ lần 1
  const firstCheck = checkCascaderAddressMatches(displayedCascader, inputText, orderData)

  if (firstCheck.isMatch) {
    console.log(`[Bookstore AI] ✅ Địa chỉ tự động điền lần 1 đã khớp chuẩn: "${displayedCascader}"`)
    removeAddressMismatchAlert()
    highlightCascaderSuccess()
    return { success: true, displayedCascader }
  }

  // NẾU CHƯA ĐÚNG THÌ PHẢI CHUYỂN QUA ĐỊA CHỈ 2 CẤP NẾU ĐANG LÀ 3 CẤP VÀ CHUYỂN VỀ 3 CẤP NẾU ĐANG LÀ 2 CẤP
  const alternateType = initialType === 'OLD_3_LEVEL' ? 'NEW_2_LEVEL' : 'OLD_3_LEVEL'
  console.warn(
    `[Bookstore AI] ⚠️ Địa chỉ lần 1 CHƯA ĐÚNG (${firstCheck.reason}). Tự động đổi từ ${initialType} sang ${alternateType} và bấm "Tự động điền" lại...`
  )

  // a. Đổi radio loại địa chỉ
  selectAddressTypeRadio(alternateType)
  await sleep(500)

  // b. Đảm bảo ô Nhập tự động có nội dung
  const smartInput = findSmartImportInput()
  if (smartInput && (!smartInput.value || smartInput.value.trim() === '')) {
    setInputValue(smartInput, inputText)
    await sleep(250)
  }

  // c. VÀ ẤN TỰ ĐỘNG ĐIỀN LẠI MỘT LẦN NỮA ĐỂ KIỂM TRA
  const pasteBtn = findSmartImportButton()
  if (pasteBtn) {
    console.log(`[Bookstore AI] Đang bấm lại nút "Tự động điền" lần 2 (chế độ ${alternateType})...`)
    safelyClick(pasteBtn)
    await sleep(950)
  }

  // Xử lý gợi ý popup nếu có
  if (orderData) {
    const addrInfo = parseAddressComponents(orderData)
    await selectAddressSuggestionIfPresent(addrInfo)
  }

  try {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }))
  } catch (_) { }

  // 4. KIỂM TRA LẠI LẦN 2
  displayedCascader = getDisplayedCascaderAddress()
  const secondCheck = checkCascaderAddressMatches(displayedCascader, inputText, orderData)

  if (secondCheck.isMatch) {
    console.log(`[Bookstore AI] ✅ Đổi sang ${alternateType} thành công! Địa chỉ đã khớp: "${displayedCascader}"`)
    removeAddressMismatchAlert()
    highlightCascaderSuccess()
    return { success: true, displayedCascader }
  }

  // NẾU MÀ VẪN KO CHUẨN THÌ THÔNG BÁO LẠI
  console.error(`[Bookstore AI] ❌ Địa chỉ vẫn KHÔNG CHUẨN sau khi thử cả 2 cấp và 3 cấp!`, {
    inputText,
    displayedCascader,
    reason: secondCheck.reason,
  })

  // Khôi phục lại chế độ ban đầu (tránh để SPX bị kẹt ở chế độ bị đảo ngược khi người dùng đã chọn C3)
  if (initialType && getCurrentAddressType() !== initialType) {
    console.warn(`[Bookstore AI] Khôi phục lại loại địa chỉ ban đầu (${initialType}) sau khi thử cả 2 chế độ...`)
    selectAddressTypeRadio(initialType)
  }

  showAddressMismatchAlert(inputText, displayedCascader, secondCheck.reason)
  highlightCascaderWarning()

  try {
    chrome.storage?.local?.set({
      lastSpxAddressAlert: {
        time: Date.now(),
        inputText,
        displayedCascader,
        reason: secondCheck.reason,
      },
    })
  } catch (_) { }

  return {
    success: false,
    displayedCascader,
    errorReason: secondCheck.reason,
  }
}

// Lắng nghe người dùng bấm nút "Tự động điền" thủ công trên trang SPX để giám sát & tự động sửa/chuyển đổi
function attachSmartImportObserver() {
  document.addEventListener(
    'click',
    (e) => {
      if (isAutoCorrecting) return
      const target = e.target as HTMLElement | null
      if (!target) return

      const btn = target.closest('button, a, span, div')
      if (!btn) return
      const text = (btn.textContent || '').trim().toLowerCase()
      if (
        text === 'tự động điền' ||
        text === 'dán và nhập tự động' ||
        text === 'tự động nhập' ||
        text === 'dán và nhập'
      ) {
        console.log('[Bookstore AI] Bắt được thao tác bấm nút "Tự động điền" trên trang!')
        const smartInput = findSmartImportInput()
        const inputText = (smartInput?.value || '').trim()
        if (!inputText || inputText.length < 5) return

        setTimeout(async () => {
          if (isAutoCorrecting) return
          try {
            isAutoCorrecting = true
            await verifyAndAutoCorrectSmartAddress(inputText)
          } finally {
            isAutoCorrecting = false
          }
        }, 850)
      }
    },
    true
  )
}

// ==================== 3. TÌM VÀ ĐIỀN DROPDOWN CASCADER (TỈNH / HUYỆN / XÃ) ====================
function findCascaderTrigger(): HTMLElement | null {
  const sec2 = findSectionContainer(['2. Địa chỉ người nhận', 'Địa chỉ người nhận']) || document.body

  // Cách 1: Tìm phần tử có text "Please Select" hoặc "Vui lòng chọn"
  const pleaseSelectEls = Array.from(sec2.querySelectorAll('*')).filter((el) => {
    if (el.children.length > 0) return false
    const t = (el.textContent || '').trim()
    return t === 'Please Select' || t === 'Vui lòng chọn'
  }) as HTMLElement[]

  for (const el of pleaseSelectEls) {
    let cur: HTMLElement | null = el
    let depth = 0
    while (cur && cur !== sec2 && depth < 6) {
      if (
        cur.classList.contains('ant-cascader-picker') ||
        cur.classList.contains('ant-select') ||
        cur.classList.contains('ant-cascader') ||
        cur.getAttribute('role') === 'combobox' ||
        cur.classList.contains('ant-select-selector') ||
        cur.querySelector('input')
      ) {
        if (isElementVisible(cur)) return cur
      }
      cur = cur.parentElement
      depth++
    }
    return el.parentElement || el
  }

  // Cách 2: Tìm theo form item dưới label có chứa "Tỉnh /"
  const labels = Array.from(sec2.querySelectorAll('label, div, span')).filter((el) => {
    if (el.children.length > 2) return false
    const t = (el.textContent || '').trim().toLowerCase()
    return t.includes('tỉnh /') || t.includes('tỉnh/quận') || t.includes('tỉnh/thành') || t.includes('phường-xã')
  }) as HTMLElement[]

  for (const lbl of labels) {
    let p = lbl.parentElement
    let depth = 0
    while (p && p !== sec2 && depth < 6) {
      if (p.classList.contains('ant-form-item') || p.classList.contains('form-item') || p.children.length >= 2) {
        const picker = p.querySelector(
          '.ant-cascader-picker, .ant-select, [class*="cascader"], [class*="select"], [role="combobox"]'
        ) as HTMLElement
        if (picker && isElementVisible(picker)) return picker
        const inp = p.querySelector('input')
        if (inp && isElementVisible(inp)) return inp.parentElement || inp
      }
      p = p.parentElement
      depth++
    }
  }

  return null
}

function openCascader(trigger: HTMLElement) {
  if (!trigger) return
  try { trigger.scrollIntoView({ block: 'center' }) } catch (_) { }
  const innerInput = trigger.querySelector('input')
  const arrow = trigger.querySelector('[class*="arrow"], svg, i')
  const opts = { bubbles: true, cancelable: true, view: window }

  try {
    trigger.dispatchEvent(new PointerEvent('pointerdown', opts))
    trigger.dispatchEvent(new PointerEvent('pointerup', opts))
  } catch (_) { }

  if (innerInput) {
    try { innerInput.focus() } catch (_) { }
    safelyClick(innerInput)
  }

  safelyClick(trigger)

  if (arrow) {
    safelyClick(arrow)
  }
}

// Chờ menu column xuất hiện trong popup Ant Design / SPX Cascader
async function waitForMenuColumn(colIndex: number, maxWaitMs = 3000): Promise<HTMLElement | null> {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    // 1. Selector Ant Design / SPX
    const menus = Array.from(
      document.querySelectorAll(
        '.ant-cascader-menu, [class*="cascader-menu"], [class*="cascader-menus"] > div, [class*="cascader-menus"] > ul, .ant-cascader-menus ul, ul[role="menu"], [class*="cascader"] ul, [role="listbox"], [class*="dropdown-menu"]'
      )
    ).filter(isElementVisible) as HTMLElement[]

    if (menus.length > colIndex && menus[colIndex].children.length > 0) {
      return menus[colIndex]
    }

    // 2. Fallback Universal: Tìm container có chứa ít nhất 2 tên tỉnh thành Việt Nam
    if (colIndex === 0) {
      const candidates = Array.from(document.querySelectorAll('div, ul')).filter((el) => {
        if (!isElementVisible(el)) return false
        const text = (el.textContent || '').toLowerCase()
        const hasHanoi = text.includes('hà nội') || text.includes('ha noi')
        const hasHcm = text.includes('hồ chí minh') || text.includes('ho chi minh')
        const hasDanang = text.includes('đà nẵng') || text.includes('da nang')
        return (hasHanoi && hasHcm) || (hasHanoi && hasDanang) || (hasHcm && hasDanang)
      }) as HTMLElement[]

      if (candidates.length > 0) {
        candidates.sort((a, b) => (a.textContent?.length || 0) - (b.textContent?.length || 0))
        return candidates[0]
      }
    }

    await sleep(100)
  }
  return null
}

// Khớp và click phần tử trong danh sách menu Cascader, hỗ trợ cuộn sâu Virtual List
async function scrollAndFindItem(targetMenu: HTMLElement, queryText: string, levelName: string): Promise<boolean> {
  if (!queryText) return false
  const clean = normalizeVnText(queryText)
  const strippedQuery = stripAdminPrefixes(clean)
  console.log(`[Bookstore AI] Đang tìm ${levelName}: "${queryText}" (chuẩn hóa: "${clean}", stripped: "${strippedQuery}")...`)

  // 1. Quét trước toàn bộ DOM của targetMenu (Ant Design Cascader thường render toàn bộ các mục trong ul)
  const allExistingItems = Array.from(
    targetMenu.querySelectorAll('li, div[role="menuitem"], .ant-cascader-menu-item, [role="menuitem"], [class*="menu-item"]')
  ) as HTMLElement[]

  for (const it of allExistingItems) {
    const text = normalizeVnText(it.textContent || it.getAttribute('title') || '')
    const strippedText = stripAdminPrefixes(text)

    const isMatch =
      text === clean ||
      strippedText === strippedQuery ||
      (strippedText.length >= 3 && strippedQuery.includes(strippedText)) ||
      (strippedQuery.length >= 3 && strippedText.includes(strippedQuery))

    if (isMatch) {
      console.log(`[Bookstore AI] ĐÃ TÌM THẤY ${levelName}: "${it.textContent?.trim()}" ngay trong DOM!`)
      it.scrollIntoView({ block: 'center' })
      await sleep(100)
      dispatchMouseClick(it)
      try { it.click() } catch (_) { }
      try { it.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true })) } catch (_) { }
      return true
    }
  }

  // 2. Thử tối đa 20 bước cuộn nếu là virtual scroll
  for (let step = 0; step < 20; step++) {
    const items = Array.from(
      targetMenu.querySelectorAll('li, div[role="menuitem"], .ant-cascader-menu-item, [role="menuitem"], [class*="menu-item"], [class*="node"], div')
    ).filter((it) => {
      const t = (it.textContent || '').trim()
      return t.length >= 2 && t.length < 50 && it.children.length <= 2
    }) as HTMLElement[]

    // 1. Khớp chính xác tuyệt đối hoặc tương đối
    for (const it of items) {
      const text = normalizeVnText(it.textContent || it.getAttribute('title') || '')
      const strippedText = stripAdminPrefixes(text)

      const isMatch =
        text === clean ||
        strippedText === strippedQuery ||
        (strippedText.length >= 3 && strippedQuery.includes(strippedText)) ||
        (strippedQuery.length >= 3 && strippedText.includes(strippedQuery))

      if (isMatch) {
        console.log(`[Bookstore AI] ĐÃ TÌM THẤY ${levelName}: "${it.textContent?.trim()}" tại bước cuộn ${step}!`)
        it.scrollIntoView({ block: 'center' })
        await sleep(100)
        dispatchMouseClick(it)
        try { it.click() } catch (_) { }
        try { it.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true })) } catch (_) { }
        return true
      }
    }

    // 2. Fallback theo số (ví dụ Phường 3 -> số 3)
    const numMatch = queryText.match(/\d+/)
    if (numMatch) {
      const targetNum = parseInt(numMatch[0], 10)
      for (const it of items) {
        const itText = it.textContent || ''
        const itNumMatch = itText.match(/\d+/)
        if (itNumMatch && parseInt(itNumMatch[0], 10) === targetNum) {
          console.log(`[Bookstore AI] Khớp theo số ${levelName}: "${itText.trim()}" (số ${targetNum})`)
          it.scrollIntoView({ block: 'center' })
          await sleep(100)
          dispatchMouseClick(it)
          try { it.click() } catch (_) { }
          try { it.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true })) } catch (_) { }
          return true
        }
      }
    }

    // 3. CUỘN XUỐNG
    targetMenu.scrollTop += 220
    const parent = targetMenu.parentElement
    if (parent) parent.scrollTop += 220
    await sleep(80)
  }

  console.warn(`[Bookstore AI] Không tìm thấy ${levelName}: "${queryText}"!`)
  return false
}

async function selectCascaderAddress(
  province: string,
  district?: string,
  ward?: string
): Promise<boolean> {
  const trigger = findCascaderTrigger()
  if (!trigger) {
    console.warn('[Bookstore AI] Không tìm thấy dropdown Cascader Tỉnh/Huyện/Xã!')
    return false
  }

  const currentText = (trigger.textContent || '').trim()
  const normProv = normalizeVnText(province)
  const normDist = district ? normalizeVnText(district) : ''
  const normWard = ward ? normalizeVnText(ward) : ''
  const normCurrent = normalizeVnText(currentText)

  const isAlreadySelected =
    currentText &&
    !currentText.includes('Please Select') &&
    !currentText.includes('Vui lòng chọn') &&
    normCurrent.includes(stripAdminPrefixes(normProv)) &&
    (!normDist || normCurrent.includes(stripAdminPrefixes(normDist))) &&
    (!normWard || normCurrent.includes(stripAdminPrefixes(normWard)))

  if (isAlreadySelected) {
    console.log('[Bookstore AI] Dropdown Tỉnh/Huyện/Xã đã chọn đúng từ trước:', currentText)
    return true
  }

  console.log(`[Bookstore AI] Bắt đầu mở Cascader để chọn: ${province} > ${district || ''} > ${ward || ''}`)
  openCascader(trigger)

  // CỘT 0: TỈNH / THÀNH PHỐ
  const menu0 = await waitForMenuColumn(0)
  if (!menu0) {
    console.warn('[Bookstore AI] Cột 0 Cascader không xuất hiện!')
    return false
  }

  const provToClick = normalizeProvinceName(province)
  const ok0 = await scrollAndFindItem(menu0, provToClick, 'Tỉnh/Thành')
  if (!ok0) return false

  // CỘT 1: QUẬN / HUYỆN (3 CẤP) HOẶC PHƯỜNG / XÃ (2 CẤP)
  const menu1 = await waitForMenuColumn(1)
  if (!menu1) {
    console.warn('[Bookstore AI] Cột 1 Cascader không xuất hiện sau khi chọn Tỉnh!')
    return false
  }

  if (district) {
    // Chế độ 3 cấp: Cột 1 là Quận/Huyện
    const ok1 = await scrollAndFindItem(menu1, district, 'Quận/Huyện')
    if (!ok1) return false

    // CỘT 2: PHƯỜNG / XÃ
    if (ward) {
      const menu2 = await waitForMenuColumn(2)
      if (menu2) {
        await scrollAndFindItem(menu2, ward, 'Phường/Xã')
      }
    }
  } else if (ward) {
    // Chế độ 2 cấp: Cột 1 là Phường/Xã
    await scrollAndFindItem(menu1, ward, 'Phường/Xã')
  }

  await sleep(350)
  return true
}

// ==================== 4. BỘ TÌM KIẾM CÁC TRƯỜNG NHẬP LIỆU FORM ====================
// 1. Tìm ô "* Điện thoại"
function findPhoneField(): HTMLInputElement | null {
  const sec2 = findSectionContainer(['2. Địa chỉ người nhận', 'Địa chỉ người nhận']) || document.body

  // Chiến lược A: Phần tử có text "+84" trong Section 2
  const plus84Elements = Array.from(sec2.querySelectorAll('*')).filter((el) => {
    if (el.children.length > 1) return false
    const t = el.textContent?.trim() || ''
    return t === '+84' || t.startsWith('+84')
  }) as HTMLElement[]

  for (const el of plus84Elements) {
    const wrapper = el.closest('.ant-input-affix-wrapper, .ant-input-group, .ant-input-wrapper, .input-group, div')
    if (wrapper) {
      const inp = wrapper.querySelector(
        'input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])'
      ) as HTMLInputElement
      if (inp && isElementVisible(inp)) return inp
    }
    const sibling = el.nextElementSibling
    if (sibling) {
      const inp = sibling.tagName === 'INPUT' ? (sibling as HTMLInputElement) : (sibling.querySelector('input') as HTMLInputElement)
      if (inp && isElementVisible(inp)) return inp
    }
    const parent = el.parentElement
    if (parent) {
      const inp = parent.querySelector('input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])') as HTMLInputElement
      if (inp && isElementVisible(inp)) return inp
    }
  }

  // Chiến lược B: Label chứa "Điện thoại" trong Section 2
  const labels = Array.from(sec2.querySelectorAll('label, div, span')).filter((el) => {
    if (el.children.length > 2) return false
    const t = (el.textContent || '').trim().toLowerCase()
    return (t.includes('điện thoại') || t.includes('phone')) && !t.includes('người gửi') && t.length < 30
  }) as HTMLElement[]

  for (const lbl of labels) {
    let p = lbl.closest('.ant-form-item, .form-item') || lbl.parentElement
    let depth = 0
    while (p && p !== sec2 && depth < 5) {
      const inp = p.querySelector(
        'input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])'
      ) as HTMLInputElement
      if (inp && isElementVisible(inp)) return inp
      p = p.parentElement
      depth++
    }
  }

  return null
}

// 2. Tìm ô "* Tên"
function findNameField(phoneEl?: HTMLInputElement | null): HTMLInputElement | null {
  const sec2 = findSectionContainer(['2. Địa chỉ người nhận', 'Địa chỉ người nhận']) || document.body
  const labels = Array.from(sec2.querySelectorAll('label, div, span')).filter((el) => {
    if (el.children.length > 2) return false
    const t = (el.textContent || '').trim().toLowerCase()
    const isName =
      t === '* tên' ||
      t === 'tên' ||
      t === '* tên người nhận' ||
      t === 'tên người nhận' ||
      t === '* họ và tên' ||
      t === 'họ và tên'
    return isName && !t.includes('người gửi') && !t.includes('sản phẩm') && !t.includes('đường')
  }) as HTMLElement[]

  for (const lbl of labels) {
    let p = lbl.parentElement
    let depth = 0
    while (p && depth < 5) {
      const inps = Array.from(
        p.querySelectorAll('input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])')
      ) as HTMLInputElement[]
      for (const inp of inps) {
        if (inp !== phoneEl && isElementVisible(inp)) return inp
      }
      p = p.parentElement
      depth++
    }
  }

  if (phoneEl) {
    let row: HTMLElement | null = phoneEl.parentElement
    let depth = 0
    while (row && depth < 5) {
      const inps = Array.from(
        row.querySelectorAll('input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])')
      ) as HTMLInputElement[]
      const candidates = inps.filter((i) => i !== phoneEl && isElementVisible(i))
      if (candidates.length === 1) return candidates[0]

      const nextCol = row.nextElementSibling
      if (nextCol) {
        const nextInp = nextCol.querySelector(
          'input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])'
        ) as HTMLInputElement
        if (nextInp && nextInp !== phoneEl && isElementVisible(nextInp)) return nextInp
      }
      row = row.parentElement
      depth++
    }
  }

  return null
}

// 3. Tìm ô "* Địa chỉ chi tiết"
function findAddressDetailField(): HTMLInputElement | HTMLTextAreaElement | null {
  const sec2 = findSectionContainer(['2. Địa chỉ người nhận', 'Địa chỉ người nhận']) || document.body
  const labels = Array.from(sec2.querySelectorAll('label, div, span')).filter((el) => {
    if (el.children.length > 2) return false
    const t = (el.textContent || '').trim().toLowerCase()
    return (
      (t.includes('địa chỉ chi tiết') || t === 'địa chỉ' || t === '* địa chỉ chi tiết') &&
      !t.includes('người gửi') &&
      t.length < 35
    )
  }) as HTMLElement[]

  for (const lbl of labels) {
    let p = lbl.parentElement
    let depth = 0
    while (p && depth < 5) {
      const inp = p.querySelector(
        'input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]), textarea'
      ) as HTMLInputElement | HTMLTextAreaElement
      if (inp && isElementVisible(inp)) return inp
      p = p.parentElement
      depth++
    }
  }

  return null
}

// 3.5. Tự động click chọn địa chỉ gợi ý nếu SPX mở popup gợi ý địa chỉ
async function selectAddressSuggestionIfPresent(addrInfo: any): Promise<boolean> {
  const detailInput = findAddressDetailField()
  const inputRect = detailInput ? detailInput.getBoundingClientRect() : null

  const wardNorm = normalizeVnText(addrInfo.formattedWard || addrInfo.ward || '')
  const distNorm = normalizeVnText(addrInfo.district || '')
  const provNorm = normalizeVnText(addrInfo.province || '')
  const detailNorm = normalizeVnText(addrInfo.detailAddress || '')

  console.log('[Bookstore AI] Kiểm tra bảng gợi ý địa chỉ chi tiết...', {
    wardNorm,
    distNorm,
    provNorm,
    detailNorm,
  })

  // Đợi tối đa 1.2s xem có dropdown xuất hiện không
  const start = Date.now()
  while (Date.now() - start < 1200) {
    // 1. Quét theo selector Ant Design / SPX AutoComplete
    const dropdownContainers = Array.from(
      document.querySelectorAll(
        '.ant-select-dropdown:not(.ant-select-dropdown-hidden), [class*="auto-complete-dropdown"], [class*="dropdown-menu"], div[role="listbox"], [class*="address-dropdown"], [class*="suggestion"]'
      )
    ).filter((el) => isElementVisible(el)) as HTMLElement[]

    // 2. Tìm các mục option gợi ý
    let candidateItems: HTMLElement[] = []

    for (const dd of dropdownContainers) {
      const items = Array.from(
        dd.querySelectorAll('[role="option"], .ant-select-item-option, .ant-select-item, li, [class*="item"]')
      ).filter(isElementVisible) as HTMLElement[]
      if (items.length > 0) {
        candidateItems = items
        break
      }
    }

    if (candidateItems.length === 0 && inputRect && inputRect.width > 0) {
      const nearby = Array.from(document.querySelectorAll('*')).filter((el) => {
        if (!isElementVisible(el)) return false
        if (el === detailInput || el.contains(detailInput!) || detailInput!.contains(el)) return false
        if (el.tagName === 'INPUT' || el.tagName === 'BUTTON') return false

        const r = el.getBoundingClientRect()
        const isBelow = r.top >= inputRect.bottom - 15 && r.top <= inputRect.bottom + 360
        const isOverlapX = Math.max(r.left, inputRect.left) < Math.min(r.right, inputRect.right) + 40
        if (!isBelow || !isOverlapX) return false

        const text = (el.textContent || '').trim()
        if (!text || text.length < 5 || text.length > 250) return false
        return r.height >= 25 && r.height <= 95
      }) as HTMLElement[]

      if (nearby.length > 0) {
        candidateItems = nearby
      }
    }

    if (candidateItems.length > 0) {
      console.log(`[Bookstore AI] Phát hiện ${candidateItems.length} gợi ý địa chỉ chi tiết trong popup!`)

      // Tìm item khớp tốt nhất theo Phường/Xã > Quận/Huyện > Tỉnh > Số nhà
      let bestItem: HTMLElement | null = null
      let highestScore = -1

      for (const item of candidateItems) {
        const textNorm = normalizeVnText(item.textContent || '')
        let score = 0

        if (wardNorm && textNorm.includes(wardNorm)) score += 10
        if (distNorm && textNorm.includes(distNorm)) score += 5
        if (provNorm && textNorm.includes(provNorm)) score += 3
        if (detailNorm && textNorm.includes(detailNorm)) score += 2

        if (score > highestScore) {
          highestScore = score
          bestItem = item
        }
      }

      const target = highestScore > 0 && bestItem ? bestItem : candidateItems[0]
      console.log('[Bookstore AI] Đang click chọn địa chỉ chi tiết tối ưu từ gợi ý:', target.textContent?.trim())

      target.scrollIntoView({ block: 'nearest' })
      await sleep(60)
      dispatchMouseClick(target)
      try { target.click() } catch (_) { }

      const firstChild = target.firstElementChild as HTMLElement | null
      if (firstChild) {
        dispatchMouseClick(firstChild)
        try { firstChild.click() } catch (_) { }
      }

      await sleep(350)
      return true
    }

    await sleep(150)
  }

  return false
}

// 4. Tìm ô "Tiền thu hộ (COD)" trong Section 5: Dịch vụ
function findCodField(): HTMLInputElement | null {
  const sec5 = findSectionContainer(['5. Dịch vụ', 'Dịch vụ'])
  const searchRoot = sec5 || document.body

  // Đảm bảo checkbox "Tiền thu hộ (COD)" được tick
  const codCheckboxLabels = Array.from(searchRoot.querySelectorAll('label, .ant-checkbox-wrapper, span')).filter((el) => {
    const t = (el.textContent || '').trim().toLowerCase()
    return t.includes('tiền thu hộ') || t.includes('thu hộ (cod)')
  }) as HTMLElement[]

  for (const lbl of codCheckboxLabels) {
    const cb = lbl.querySelector('input[type="checkbox"]') as HTMLInputElement
    if (cb && !cb.checked) {
      console.log('[Bookstore AI] Đang kích hoạt checkbox Tiền thu hộ (COD)...')
      safelyClick(cb)
      cb.dispatchEvent(new Event('change', { bubbles: true }))
    }
  }

  // Tìm input có prefix "đ" hoặc "đ |"
  const dongElements = Array.from(searchRoot.querySelectorAll('*')).filter((el) => {
    if (el.children.length > 0) return false
    const t = el.textContent?.trim() || ''
    return t === 'đ' || t === 'đ |' || t === 'đ|' || t === 'VND'
  }) as HTMLElement[]

  for (const dong of dongElements) {
    const wrapper = dong.closest('.ant-input-affix-wrapper, .ant-input-group, .ant-input-number, div')
    if (wrapper) {
      const inp = wrapper.querySelector('input:not([type="checkbox"]):not([type="radio"])') as HTMLInputElement
      if (inp && isElementVisible(inp)) return inp
    }
    const parent = dong.parentElement
    if (parent) {
      const inp = parent.querySelector('input:not([type="checkbox"]):not([type="radio"])') as HTMLInputElement
      if (inp && isElementVisible(inp)) return inp
    }
  }

  // Tìm theo label "Tiền thu hộ"
  for (const lbl of codCheckboxLabels) {
    let p: HTMLElement | null = lbl.parentElement
    let depth = 0
    while (p && depth < 5) {
      const inps = Array.from(
        p.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])')
      ) as HTMLInputElement[]
      const visible = inps.filter(isElementVisible)
      if (visible.length > 0) return visible[0]
      p = p.parentElement
      depth++
    }
  }

  return null
}

// 5. Tìm ô "Lưu ý của người bán" (Ghi chú trong Section 6)
function findNotesField(): HTMLTextAreaElement | HTMLInputElement | null {
  const elements = Array.from(
    document.querySelectorAll('textarea, input:not([type="hidden"])')
  ) as Array<HTMLTextAreaElement | HTMLInputElement>

  for (const el of elements) {
    const ph = (el.getAttribute('placeholder') || '').toLowerCase()
    if (ph.includes('lưu ý') || ph.includes('ghi chú')) {
      if (isElementVisible(el)) return el
    }
  }

  const labels = Array.from(document.querySelectorAll('label, div, span, p')).filter((el) => {
    if (el.children.length > 2) return false
    const t = (el.textContent || '').trim().toLowerCase()
    return t.includes('lưu ý của người bán') || t.includes('lưu ý') || t.includes('ghi chú')
  }) as HTMLElement[]

  for (const lbl of labels) {
    let p = lbl.parentElement
    let depth = 0
    while (p && depth < 5) {
      const inp = p.querySelector('textarea, input:not([type="hidden"])') as HTMLTextAreaElement | HTMLInputElement
      if (inp && isElementVisible(inp)) return inp
      p = p.parentElement
      depth++
    }
  }

  return null
}

// Kiểm tra xem một phần tử có nằm bên trong Section 2 (Địa chỉ người nhận) hay không
function isInsideSection2(el: Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false
  const sec2 = findSectionContainer(['2. Địa chỉ người nhận', 'Địa chỉ người nhận'])
  if (sec2) {
    return sec2.contains(el)
  }
  let cur: HTMLElement | null = el
  let depth = 0
  while (cur && cur !== document.body && depth < 4) {
    const t = (cur.textContent || '').toLowerCase()
    if (t.includes('2. địa chỉ người nhận') || t.includes('nhập tự động')) {
      return true
    }
    cur = cur.parentElement
    depth++
  }
  return false
}

// Helper tìm thẻ card chứa Section 4 (TUYỆT ĐỐI KHÔNG BAO GỒM SECTION 2 HAY THẺ FORM TOÀN TRANG)
function findSection4Card(): HTMLElement {
  // 1. Quét tìm heading "4. Thông tin bưu gửi" hoặc "Thông tin bưu gửi"
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, div, span, p')).filter((el) => {
    if (el.children.length > 2) return false
    const t = (el.textContent || '').trim().toLowerCase()
    return t.includes('thông tin bưu gửi') || t.includes('thong tin buu gui')
  }) as HTMLElement[]

  for (const h of headings) {
    if (!isElementVisible(h)) continue
    // Leo lên thẻ .ant-card hoặc container gần nhất
    const card = h.closest('.ant-card, [class*="card"]') as HTMLElement | null
    if (card && card !== document.body && card.tagName !== 'FORM') {
      if (card.querySelectorAll('input').length >= 1 && !isInsideSection2(card)) {
        return card
      }
    }

    let cur: HTMLElement | null = h.parentElement
    while (cur && cur !== document.body && cur.tagName !== 'FORM') {
      const inps = cur.querySelectorAll('input')
      const text = (cur.textContent || '').toLowerCase()
      if (inps.length >= 1 && !text.includes('2. địa chỉ người nhận') && !text.includes('1. địa chỉ người gửi')) {
        return cur
      }
      cur = cur.parentElement
    }
  }

  // 2. Fallback: Tìm từ checkbox "Lưu vào danh sách sản phẩm" (chắc chắn chỉ có trong Section 4)
  const allCheckboxLabels = Array.from(document.querySelectorAll('label, span, div')).filter((el) => {
    return el.children.length === 0 && (el.textContent || '').trim().toLowerCase().includes('lưu vào danh sách sản phẩm')
  })

  for (const lbl of allCheckboxLabels) {
    const card = lbl.closest('.ant-card, [class*="card"], div')
    if (card && card !== document.body && card.tagName !== 'FORM' && !isInsideSection2(card as HTMLElement)) {
      return card as HTMLElement
    }
  }

  // 3. Fallback: Tìm từ nhãn "giá sản phẩm" hoặc "giá trị bưu gửi"
  const priceLabels = Array.from(document.querySelectorAll('label, span, div')).filter((el) => {
    const t = (el.textContent || '').trim().toLowerCase()
    return (t === 'giá sản phẩm' || t === '* giá trị bưu gửi' || t === 'giá trị bưu gửi') && !isInsideSection2(el as HTMLElement)
  })
  for (const lbl of priceLabels) {
    const card = lbl.closest('.ant-card, [class*="card"], div')
    if (card && card !== document.body && card.tagName !== 'FORM' && !isInsideSection2(card as HTMLElement)) {
      return card as HTMLElement
    }
  }

  return document.body
}

// Helper tìm container Select của ô Tên sản phẩm trong Section 4
function findProductNameSelect(sec4Card: HTMLElement): HTMLElement | null {
  // 1. Quét theo label "* Tên sản phẩm" hoặc "Tên sản phẩm"
  const labels = Array.from(sec4Card.querySelectorAll('label, div, span, p')).filter((el) => {
    if (el.children.length > 2 || isInsideSection2(el)) return false
    const t = (el.textContent || '').trim().toLowerCase()
    return t === '* tên sản phẩm' || t === 'tên sản phẩm'
  }) as HTMLElement[]

  for (const lbl of labels) {
    let p: HTMLElement | null = lbl.closest('.ant-form-item, .form-item, div') || lbl.parentElement
    let depth = 0
    while (p && depth < 5) {
      const select = p.querySelector('.ant-select, [class*="select"]') as HTMLElement | null
      if (select && isElementVisible(select) && !isInsideSection2(select)) return select
      p = p.parentElement
      depth++
    }
  }

  // 2. Tìm .ant-select đầu tiên trong Section 4
  const firstSelect = sec4Card.querySelector('.ant-select') as HTMLElement | null
  if (firstSelect && isElementVisible(firstSelect) && !isInsideSection2(firstSelect)) {
    return firstSelect
  }

  return null
}

// Helper tìm ô input Tên sản phẩm trong Section 4
function findProductNameInput(sec4Card: HTMLElement): HTMLInputElement | null {
  // 1. Quét theo label "* Tên sản phẩm" hoặc "Tên sản phẩm" (không nằm trong Section 2)
  const labels = Array.from(sec4Card.querySelectorAll('label, div, span, p')).filter((el) => {
    if (el.children.length > 2 || isInsideSection2(el)) return false
    const t = (el.textContent || '').trim().toLowerCase()
    return t === '* tên sản phẩm' || t === 'tên sản phẩm'
  }) as HTMLElement[]

  for (const lbl of labels) {
    let p: HTMLElement | null = lbl.closest('.ant-form-item, .form-item, div') || lbl.parentElement
    let depth = 0
    while (p && depth < 5) {
      const inp = p.querySelector('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])') as HTMLInputElement
      if (inp && isElementVisible(inp) && !isInsideSection2(inp)) return inp
      p = p.parentElement
      depth++
    }
  }

  // 2. Quét theo placeholder
  const inps = Array.from(
    sec4Card.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])')
  ).filter((inp) => isElementVisible(inp) && !isInsideSection2(inp)) as HTMLInputElement[]

  for (const inp of inps) {
    const ph = (inp.getAttribute('placeholder') || '').toLowerCase()
    if (ph.includes('sản phẩm') || ph.includes('tạo thêm') || ph.includes('chọn hoặc')) {
      return inp
    }
  }

  return inps.length > 0 ? inps[0] : null
}

// Helper click vào ô gợi ý sản phẩm hiển thị ngay dưới ô Tên sản phẩm trên SPX
async function clickProductSuggestion(prodInput: HTMLElement, typedText: string): Promise<boolean> {
  const inputRect = prodInput.getBoundingClientRect()
  const cleanTyped = normalizeVnText(typedText)
  console.log('[Bookstore AI] Đang tìm và click ô gợi ý sản phẩm cho:', typedText)

  const startTime = Date.now()
  while (Date.now() - startTime < 3500) {
    // 1. Quét theo dropdown Ant Design Select / AutoComplete của SPX
    const dropOptions = Array.from(
      document.querySelectorAll(
        '.ant-select-dropdown:not(.ant-select-dropdown-hidden) [role="option"], .ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option, .ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item, [class*="suggestion"] li, [class*="dropdown"] li, [class*="product"] li'
      )
    ).filter((el) => isElementVisible(el) && !isInsideSection2(el as HTMLElement)) as HTMLElement[]

    if (dropOptions.length > 0) {
      // Ưu tiên option khớp chữ
      const matched = dropOptions.filter((el) => {
        const t = normalizeVnText(el.textContent || '')
        return t.includes(cleanTyped) || cleanTyped.includes(t) || (cleanTyped.length > 5 && t.includes(cleanTyped.slice(0, 8)))
      })
      const targetEl = matched.length > 0 ? matched[0] : dropOptions[0]
      console.log('[Bookstore AI] Đã tìm thấy option trong dropdown danh sách:', targetEl, targetEl.textContent?.trim())
      targetEl.scrollIntoView({ block: 'nearest' })
      await sleep(50)
      dispatchMouseClick(targetEl)
      try { targetEl.click() } catch (_) { }
      await sleep(350)
      return true
    }

    // 2. Quét tìm tất cả các phần tử nằm trong khoảng ngay dưới input (Y từ bottom - 10 đến bottom + 250, cùng trục X)
    const candidates = Array.from(document.querySelectorAll('*')).filter((el) => {
      if (!isElementVisible(el)) return false
      if (el === prodInput || el.contains(prodInput) || prodInput.contains(el) || isInsideSection2(el as HTMLElement)) return false

      const r = el.getBoundingClientRect()
      const isBelow = r.top >= inputRect.bottom - 10 && r.top <= inputRect.bottom + 250
      const isOverlapX = Math.max(r.left, inputRect.left) < Math.min(r.right, inputRect.right) + 20
      if (!isBelow || !isOverlapX) return false

      const text = (el.textContent || '').trim()
      if (!text || text.length < 2) return false

      // Chiều cao của hàng gợi ý khoảng 20px - 85px
      return r.height >= 20 && r.height <= 85
    }) as HTMLElement[]

    if (candidates.length > 0) {
      const matched = candidates.filter((el) => {
        const t = normalizeVnText(el.textContent || '')
        return t.includes(cleanTyped) || cleanTyped.includes(t) || (cleanTyped.length > 5 && t.includes(cleanTyped.slice(0, 8)))
      })

      const targetEl = matched.length > 0 ? matched[matched.length - 1] : candidates[0]
      console.log('[Bookstore AI] ĐÃ TÌM THẤY VÀ CLICK Ô GỢI Ý SẢN PHẨM:', targetEl, targetEl.textContent?.trim())

      targetEl.scrollIntoView({ block: 'nearest' })
      await sleep(100)
      dispatchMouseClick(targetEl)
      try { targetEl.click() } catch (_) { }
      const firstChild = targetEl.firstElementChild as HTMLElement | null
      if (firstChild) {
        dispatchMouseClick(firstChild)
        try { firstChild.click() } catch (_) { }
      }
      await sleep(400)
      return true
    }

    await sleep(150)
  }

  // 3. Fallback: Nếu không thấy, dispatch Enter
  console.warn('[Bookstore AI] Không thấy ô gợi ý sau 3.5s, dispatch Enter fallback...')
  const enterKey = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }
  prodInput.dispatchEvent(new KeyboardEvent('keydown', enterKey))
  prodInput.dispatchEvent(new KeyboardEvent('keypress', enterKey))
  prodInput.dispatchEvent(new KeyboardEvent('keyup', enterKey))
  return false
}

// Helper tìm input theo nhãn Text trong Section 4 (CHỈ TÌM TRONG PHẠM VI CỘT RIÊNG BIỆT, KHÔNG LEO LÊN HÀNG CHA)
function findInputByLabel(sec4Card: HTMLElement, labelText: string, excludeText?: string): HTMLInputElement | null {
  const normTarget = normalizeVnText(labelText)
  const allLabels = Array.from(sec4Card.querySelectorAll('label, div, span, p')).filter((el) => {
    if (el.children.length > 2) return false
    const t = normalizeVnText(el.textContent || '')
    if (excludeText && t.includes(normalizeVnText(excludeText))) return false
    return t === normTarget || t.startsWith(normTarget) || t.includes(normTarget)
  }) as HTMLElement[]

  for (const lbl of allLabels) {
    // 1. Chỉ tìm input trong phạm vi container cột trực tiếp (ant-col hoặc form-item), TUYỆT ĐỐI không leo lên ant-row hay cả card
    let p: HTMLElement | null = lbl.parentElement
    let depth = 0
    while (p && p !== sec4Card && depth < 4) {
      // Dừng lại nếu leo đến hàng (ant-row) để tránh lấy nhầm input của cột khác
      if (p.classList.contains('ant-row') || p.classList.contains('row')) {
        break
      }

      const inps = Array.from(
        p.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])')
      ) as HTMLInputElement[]
      const valid = inps.filter((inp) => {
        if (!isElementVisible(inp)) return false
        const ph = (inp.getAttribute('placeholder') || '').toLowerCase()
        return !ph.includes('sản phẩm') && !ph.includes('tạo thêm') && !ph.includes('chọn hoặc')
      })
      if (valid.length === 1) return valid[0]
      p = p.parentElement
      depth++
    }

    // 2. Tìm input trong sibling trực tiếp
    let sibling = lbl.nextElementSibling as HTMLElement | null
    if (sibling) {
      const inp = sibling.querySelector('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])') as HTMLInputElement | null
      if (inp && isElementVisible(inp)) return inp
    }
  }

  return null
}

// Helper định vị chính xác từng ô số liệu trong Mục 4 Thông tin bưu gửi
function findSection4Inputs(sec4Card: HTMLElement) {
  // 1. Quét toàn bộ input số liệu có thể nhập trong Section 4
  const allSec4Inputs = Array.from(
    sec4Card.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])')
  ).filter((inp) => isElementVisible(inp) && !isInsideSection2(inp)) as HTMLInputElement[]

  // Lọc bỏ ô Tên sản phẩm và các ô Kích thước đơn hàng (Chiều dài, Chiều rộng, Chiều cao)
  const productInputs = allSec4Inputs.filter((inp) => {
    const ph = (inp.getAttribute('placeholder') || '').toLowerCase()
    if (ph.includes('sản phẩm') || ph.includes('tạo thêm') || ph.includes('chọn hoặc')) return false
    if (ph.includes('chiều dài') || ph.includes('chiều rộng') || ph.includes('chiều cao') || ph.includes('dài') || ph.includes('rộng') || ph.includes('cao')) return false
    if (inp.closest('.ant-select, [class*="select"]')) return false

    const formItem = inp.closest('.ant-form-item, [class*="col"], div')
    const itemText = (formItem?.textContent || '').toLowerCase()
    if (itemText.includes('chiều dài') || itemText.includes('chiều rộng') || itemText.includes('chiều cao') || itemText.includes('kích thước')) return false

    return true
  })

  // Sắp xếp các ô số liệu theo thứ tự tọa độ thực tế trên màn hình (Hàng trên -> Hàng dưới, Trái -> Phải)
  productInputs.sort((a, b) => {
    const ra = a.getBoundingClientRect()
    const rb = b.getBoundingClientRect()
    if (Math.abs(ra.top - rb.top) > 18) return ra.top - rb.top
    return ra.left - rb.left
  })

  // 2. Thử tìm qua nhãn riêng của từng cột (không leo lên ant-row)
  let priceInp = findInputByLabel(sec4Card, 'giá sản phẩm', 'giá trị')
  let weightInp = findInputByLabel(sec4Card, 'khối lượng', 'tổng')
  let qtyInp = findInputByLabel(sec4Card, 'số lượng', 'tổng')
  let goodsValInp = findInputByLabel(sec4Card, 'giá trị bưu gửi')
  let totalWeightInp = findInputByLabel(sec4Card, 'tổng khối lượng')

  // 3. KIỂM TRA ĐẢM BẢO TÍNH ĐỘC NHẤT (TUYỆT ĐỐI KHÔNG TRÙNG NHAU)
  const assigned = [priceInp, weightInp, qtyInp, goodsValInp, totalWeightInp]
  const validAssigned = assigned.filter((i): i is HTMLInputElement => Boolean(i))
  const uniqueCount = new Set(validAssigned).size

  // Nếu có bất kỳ sự trùng lặp nào hoặc chưa tìm đủ, dùng vị trí DOM layout chuẩn 100% của SPX:
  // Hàng 1 (Sản phẩm 1): Ô 0 = Giá sản phẩm, Ô 1 = Khối lượng, Ô 2 = Số lượng
  // Hàng 2 (Tổng kết Mục 4): Ô 3 = Giá trị bưu gửi, Ô 4 = Tổng khối lượng
  if (uniqueCount < validAssigned.length || productInputs.length >= 3) {
    if (productInputs.length >= 5) {
      priceInp = productInputs[0]
      weightInp = productInputs[1]
      qtyInp = productInputs[2]
      goodsValInp = productInputs[3]
      totalWeightInp = productInputs[4]
    } else if (productInputs.length === 4) {
      priceInp = productInputs[0]
      weightInp = productInputs[1]
      qtyInp = productInputs[2]
      goodsValInp = productInputs[3]
    } else if (productInputs.length === 3) {
      priceInp = productInputs[0]
      weightInp = productInputs[1]
      qtyInp = productInputs[2]
    }
  }

  console.log('[Bookstore AI] Kết quả định vị Mục 4 chuẩn xác (Tách biệt 100%):', {
    totalProductInputs: productInputs.length,
    priceInp,
    weightInp,
    qtyInp,
    goodsValInp,
    totalWeightInp,
  })

  return { priceInp, weightInp, qtyInp, goodsValInp, totalWeightInp }
}

// 6. Điền thông tin hàng hóa (Section 4: Thông tin bưu gửi)
async function fillSection4Goods(orderData: SpxOrderData) {
  try {
    const sec4Card = findSection4Card()
    console.log('[Bookstore AI] Đã định vị Section 4 Card:', sec4Card)

    // RÀNG BUỘC ĐỒNG BỘ:
    // Giá sản phẩm = Giá trị bưu gửi = Tiền thu hộ COD
    // Khối lượng sản phẩm = Tổng khối lượng = 1
    // Số lượng = 1
    const defaultWeightKg = 1
    const targetQty = 1

    // LẤY ĐỘNG 100% TỪ EXTENSION: TUYỆT ĐỐI KHÔNG CỐ ĐỊNH HSK3 COMBO MÀU
    let targetTitle = (orderData.productName || '').trim()
    if (!targetTitle && orderData.items && orderData.items.length > 0) {
      targetTitle = orderData.items
        .map((it) => `${it.title}${it.quantity > 1 ? ` (x${it.quantity})` : ''}`)
        .join(' + ')
    }
    if (!targetTitle) targetTitle = 'Sách theo yêu cầu'

    // Chuẩn hóa COD: nếu < 1000 (ví dụ 195k, 205k), tự động nhân 1000
    let finalCod = Number(orderData.codAmount || 0)
    if (finalCod > 0 && finalCod < 1000) {
      finalCod *= 1000
    }

    let unitPrice = finalCod > 0 ? finalCod : Number(orderData.productPrice || orderData.items?.[0]?.price || 0)
    if (unitPrice > 0 && unitPrice < 1000) {
      unitPrice *= 1000
    }
    if ((!finalCod || finalCod <= 0) && unitPrice > 0) {
      finalCod = unitPrice
    }
    if (unitPrice <= 0 && finalCod > 0) {
      unitPrice = finalCod
    }

    console.log('[Bookstore AI] Bắt đầu điền Mục 4 Thông tin bưu gửi ĐỘNG từ Extension:', {
      targetTitle,
      targetQty,
      unitPrice,
      finalCod,
      defaultWeightKg,
    })

    // 1. TÌM SELECT VÀ XÓA BỎ SẢN PHẨM CŨ (NẾU CÓ) TRƯỚC KHI NHẬP MỚI
    const prodSelect = findProductNameSelect(sec4Card)
    if (prodSelect) {
      // Hover vào ô select để hiện nút clear
      prodSelect.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
      prodSelect.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await sleep(80)

      // Bấm nút clear x nếu có để xóa sạch sản phẩm cũ
      const clearBtn = prodSelect.querySelector('.ant-select-clear') as HTMLElement | null
      if (clearBtn && isElementVisible(clearBtn)) {
        console.log('[Bookstore AI] Đã click nút xóa sản phẩm cũ (.ant-select-clear)...')
        dispatchMouseClick(clearBtn)
        await sleep(150)
      }

      // Kích hoạt selector
      const selector = (prodSelect.querySelector('.ant-select-selector') || prodSelect) as HTMLElement
      dispatchMouseClick(selector)
      await sleep(150)
    }

    // 2. Điền Tên sản phẩm trong Section 4 và click ô gợi ý bên dưới
    let prodInput = prodSelect?.querySelector('input') || findProductNameInput(sec4Card)
    if (!prodInput) {
      const selectEl = sec4Card.querySelector('.ant-select, [class*="select"]') as HTMLElement | null
      if (selectEl) {
        dispatchMouseClick(selectEl)
        await sleep(150)
        prodInput = selectEl.querySelector('input') as HTMLInputElement | null
      }
    }

    if (prodInput && targetTitle) {
      console.log('[Bookstore AI] Nhập Tên sản phẩm ĐỘNG vào ô:', targetTitle, prodInput)
      try { prodInput.focus() } catch (_) { }
      safelyClick(prodInput)
      await sleep(100)

      try {
        const tracker = (prodInput as any)._valueTracker
        if (tracker) tracker.setValue('')
      } catch (_) { }

      // Xóa sạch giá trị cũ trong input
      try {
        prodInput.select()
        document.execCommand('selectAll', false, undefined)
        document.execCommand('delete', false, undefined)
      } catch (_) { }

      // Gõ từng ký tự mô phỏng người dùng thật để SPX AutoComplete bắt được sự kiện tìm kiếm
      simulateTyping(prodInput, targetTitle)

      const proto = window.HTMLInputElement.prototype
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
      if (setter) setter.call(prodInput, targetTitle)
      else prodInput.value = targetTitle

      prodInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
      try {
        prodInput.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, data: targetTitle, inputType: 'insertText' }))
      } catch (_) { }
      prodInput.dispatchEvent(new Event('change', { bubbles: true }))

      await sleep(350)

      // CLICK VÀO Ô GỢI Ý HIỆN RA NGAY DƯỚI Ô TÊN SẢN PHẨM THEO HÌNH ẢNH MINH HỌA
      await clickProductSuggestion(prodInput, targetTitle)
      await sleep(400)
    }

    // 3. CHỜ SPX RENDER XONG CÁC Ô SỐ LIỆU "GIÁ SẢN PHẨM" VÀ "KHỐI LƯỢNG" SAU KHI CHỌN SẢN PHẨM
    let freshCard = findSection4Card()
    let inputs = findSection4Inputs(freshCard)
    const waitInputsStart = Date.now()
    while ((!inputs.priceInp || !inputs.weightInp) && Date.now() - waitInputsStart < 3500) {
      await sleep(200)
      freshCard = findSection4Card()
      inputs = findSection4Inputs(freshCard)
    }

    // 4. Điền Giá sản phẩm: bằng chính xác số tiền COD (= Giá trị bưu gửi)
    if (inputs.priceInp && unitPrice > 0) {
      console.log('[Bookstore AI] Điền Giá sản phẩm (= COD):', unitPrice, inputs.priceInp)
      setAntDesignNumber(inputs.priceInp, unitPrice)
      await sleep(150)
    }

    // 5. Điền Khối lượng sản phẩm 1: luôn là 1 kg
    if (inputs.weightInp) {
      console.log('[Bookstore AI] Điền Khối lượng sản phẩm 1 (= 1):', defaultWeightKg, inputs.weightInp)
      setAntDesignNumber(inputs.weightInp, defaultWeightKg)
      await sleep(150)
    }

    // 6. Điền Số lượng: luôn là 1 theo yêu cầu
    if (inputs.qtyInp) {
      console.log('[Bookstore AI] Điền Số lượng sản phẩm (= 1):', targetQty, inputs.qtyInp)
      setAntDesignNumber(inputs.qtyInp, targetQty)
      await sleep(150)
    }

    // 7. Điền Giá trị bưu gửi (ở cuối Mục 4): đúng số tiền COD
    if (inputs.goodsValInp && finalCod > 0) {
      console.log('[Bookstore AI] Điền Giá trị bưu gửi (= COD):', finalCod, inputs.goodsValInp)
      setAntDesignNumber(inputs.goodsValInp, finalCod)
      await sleep(150)
    }

    // 8. Điền Tổng khối lượng (ở cuối Mục 4): luôn là 1 KG
    if (inputs.totalWeightInp) {
      console.log('[Bookstore AI] Điền Tổng khối lượng (= 1):', defaultWeightKg, inputs.totalWeightInp)
      setAntDesignNumber(inputs.totalWeightInp, defaultWeightKg)
      await sleep(150)
    }
  } catch (err) {
    console.error('[Bookstore AI] Lỗi khi điền Mục 4 Thông tin bưu gửi:', err)
  }
}

// ==================== 5. BANNER THÔNG BÁO HOÀN TẤT (KHÔNG TỰ TẮT) ====================
function showCompletedBanner(
  orderData: SpxOrderData,
  addressType: 'OLD_3_LEVEL' | 'NEW_2_LEVEL',
  addrInfo: { province: string; district?: string; ward?: string; detailAddress: string }
) {
  const existing = document.getElementById('bookstore-ai-spx-banner')
  if (existing) existing.remove()

  const banner = document.createElement('div')
  banner.id = 'bookstore-ai-spx-banner'
  banner.style.position = 'fixed'
  banner.style.top = '16px'
  banner.style.right = '16px'
  banner.style.zIndex = '2147483647'
  banner.style.maxWidth = '440px'
  banner.style.backgroundColor = '#ffffff'
  banner.style.color = '#1e293b'
  banner.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
  banner.style.borderRadius = '12px'
  banner.style.border = '2px solid #10b981'
  banner.style.padding = '14px 16px'
  banner.style.fontFamily = 'system-ui, -apple-system, sans-serif'
  banner.style.fontSize = '12px'
  banner.style.lineHeight = '1.4'
  banner.style.animation = 'fadeIn 0.3s ease-out'

  const typeBadge =
    addressType === 'OLD_3_LEVEL'
      ? '<span style="background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">Địa chỉ CŨ (3 cấp: Tỉnh - Huyện - Xã)</span>'
      : '<span style="background: #ecfdf5; color: #065f46; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">Địa chỉ MỚI (2 cấp: Tỉnh - Xã)</span>'

  const prodName =
    orderData.productName ||
    orderData.items?.map((it) => `${it.title}${it.quantity > 1 ? ` (x${it.quantity})` : ''}`).join(' + ') ||
    'Sách giáo khoa'
  const prodQty = orderData.quantity || orderData.items?.reduce((s, it) => s + (it.quantity || 1), 0) || 1
  let finalCod = Number(orderData.codAmount || 0)
  if (finalCod > 0 && finalCod < 1000) finalCod *= 1000

  banner.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
      <div style="display: flex; align-items: center; gap: 6px; font-weight: 800; color: #047857; font-size: 13px;">
        <span>⚡ Bookstore AI — Điền SPX hoàn tất</span>
      </div>
      <span style="background: #fef3c7; color: #92400e; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 4px; border: 1px solid #fde68a;">
        🛑 Chưa bấm tạo đơn
      </span>
    </div>

    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px 10px; margin-bottom: 10px; font-size: 11px; color: #166534;">
      <div style="margin-bottom: 3px;">✔ <strong>Người nhận:</strong> ${orderData.recipientName}</div>
      <div style="margin-bottom: 3px;">✔ <strong>Điện thoại:</strong> ${orderData.recipientPhone}</div>
      <div style="margin-bottom: 3px;">✔ <strong>Chế độ SPX:</strong> ${typeBadge}</div>
      <div style="margin-bottom: 3px;">✔ <strong>Cascader:</strong> <span style="font-weight: 700;">${[addrInfo.province, addrInfo.district, addrInfo.ward].filter(Boolean).join(' / ')}</span></div>
      <div style="margin-bottom: 3px;">✔ <strong>Địa chỉ chi tiết:</strong> <span style="font-weight: 700; color: #047857;">${addrInfo.detailAddress}</span></div>
      <div style="margin-bottom: 3px;">✔ <strong>Tiền thu hộ (COD):</strong> <span style="font-weight: 800; color: #b91c1c;">${finalCod.toLocaleString('vi-VN')} đ</span></div>
      <div style="margin-bottom: 3px;">✔ <strong>Sản phẩm:</strong> <span style="font-weight: 700; color: #047857;">${prodName} (x${prodQty})</span> — Khối lượng: <span style="font-weight: 800; color: #047857;">1 kg</span></div>
      <div>✔ <strong>Ghi chú:</strong> <span style="font-style: italic;">Đã điền vào ô Lưu ý người bán</span></div>
    </div>

    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
      <span style="color: #047857; font-weight: 700; font-size: 11px; display: flex; align-items: center; gap: 4px;">
        <span>🟢 Giữ nguyên tab để bạn kiểm tra & tự bấm Tạo đơn</span>
      </span>
      <button id="spx-btn-dismiss-completed" style="background: #047857; border: none; color: white; padding: 5px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">
        ✕ Đóng bảng này
      </button>
    </div>
  `

  document.body.appendChild(banner)

  document.getElementById('spx-btn-dismiss-completed')?.addEventListener('click', () => {
    banner.remove()
  })
}

// ==================== 6. HÀM ĐIỀN FORM TỔNG THỂ ====================
export async function fillSpxOrderForm(orderData: SpxOrderData, attempt = 1) {
  if (window.top !== window.self) return
  console.log(`[Bookstore AI] Đang tự động điền form SPX (Lần thử ${attempt}/30)...`, orderData)

  const isSingleOrderPage = window.location.href.includes('single-order/create')
  if (!isSingleOrderPage) {
    console.log('[Bookstore AI] Chuyển hướng sang trang single-order/create...')
    window.location.href = 'https://spx.vn/spx-admin/single-order/create'
    return
  }

  // 1. Chờ DOM của SPX sẵn sàng
  const phoneField = findPhoneField()
  const nameField = findNameField(phoneField)
  const smartImportInput = findSmartImportInput()

  if (!phoneField && !nameField && !smartImportInput && attempt < 30) {
    await sleep(350)
    return fillSpxOrderForm(orderData, attempt + 1)
  }

  try {
    // 1.5 Kiểm tra xem có thiếu Tỉnh hoặc thiếu Quận/Huyện không. Nếu thiếu, gửi ngay sang Gemini AI để tra cứu tự động!
    const isMissingGeo =
      !orderData.province ||
      (!orderData.district && orderData.addressType === 'OLD_3_LEVEL')

    if (isMissingGeo && (orderData.address || orderData.detailAddress)) {
      const rawAddr = (orderData.address || orderData.detailAddress || '').trim()
      console.log(`[Bookstore AI] Phát hiện đơn hàng SPX bị thiếu Tỉnh hoặc Quận/Huyện ("${rawAddr}"), đang gửi vào Gemini AI kiểm tra...`)
      try {
        const res = await fetch('http://localhost:3000/api/assistant/verify-address', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: rawAddr }),
        })
        if (res.ok) {
          const json = await res.json()
          const data = json.data || json
          if (data && data.province) {
            console.log('[Bookstore AI] Gemini AI đã tra cứu bổ sung Tỉnh/Huyện thành công:', data)
            orderData.province = data.province
            if (data.district && !orderData.district) orderData.district = data.district
            if (data.ward && !orderData.ward) orderData.ward = data.ward
            if (data.detailAddress && (!orderData.detailAddress || orderData.detailAddress.length < 5)) orderData.detailAddress = data.detailAddress
            if (data.addressType) orderData.addressType = data.addressType
          }
        }
      } catch (geminiErr) {
        console.warn('[Bookstore AI] Không thể gọi Gemini verify-address từ SPX content script:', geminiErr)
      }
    }

    // 2. Phân tích bóc tách địa chỉ & xác định loại CŨ (3 cấp) hay MỚI (2 cấp)
    const addrInfo = parseAddressComponents(orderData)
    console.log('[Bookstore AI] Kết quả bóc tách địa chỉ:', addrInfo)

    // BƯỚC 1: CHỌN ĐÚNG RADIO "Địa chỉ CŨ (3 cấp)" HOẶC "Địa chỉ MỚI (2 cấp)"
    await ensureAddressTypeRadio(addrInfo.addressType)
    await sleep(400) // Chờ SPX cập nhật lại layout cascader

    const filledFields: string[] = []

    // BƯỚC 2: DÙNG HỘP "NHẬP TỰ ĐỘNG" VỚI PAYLOAD CHUẨN ĐỂ SPX TỰ ĐỘNG ĐIỀN TOÀN BỘ PHẦN NGƯỜI NHẬN
    const smartImportSuccess = await fillSmartImport(orderData, addrInfo)
    if (smartImportSuccess) {
      filledFields.push('Nhập tự động (SPX)')
      console.log('[Bookstore AI] Đã bấm nút "Tự động điền" thành công! TUYỆT ĐỐI GIỮ NGUYÊN Mục 2 người nhận, KHÔNG ấn hay gõ thêm vào ô địa chỉ chi tiết.')

      // Nếu SPX mở popup gợi ý địa chỉ (do tìm thấy nhiều đường trùng tên), tự động click chọn gợi ý phù hợp nhất
      await selectAddressSuggestionIfPresent(addrInfo)

      // Rút sạch focus ra khỏi mọi ô input để đóng dropdown nếu có
      try {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
      } catch (_) { }
    } else {
      // BƯỚC 2.1: CHỈ KHI "TỰ ĐỘNG ĐIỀN" THẤT BẠI MỚI CHUYỂN SANG ĐIỀN THỦ CÔNG RPA TỪNG Ô
      console.log('[Bookstore AI] Không dùng được Tự động điền, chuyển sang điền RPA thủ công...')
      await sleep(300)

      const cleanPhoneNoZero = (orderData.recipientPhone || '').trim().replace(/^(\+84|84|0)/, '')
      const curPhoneInput = findPhoneField()
      if (curPhoneInput && (!curPhoneInput.value || curPhoneInput.value.trim() === '')) {
        console.log('[Bookstore AI] Ô điện thoại còn trống, điền bổ sung RPA...', cleanPhoneNoZero)
        if (cleanPhoneNoZero) {
          setInputValue(curPhoneInput, cleanPhoneNoZero)
          filledFields.push('Điện thoại')
        }
      }

      const curNameInput = findNameField(curPhoneInput)
      if (curNameInput && (!curNameInput.value || curNameInput.value.trim() === '')) {
        console.log('[Bookstore AI] Ô tên người nhận còn trống, điền bổ sung RPA...', orderData.recipientName)
        if (orderData.recipientName) {
          setInputValue(curNameInput, orderData.recipientName)
          filledFields.push('Tên người nhận')
        }
      }

      const curDetailInput = findAddressDetailField()
      if (curDetailInput && (!curDetailInput.value || curDetailInput.value.trim() === '')) {
        console.log('[Bookstore AI] Ô địa chỉ chi tiết còn trống, điền bổ sung RPA...', addrInfo.detailAddress)
        if (addrInfo.detailAddress) {
          setInputValue(curDetailInput, addrInfo.detailAddress)
          filledFields.push('Địa chỉ chi tiết')
        }
      }

      const trigger = findCascaderTrigger()
      const triggerText = (trigger?.textContent || '').trim()
      if (!triggerText || triggerText.includes('Please Select') || triggerText.includes('Vui lòng chọn')) {
        console.log('[Bookstore AI] Cascader chưa chọn, kích hoạt chọn cascader...')
        await selectCascaderAddress(
          addrInfo.province,
          addrInfo.district,
          addrInfo.formattedWard || addrInfo.ward
        )
        filledFields.push('Cascader')
      }
    }

    // BƯỚC 3: TIỀN THU HỘ COD (MỤC 5. DỊCH VỤ)
    let finalCod = Number(orderData.codAmount || 0)
    if (finalCod > 0 && finalCod < 1000) finalCod *= 1000

    const codInput = findCodField()
    if (codInput && finalCod > 0) {
      setAntDesignNumber(codInput, finalCod)
      filledFields.push('Tiền thu hộ COD')
    }

    // BƯỚC 4: LƯU Ý CỦA NGƯỜI BÁN (MỤC 6. GHI CHÚ)
    const notesInput = findNotesField()
    if (notesInput && orderData.notes) {
      setInputValue(notesInput, orderData.notes)
      filledFields.push('Lưu ý người bán')
    }

    // BƯỚC 5: THÔNG TIN HÀNG HÓA & KHỐI LƯỢNG 1 KG (MỤC 4)
    await fillSection4Goods(orderData)
    filledFields.push('Hàng hóa & Khối lượng 1kg')

    // BƯỚC 6: MULTI-PASS RE-VERIFY COD & MỤC 4 (CHỐNG SPX GHI ĐÈ GIÁ TRỊ CŨ NHƯ 130.000)
    const verifyPasses = [400, 800, 1400]
    verifyPasses.forEach((delayMs) => {
      setTimeout(async () => {
        const curCod = findCodField()
        if (curCod && finalCod > 0) {
          const curCodClean = (curCod.value || '').replace(/\D/g, '')
          if (!curCodClean || curCodClean === '0' || curCodClean !== String(finalCod)) {
            setAntDesignNumber(curCod, finalCod)
          }
        }

        try {
          const curCard = findSection4Card()
          const reInputs = findSection4Inputs(curCard)
          if (reInputs.priceInp && finalCod > 0) {
            const curPriceClean = (reInputs.priceInp.value || '').replace(/\D/g, '')
            if (!curPriceClean || curPriceClean === '0' || curPriceClean !== String(finalCod)) {
              setAntDesignNumber(reInputs.priceInp, finalCod)
            }
          }
          if (reInputs.weightInp) {
            const curWeightClean = (reInputs.weightInp.value || '').replace(/\D/g, '')
            if (!curWeightClean || curWeightClean === '0' || curWeightClean !== '1') {
              setAntDesignNumber(reInputs.weightInp, 1)
            }
          }
          if (reInputs.qtyInp) {
            const curQtyClean = (reInputs.qtyInp.value || '').replace(/\D/g, '')
            if (!curQtyClean || curQtyClean === '0') {
              setAntDesignNumber(reInputs.qtyInp, 1)
            }
          }
          if (reInputs.goodsValInp && finalCod > 0) {
            const curGoodsClean = (reInputs.goodsValInp.value || '').replace(/\D/g, '')
            if (!curGoodsClean || curGoodsClean === '0' || curGoodsClean !== String(finalCod)) {
              console.log('[Bookstore AI] Phát hiện Giá trị bưu gửi bị SPX ghi đè sai, ép lại đúng COD:', finalCod)
              setAntDesignNumber(reInputs.goodsValInp, finalCod)
            }
          }
          if (reInputs.totalWeightInp) {
            const curTotalWeightClean = (reInputs.totalWeightInp.value || '').replace(/\D/g, '')
            if (!curTotalWeightClean || curTotalWeightClean === '0' || curTotalWeightClean !== '1') {
              setAntDesignNumber(reInputs.totalWeightInp, 1)
            }
          }
        } catch (_) { }

        // Đảm bảo không để lại bất kỳ con trỏ hay popup gợi ý nào ở pass cuối
        if (delayMs === 1400) {
          try {
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur()
            }
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }))
          } catch (_) { }
        }
      }, delayMs)
    })

    console.log(`[Bookstore AI] Đã điền xong các trường:`, filledFields)

    // Chụp ảnh bằng chứng màn hình đã điền form trên SPX để lưu trữ
    setTimeout(() => {
      chrome.runtime?.sendMessage?.(
        {
          action: 'CAPTURE_FILLED_SCREENSHOT',
          orderData,
          filledCount: filledFields.length,
        },
        (res) => {
          console.log('[Bookstore AI] Đã chụp ảnh màn hình xác nhận kết quả điền form:', res?.success)
        },
      )
    }, 700)

    // Xóa lệnh chờ khỏi storage
    chrome.storage?.local?.remove(['pendingSpxOrder'])
    document.getElementById('bookstore-ai-spx-waiting-banner')?.remove()

    // HIỂN THỊ BANNER HOÀN TẤT & GIỮ NGUYÊN TAB (TUYỆT ĐỐI KHÔNG TỰ TẮT)
    showCompletedBanner(orderData, addrInfo.addressType, addrInfo)
  } catch (err) {
    console.error('[Bookstore AI] Lỗi nghiêm trọng khi tự động điền form SPX:', err)
  }
}

// Tự động kiểm tra xem có lệnh tạo đơn chờ xử lý khi tab mở ra hay không
function checkPendingOrder() {
  if (window.top !== window.self) return
  if (typeof chrome === 'undefined' || !chrome.storage) return

  const currentPath = window.location.pathname
  const isHomeOrMass = currentPath === '/' || currentPath === '' || currentPath.includes('mass-order')
  if (isHomeOrMass && window.location.hostname.includes('spx.vn')) {
    chrome.storage.local.get(['pendingSpxOrder'], (res) => {
      const order = res?.pendingSpxOrder as SpxOrderData | undefined
      if (order?.recipientName) {
        console.log('[Bookstore AI] Chuyển hướng thẳng vào https://spx.vn/spx-admin/single-order/create...')
        window.location.href = 'https://spx.vn/spx-admin/single-order/create'
      }
    })
    return
  }

  chrome.storage.local.get(['pendingSpxOrder'], (res) => {
    const data = res?.pendingSpxOrder as SpxOrderData | undefined
    if (data && data.recipientName) {
      const age = Date.now() - (data.createdAt || 0)
      if (age < 10 * 60 * 1000) {
        setTimeout(() => {
          fillSpxOrderForm(data)
        }, 500)
      } else {
        chrome.storage.local.remove(['pendingSpxOrder'])
      }
    }
  })
}

// Chạy kiểm tra và kích hoạt giám sát tự động điền khi tải trang
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    checkPendingOrder()
    attachSmartImportObserver()
  })
} else {
  checkPendingOrder()
  attachSmartImportObserver()
}

// Lắng nghe sự kiện gọi trực tiếp từ Side Panel
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (window.top !== window.self) return
  if (request.action === 'AUTO_FILL_SPX') {
    fillSpxOrderForm(request.orderData)
    sendResponse({ success: true })
    return true
  }

  if (request.action === 'CHECK_SPX_LOGGED_IN') {
    const isLoggedIn =
      document.cookie.includes('SPC_EC') ||
      document.cookie.includes('SPC_U') ||
      !document.querySelector('a[href*="login"]')
    sendResponse({ isLoggedIn })
    return true
  }
})
