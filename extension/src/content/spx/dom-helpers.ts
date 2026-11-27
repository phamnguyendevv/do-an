import {
  resolveWeightKgAndQty,
  type SpxOrderData,
} from '../../utils/spx-address'

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Helper kiểm tra phần tử có đang hiển thị thực tế trên màn hình không
export function isElementVisible(el: Element | null): boolean {
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

// Danh sách các tiêu đề Section của SPX để phân định ranh giới
export const SECTION_KEYWORDS = [
  '1. địa chỉ người gửi',
  '2. địa chỉ người nhận',
  '3. loại dịch vụ',
  '4. thông tin bưu gửi',
  '5. dịch vụ',
  '6. thông tin gửi hàng',
  '7. khuyến mãi',
]

// Tìm chính xác thẻ Card của Section mà KHÔNG BAO GIỜ bao trùm section khác hoặc thẻ form toàn trang
export function getSectionContainer(sectionKeyword: string): HTMLElement | null {
  const targetLower = sectionKeyword.toLowerCase()
  const allElements = Array.from(
    document.querySelectorAll('h1, h2, h3, h4, h5, h6, div, span, p, label'),
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
export function findSectionContainer(headingKeywords: string[]): HTMLElement | null {
  for (const kw of headingKeywords) {
    const sec = getSectionContainer(kw)
    if (sec) return sec
  }
  return null
}

// Kiểm tra xem một phần tử có nằm bên trong Section 2 (Địa chỉ người nhận) hay không
export function isInsideSection2(el: Element | null): boolean {
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

// Helper gõ phím từng ký tự mô phỏng người dùng thật cho các input có mask/validation phức tạp
export function simulateTyping(input: HTMLElement | null, text: string) {
  if (!input) return
  input.focus()

  try {
    const tracker = (input as any)._valueTracker
    if (tracker) {
      tracker.setValue('')
    }
  } catch { }

  if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
    input.value = ''
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const isDigit = /\d/.test(char)
    const code = isDigit ? `Digit${char}` : `Key${char.toUpperCase()}`
    const charCode = char.charCodeAt(0)
    const keyOpts = { key: char, code, charCode, keyCode: charCode, which: charCode, bubbles: true }
    try {
      input.dispatchEvent(new KeyboardEvent('keydown', keyOpts))
      input.dispatchEvent(new KeyboardEvent('keypress', keyOpts))
    } catch { }

    try {
      document.execCommand('insertText', false, char)
    } catch { }

    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      if (!input.value.endsWith(char)) {
        input.value += char
      }
    }

    try {
      input.dispatchEvent(
        new InputEvent('input', { bubbles: true, composed: true, data: char, inputType: 'insertText' }),
      )
      input.dispatchEvent(new KeyboardEvent('keyup', keyOpts))
    } catch { }
  }

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

  input.style.transition = 'all 0.3s ease'
  input.style.border = '2px solid #10b981'
  input.style.backgroundColor = '#ecfdf5'
}

// Helper điền giá trị tương thích tuyệt đối với React / Vue Synthetic Events & Ant Design
export function setInputValue(input: HTMLElement | null, value: string | number) {
  if (!input) return
  const strVal = String(value)
  input.focus()

  try {
    const tracker = (input as any)._valueTracker
    if (tracker) {
      tracker.setValue('')
    }
  } catch { }

  try {
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      input.select()
      document.execCommand('selectAll', false, undefined)
      document.execCommand('insertText', false, strVal)
    }
  } catch { }

  const proto =
    input instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set

  if (nativeInputValueSetter && (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) {
    nativeInputValueSetter.call(input, strVal)
  } else if ('value' in input) {
    ;(input as any).value = strVal
  }

  input.dispatchEvent(new Event('focus', { bubbles: true }))
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  try {
    input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, data: strVal }))
  } catch { }
  input.dispatchEvent(new Event('change', { bubbles: true }))
  input.dispatchEvent(new Event('blur', { bubbles: true }))

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
export function setAntDesignNumber(input: HTMLInputElement | null, value: number | string) {
  if (!input) return
  const strVal = String(value)
  input.focus()

  try {
    const tracker = (input as any)._valueTracker
    if (tracker) tracker.setValue('')
  } catch { }

  try {
    input.select()
    document.execCommand('selectAll', false, undefined)
    document.execCommand('insertText', false, strVal)
  } catch { }

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
  } catch { }
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
export function safelyClick(el: Element | null | undefined): boolean {
  if (!el) return false
  try {
    if (typeof (el as any).scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' })
    }
  } catch { }

  const opts = { bubbles: true, cancelable: true, view: window }
  try { el.dispatchEvent(new PointerEvent('pointerdown', opts)) } catch { }
  try { el.dispatchEvent(new MouseEvent('mousedown', opts)) } catch { }
  try { el.dispatchEvent(new PointerEvent('pointerup', opts)) } catch { }
  try { el.dispatchEvent(new MouseEvent('mouseup', opts)) } catch { }

  try {
    if (typeof (el as any).click === 'function') {
      ;(el as any).click()
      return true
    }
  } catch { }

  return false
}

