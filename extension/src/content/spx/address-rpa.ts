import {
  checkCascaderAddressMatches,
  normalizeProvinceName,
  normalizeVnText,
  parseAddressComponents,
  stripAdminPrefixes,
  type ParsedSpxAddress,
  type SpxOrderData,
} from '../../utils/spx-address'
import {
  dispatchMouseClick,
  findAddressDetailField,
  findSectionContainer,
  isElementVisible,
  removeAddressMismatchAlert,
  safelyClick,
  setInputValue,
  showAddressMismatchAlert,
  sleep,
} from './dom-helpers'

let isAutoCorrecting = false

// ==================== 1. CHỌN LOẠI ĐỊA CHỈ: MỚI (2 CẤP) / CŨ (3 CẤP) ====================
export function selectAddressTypeRadio(type: 'OLD_3_LEVEL' | 'NEW_2_LEVEL'): boolean {
  const isOld = type === 'OLD_3_LEVEL'
  console.log(
    `[Bookstore AI] Đang chọn loại địa chỉ: ${isOld ? 'Địa chỉ CŨ (3 cấp)' : 'Địa chỉ MỚI (2 cấp)'}...`,
  )

  const sec2 = findSectionContainer(['2. Địa chỉ người nhận', 'Địa chỉ người nhận']) || document.body

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
        console.log(
          `[Bookstore AI] Radio "${lbl.textContent?.trim()}" ĐÃ Ở ĐÚNG CHẾ ĐỘ, KHÔNG click lại để tránh SPX reset form!`,
        )
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

export async function ensureAddressTypeRadio(type: 'OLD_3_LEVEL' | 'NEW_2_LEVEL'): Promise<boolean> {
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
      const isAntChecked =
        w.classList.contains('ant-radio-wrapper-checked') || w.querySelector('.ant-radio-checked') !== null
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

export function getCurrentAddressType(): 'OLD_3_LEVEL' | 'NEW_2_LEVEL' {
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

// ==================== 2. TÌM VÀ ĐIỀN DROPDOWN CASCADER (TỈNH / HUYỆN / XÃ) ====================
export function findCascaderTrigger(): HTMLElement | null {
  const sec2 = findSectionContainer(['2. Địa chỉ người nhận', 'Địa chỉ người nhận']) || document.body

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
          '.ant-cascader-picker, .ant-select, [class*="cascader"], [class*="select"], [role="combobox"]',
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
  try { trigger.scrollIntoView({ block: 'center' }) } catch { }
  const innerInput = trigger.querySelector('input')
  const arrow = trigger.querySelector('[class*="arrow"], svg, i')
  const opts = { bubbles: true, cancelable: true, view: window }

  try {
    trigger.dispatchEvent(new PointerEvent('pointerdown', opts))
    trigger.dispatchEvent(new PointerEvent('pointerup', opts))
  } catch { }

  if (innerInput) {
    try { innerInput.focus() } catch { }
    safelyClick(innerInput)
  }

  safelyClick(trigger)

  if (arrow) {
    safelyClick(arrow)
  }
}

async function waitForMenuColumn(colIndex: number, maxWaitMs = 3000): Promise<HTMLElement | null> {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    const menus = Array.from(
      document.querySelectorAll(
        '.ant-cascader-menu, [class*="cascader-menu"], [class*="cascader-menus"] > div, [class*="cascader-menus"] > ul, .ant-cascader-menus ul, ul[role="menu"], [class*="cascader"] ul, [role="listbox"], [class*="dropdown-menu"]',
      ),
    ).filter(isElementVisible) as HTMLElement[]

    if (menus.length > colIndex && menus[colIndex].children.length > 0) {
      return menus[colIndex]
    }

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

async function scrollAndFindItem(targetMenu: HTMLElement, queryText: string, levelName: string): Promise<boolean> {
  if (!queryText) return false
  const clean = normalizeVnText(queryText)
  const strippedQuery = stripAdminPrefixes(clean)
  console.log(
    `[Bookstore AI] Đang tìm ${levelName}: "${queryText}" (chuẩn hóa: "${clean}", stripped: "${strippedQuery}")...`,
  )

  const allExistingItems = Array.from(
    targetMenu.querySelectorAll(
      'li, div[role="menuitem"], .ant-cascader-menu-item, [role="menuitem"], [class*="menu-item"]',
    ),
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
      try { it.click() } catch { }
      try { it.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true })) } catch { }
      return true
    }
  }

  for (let step = 0; step < 20; step++) {
    const items = Array.from(
      targetMenu.querySelectorAll(
        'li, div[role="menuitem"], .ant-cascader-menu-item, [role="menuitem"], [class*="menu-item"], [class*="node"], div',
      ),
    ).filter((it) => {
      const t = (it.textContent || '').trim()
      return t.length >= 2 && t.length < 50 && it.children.length <= 2
    }) as HTMLElement[]

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
        try { it.click() } catch { }
        try { it.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true })) } catch { }
        return true
      }
    }

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
          try { it.click() } catch { }
          try { it.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true })) } catch { }
          return true
        }
      }
    }

    targetMenu.scrollTop += 220
    const parent = targetMenu.parentElement
    if (parent) parent.scrollTop += 220
    await sleep(80)
  }

  console.warn(`[Bookstore AI] Không tìm thấy ${levelName}: "${queryText}"!`)
  return false
}