export function dispatchMouseClick(el: Element | null | undefined) {
  safelyClick(el)
}

// 1. Tìm ô "* Điện thoại"
export function findPhoneField(): HTMLInputElement | null {
  const sec2 = findSectionContainer(['2. Địa chỉ người nhận', 'Địa chỉ người nhận']) || document.body

  const plus84Elements = Array.from(sec2.querySelectorAll('*')).filter((el) => {
    if (el.children.length > 1) return false
    const t = el.textContent?.trim() || ''
    return t === '+84' || t.startsWith('+84')
  }) as HTMLElement[]

  for (const el of plus84Elements) {
    const wrapper = el.closest('.ant-input-affix-wrapper, .ant-input-group, .ant-input-wrapper, .input-group, div')
    if (wrapper) {
      const inp = wrapper.querySelector(
        'input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])',
      ) as HTMLInputElement
      if (inp && isElementVisible(inp)) return inp
    }
    const sibling = el.nextElementSibling
    if (sibling) {
      const inp =
        sibling.tagName === 'INPUT'
          ? (sibling as HTMLInputElement)
          : (sibling.querySelector('input') as HTMLInputElement)
      if (inp && isElementVisible(inp)) return inp
    }
    const parent = el.parentElement
    if (parent) {
      const inp = parent.querySelector(
        'input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])',
      ) as HTMLInputElement
      if (inp && isElementVisible(inp)) return inp
    }
  }

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
        'input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])',
      ) as HTMLInputElement
      if (inp && isElementVisible(inp)) return inp
      p = p.parentElement
      depth++
    }
  }

  return null
}

// 2. Tìm ô "* Tên"
export function findNameField(phoneEl?: HTMLInputElement | null): HTMLInputElement | null {
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
        p.querySelectorAll('input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])'),
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
        row.querySelectorAll('input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])'),
      ) as HTMLInputElement[]
      const candidates = inps.filter((i) => i !== phoneEl && isElementVisible(i))
      if (candidates.length === 1) return candidates[0]

      const nextCol = row.nextElementSibling
      if (nextCol) {
        const nextInp = nextCol.querySelector(
          'input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])',
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
export function findAddressDetailField(): HTMLInputElement | HTMLTextAreaElement | null {
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
        'input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]), textarea',
      ) as HTMLInputElement | HTMLTextAreaElement
      if (inp && isElementVisible(inp)) return inp
      p = p.parentElement
      depth++
    }
  }

  return null
}

// 4. Tìm ô "Tiền thu hộ (COD)" trong Section 5: Dịch vụ
export function findCodField(): HTMLInputElement | null {
  const sec5 = findSectionContainer(['5. Dịch vụ', 'Dịch vụ'])
  const searchRoot = sec5 || document.body

  const codCheckboxLabels = Array.from(searchRoot.querySelectorAll('label, .ant-checkbox-wrapper, span')).filter(
    (el) => {
      const t = (el.textContent || '').trim().toLowerCase()
      return t.includes('tiền thu hộ') || t.includes('thu hộ (cod)')
    },
  ) as HTMLElement[]

  for (const lbl of codCheckboxLabels) {
    const cb = lbl.querySelector('input[type="checkbox"]') as HTMLInputElement
    if (cb && !cb.checked) {
      console.log('[Bookstore AI] Đang kích hoạt checkbox Tiền thu hộ (COD)...')
      safelyClick(cb)
      cb.dispatchEvent(new Event('change', { bubbles: true }))
    }
  }

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

  for (const lbl of codCheckboxLabels) {
    let p: HTMLElement | null = lbl.parentElement
    let depth = 0
    while (p && depth < 5) {
      const inps = Array.from(
        p.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])'),
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
export function findNotesField(): HTMLTextAreaElement | HTMLInputElement | null {
  const elements = Array.from(
    document.querySelectorAll('textarea, input:not([type="hidden"])'),
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

export function isSpxLoginPage(): boolean {
  const href = window.location.href.toLowerCase()
  if (
    href.includes('/login') ||
    href.includes('/signin') ||
    href.includes('account/login') ||
    href.includes('passport.')
  ) {
    return true
  }
  const hasPasswordInput = Boolean(document.querySelector('input[type="password"]'))
  return hasPasswordInput && !href.includes('single-order/create')
}

export function showSpxLoginRequiredBanner() {
  const existing = document.getElementById('bookstore-ai-spx-login-banner')
  if (existing) return

  const banner = document.createElement('div')
  banner.id = 'bookstore-ai-spx-login-banner'
  banner.style.cssText = `
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 2147483647;
    max-width: 380px;
    background: #fffbeb;
    color: #92400e;
    border: 2px solid #f59e0b;
    border-radius: 10px;
    padding: 12px 14px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 12px;
    line-height: 1.45;
  `
  banner.innerHTML = `
    <div style="font-weight: 800; color: #b45309; margin-bottom: 4px;">
      🔐 Bookstore AI — Cần đăng nhập SPX
    </div>
    <div>
      Vui lòng đăng nhập tài khoản SPX trên trang này. Đơn hàng đang chờ sẽ tự động điền ngay sau khi bạn đăng nhập xong.
    </div>
  `
  document.body.appendChild(banner)
}

export function canRedirectToSingleOrder(): boolean {
  try {
    const key = 'bookstore_spx_redirect_guard'
    const raw = sessionStorage.getItem(key)
    const now = Date.now()
    const parsed = raw ? JSON.parse(raw) : { count: 0, ts: now }
    const withinWindow = now - Number(parsed.ts || 0) < 15000
    const nextCount = withinWindow ? Number(parsed.count || 0) + 1 : 1
    if (nextCount > 2) {
      return false
    }
    sessionStorage.setItem(key, JSON.stringify({ count: nextCount, ts: now }))
    return true
  } catch {
    return true
  }
}

export function removeAddressMismatchAlert() {
  const existing = document.getElementById('spx-ai-address-mismatch-banner')
  if (existing) {
    existing.remove()
  }
}

export function showAddressMismatchAlert(inputText: string, displayedCascader: string, reason: string) {
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
    try { alertBox.remove() } catch { }
  }, 30000)
}

export function showCompletedBanner(
  orderData: SpxOrderData,
  addressType: 'OLD_3_LEVEL' | 'NEW_2_LEVEL',
  addrInfo: { province: string; district?: string; ward?: string; detailAddress: string },
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
    'Sách theo yêu cầu'
  const { weightKg: displayWeightKg, quantity: prodQty } = resolveWeightKgAndQty(orderData)
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
      <div style="margin-bottom: 3px;">✔ <strong>Sản phẩm:</strong> <span style="font-weight: 700; color: #047857;">${prodName} (x${prodQty})</span> — Khối lượng: <span style="font-weight: 800; color: #047857;">${displayWeightKg} kg</span></div>
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