export async function selectCascaderAddress(
  province: string,
  district?: string,
  ward?: string,
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

  const menu0 = await waitForMenuColumn(0)
  if (!menu0) {
    console.warn('[Bookstore AI] Cột 0 Cascader không xuất hiện!')
    return false
  }

  const provToClick = normalizeProvinceName(province)
  const ok0 = await scrollAndFindItem(menu0, provToClick, 'Tỉnh/Thành')
  if (!ok0) return false

  const menu1 = await waitForMenuColumn(1)
  if (!menu1) {
    console.warn('[Bookstore AI] Cột 1 Cascader không xuất hiện sau khi chọn Tỉnh!')
    return false
  }

  if (district) {
    const ok1 = await scrollAndFindItem(menu1, district, 'Quận/Huyện')
    if (!ok1) return false

    if (ward) {
      const menu2 = await waitForMenuColumn(2)
      if (menu2) {
        await scrollAndFindItem(menu2, ward, 'Phường/Xã')
      }
    }
  } else if (ward) {
    await scrollAndFindItem(menu1, ward, 'Phường/Xã')
  }

  await sleep(350)
  return true
}

export async function selectAddressSuggestionIfPresent(addrInfo: ParsedSpxAddress): Promise<boolean> {
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

  const start = Date.now()
  while (Date.now() - start < 1200) {
    const dropdownContainers = Array.from(
      document.querySelectorAll(
        '.ant-select-dropdown:not(.ant-select-dropdown-hidden), [class*="auto-complete-dropdown"], [class*="dropdown-menu"], div[role="listbox"], [class*="address-dropdown"], [class*="suggestion"]',
      ),
    ).filter((el) => isElementVisible(el)) as HTMLElement[]

    let candidateItems: HTMLElement[] = []

    for (const dd of dropdownContainers) {
      const items = Array.from(
        dd.querySelectorAll('[role="option"], .ant-select-item-option, .ant-select-item, li, [class*="item"]'),
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
      try { target.click() } catch { }

      const firstChild = target.firstElementChild as HTMLElement | null
      if (firstChild) {
        dispatchMouseClick(firstChild)
        try { firstChild.click() } catch { }
      }

      await sleep(350)
      return true
    }

    await sleep(150)
  }

  return false
}

// ==================== 3. SMART IMPORT & AUTO-CORRECT 2 CẤP <-> 3 CẤP ====================
export function findSmartImportButton(): HTMLElement | null {
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

export function findSmartImportInput(): HTMLInputElement | HTMLTextAreaElement | null {
  const sec2 = findSectionContainer(['2. Địa chỉ người nhận', 'Địa chỉ người nhận']) || document.body

  const pasteBtn = findSmartImportButton()
  if (pasteBtn) {
    let p: HTMLElement | null = pasteBtn.parentElement
    let d = 0
    while (p && d < 4) {
      const inp = p.querySelector(
        'textarea, input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])',
      ) as HTMLInputElement | HTMLTextAreaElement | null
      if (inp && isElementVisible(inp)) {
        console.log('[Bookstore AI] Đã tìm thấy ô Nhập tự động cạnh nút Tự động điền:', inp)
        return inp
      }
      p = p.parentElement
      d++
    }
  }

  const allInputs = Array.from(
    sec2.querySelectorAll('textarea, input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])'),
  ) as Array<HTMLInputElement | HTMLTextAreaElement>

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

  const labels = Array.from(sec2.querySelectorAll('label, div, span, p')).filter((el) => {
    if (el.children.length > 2) return false
    const t = (el.textContent || '').trim().toLowerCase()
    return t === 'nhập tự động' || t.includes('nhập tự động')
  }) as HTMLElement[]

  for (const lbl of labels) {
    let p: HTMLElement | null = lbl.parentElement
    let depth = 0
    while (p && depth < 4) {
      const inp = p.querySelector(
        'textarea, input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])',
      ) as HTMLInputElement | HTMLTextAreaElement | null
      if (inp && isElementVisible(inp)) return inp
      p = p.parentElement
      depth++
    }
  }

  const textareas = Array.from(sec2.querySelectorAll('textarea')).filter(isElementVisible) as HTMLTextAreaElement[]
  if (textareas.length > 0) return textareas[0]

  return null
}

function getDisplayedCascaderAddress(): string {
  const sec2 = findSectionContainer(['2. Địa chỉ người nhận', 'Địa chỉ người nhận']) || document.body

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
        '.ant-cascader-picker, .ant-select, [class*="cascader"], [class*="select"], [role="combobox"]',
      ) as HTMLElement | null
      if (picker && isElementVisible(picker)) {
        const labelEl = picker.querySelector(
          '.ant-cascader-picker-label, .ant-select-selection-item, [class*="picker-label"], [class*="selection-item"]',
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

  const trigger = findCascaderTrigger()
  if (trigger) {
    const labelEl = trigger.querySelector(
      '.ant-cascader-picker-label, .ant-select-selection-item, [class*="picker-label"], [class*="selection-item"]',
    )
    const text = (labelEl?.textContent || trigger.textContent || '').replace(/\s+/g, ' ').trim()
    if (text && !text.includes('Please Select') && !text.includes('Vui lòng chọn')) {
      return text
    }
  }

  return ''
}

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

function highlightCascaderWarning() {
  const trigger = findCascaderTrigger()
  if (trigger) {
    trigger.style.transition = 'all 0.3s ease'
    trigger.style.border = '2px solid #ff4d4f'
    trigger.style.backgroundColor = '#fff1f0'
    trigger.style.boxShadow = '0 0 12px rgba(255, 77, 79, 0.6)'
    try { trigger.scrollIntoView({ block: 'center', behavior: 'smooth' }) } catch { }
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

export async function verifyAndAutoCorrectSmartAddress(
  inputText: string,
  orderData?: SpxOrderData,
): Promise<{ success: boolean; displayedCascader: string; errorReason?: string }> {
  if (!orderData) {
    try {
      const stored = await new Promise<any>((resolve) => {
        chrome.storage?.local?.get(['pendingSpxOrder', 'lastParsedOrder'], resolve)
      })
      orderData = stored?.pendingSpxOrder || stored?.lastParsedOrder
    } catch { }
  }

  await sleep(750)

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

  const firstCheck = checkCascaderAddressMatches(
    displayedCascader,
    inputText,
    orderData,
    getSpxAddressWarningText(),
  )

  if (firstCheck.isMatch) {
    console.log(`[Bookstore AI] ✅ Địa chỉ tự động điền lần 1 đã khớp chuẩn: "${displayedCascader}"`)
    removeAddressMismatchAlert()
    highlightCascaderSuccess()
    return { success: true, displayedCascader }
  }

  const alternateType = initialType === 'OLD_3_LEVEL' ? 'NEW_2_LEVEL' : 'OLD_3_LEVEL'
  console.warn(
    `[Bookstore AI] ⚠️ Địa chỉ lần 1 CHƯA ĐÚNG (${firstCheck.reason}). Tự động đổi từ ${initialType} sang ${alternateType} và bấm "Tự động điền" lại...`,
  )

  selectAddressTypeRadio(alternateType)
  await sleep(500)

  const smartInput = findSmartImportInput()
  if (smartInput && (!smartInput.value || smartInput.value.trim() === '')) {
    setInputValue(smartInput, inputText)
    await sleep(250)
  }

  const pasteBtn = findSmartImportButton()
  if (pasteBtn) {
    console.log(`[Bookstore AI] Đang bấm lại nút "Tự động điền" lần 2 (chế độ ${alternateType})...`)
    safelyClick(pasteBtn)
    await sleep(950)
  }

  if (orderData) {
    const addrInfo = parseAddressComponents(orderData)
    await selectAddressSuggestionIfPresent(addrInfo)
  }

  try {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }),
    )
  } catch { }

  displayedCascader = getDisplayedCascaderAddress()
  const secondCheck = checkCascaderAddressMatches(
    displayedCascader,
    inputText,
    orderData,
    getSpxAddressWarningText(),
  )

  if (secondCheck.isMatch) {
    console.log(`[Bookstore AI] ✅ Đổi sang ${alternateType} thành công! Địa chỉ đã khớp: "${displayedCascader}"`)
    removeAddressMismatchAlert()
    highlightCascaderSuccess()
    return { success: true, displayedCascader }
  }

  console.error(`[Bookstore AI] ❌ Địa chỉ vẫn KHÔNG CHUẨN sau khi thử cả 2 cấp và 3 cấp!`, {
    inputText,
    displayedCascader,
    reason: secondCheck.reason,
  })

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
  } catch { }

  return {
    success: false,
    displayedCascader,
    errorReason: secondCheck.reason,
  }
}

export async function fillSmartImport(orderData: SpxOrderData, addrInfo: ParsedSpxAddress): Promise<boolean> {
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

  const normWard = normalizeVnText(stripAdminPrefixes(wardToUse))
  const normDist = normalizeVnText(stripAdminPrefixes(distToUse))
  if (
    normWard &&
    normDist &&
    (normWard === normDist || normWard.includes(normDist) || normDist.includes(normWard))
  ) {
    distToUse = ''
  }

  const rawDigits = (orderData.recipientPhone || '').replace(/\D/g, '')
  const cleanPhoneNoPrefix = rawDigits.replace(/^(?:84|0)/, '')
  const cleanPhone10 = cleanPhoneNoPrefix.length >= 9 ? `0${cleanPhoneNoPrefix}` : ''

  const fullLoc =
    isOld && distToUse
      ? [wardToUse, distToUse, provToUse].filter(Boolean).join(', ')
      : [wardToUse, provToUse].filter(Boolean).join(', ')

  const smartPayload = [orderData.recipientName, cleanPhone10, addrInfo.detailAddress, fullLoc]
    .filter(Boolean)
    .join(', ')
  console.log('[Bookstore AI] Đang kích hoạt Smart Import SPX với payload chuẩn:', smartPayload)

  smartInput.focus()
  setInputValue(smartInput, smartPayload)
  smartInput.dispatchEvent(new Event('input', { bubbles: true }))
  smartInput.dispatchEvent(new Event('change', { bubbles: true }))
  await sleep(400)

  let pasteBtn = findSmartImportButton()
  if (!pasteBtn) {
    await sleep(300)
    pasteBtn = findSmartImportButton()
  }

  if (pasteBtn) {
    console.log('[Bookstore AI] ĐANG BẤM NÚT "Tự động điền"...', pasteBtn)
    safelyClick(pasteBtn)
    await sleep(800)

    try {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }),
      )
    } catch { }

    console.log('[Bookstore AI] Đã bấm nút "Tự động điền"! GIỮ NGUYÊN toàn bộ Mục 2 người nhận.')

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

export function attachSmartImportObserver() {
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
    true,
  )
}
