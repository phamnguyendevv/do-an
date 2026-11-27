import {
  normalizeVnText,
  resolveWeightKgAndQty,
  type SpxOrderData,
} from '../../utils/spx-address'
import {
  dispatchMouseClick,
  isElementVisible,
  isInsideSection2,
  safelyClick,
  setAntDesignNumber,
  simulateTyping,
  sleep,
} from './dom-helpers'

// Helper tìm thẻ card chứa Section 4 (TUYỆT ĐỐI KHÔNG BAO GỒM SECTION 2 HAY THẺ FORM TOÀN TRANG)
export function findSection4Card(): HTMLElement {
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, div, span, p')).filter((el) => {
    if (el.children.length > 2) return false
    const t = (el.textContent || '').trim().toLowerCase()
    return t.includes('thông tin bưu gửi') || t.includes('thong tin buu gui')
  }) as HTMLElement[]

  for (const h of headings) {
    if (!isElementVisible(h)) continue
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

  const allCheckboxLabels = Array.from(document.querySelectorAll('label, span, div')).filter((el) => {
    return el.children.length === 0 && (el.textContent || '').trim().toLowerCase().includes('lưu vào danh sách sản phẩm')
  })

  for (const lbl of allCheckboxLabels) {
    const card = lbl.closest('.ant-card, [class*="card"], div')
    if (card && card !== document.body && card.tagName !== 'FORM' && !isInsideSection2(card as HTMLElement)) {
      return card as HTMLElement
    }
  }

  const priceLabels = Array.from(document.querySelectorAll('label, span, div')).filter((el) => {
    const t = (el.textContent || '').trim().toLowerCase()
    return (
      (t === 'giá sản phẩm' || t === '* giá trị bưu gửi' || t === 'giá trị bưu gửi') &&
      !isInsideSection2(el as HTMLElement)
    )
  })
  for (const lbl of priceLabels) {
    const card = lbl.closest('.ant-card, [class*="card"], div')
    if (card && card !== document.body && card.tagName !== 'FORM' && !isInsideSection2(card as HTMLElement)) {
      return card as HTMLElement
    }
  }

  return document.body
}

function findProductNameSelect(sec4Card: HTMLElement): HTMLElement | null {
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

  const firstSelect = sec4Card.querySelector('.ant-select') as HTMLElement | null
  if (firstSelect && isElementVisible(firstSelect) && !isInsideSection2(firstSelect)) {
    return firstSelect
  }

  return null
}

function findProductNameInput(sec4Card: HTMLElement): HTMLInputElement | null {
  const labels = Array.from(sec4Card.querySelectorAll('label, div, span, p')).filter((el) => {
    if (el.children.length > 2 || isInsideSection2(el)) return false
    const t = (el.textContent || '').trim().toLowerCase()
    return t === '* tên sản phẩm' || t === 'tên sản phẩm'
  }) as HTMLElement[]

  for (const lbl of labels) {
    let p: HTMLElement | null = lbl.closest('.ant-form-item, .form-item, div') || lbl.parentElement
    let depth = 0
    while (p && depth < 5) {
      const inp = p.querySelector(
        'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])',
      ) as HTMLInputElement
      if (inp && isElementVisible(inp) && !isInsideSection2(inp)) return inp
      p = p.parentElement
      depth++
    }
  }

  const inps = Array.from(
    sec4Card.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])'),
  ).filter((inp) => isElementVisible(inp) && !isInsideSection2(inp)) as HTMLInputElement[]

  for (const inp of inps) {
    const ph = (inp.getAttribute('placeholder') || '').toLowerCase()
    if (ph.includes('sản phẩm') || ph.includes('tạo thêm') || ph.includes('chọn hoặc')) {
      return inp
    }
  }

  return inps.length > 0 ? inps[0] : null
}

async function clickProductSuggestion(prodInput: HTMLElement, typedText: string): Promise<boolean> {
  const inputRect = prodInput.getBoundingClientRect()
  const cleanTyped = normalizeVnText(typedText)
  console.log('[Bookstore AI] Đang tìm và click ô gợi ý sản phẩm cho:', typedText)

  const startTime = Date.now()
  while (Date.now() - startTime < 3500) {
    const dropOptions = Array.from(
      document.querySelectorAll(
        '.ant-select-dropdown:not(.ant-select-dropdown-hidden) [role="option"], .ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option, .ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item, [class*="suggestion"] li, [class*="dropdown"] li, [class*="product"] li',
      ),
    ).filter((el) => isElementVisible(el) && !isInsideSection2(el as HTMLElement)) as HTMLElement[]

    if (dropOptions.length > 0) {
      const matched = dropOptions.filter((el) => {
        const t = normalizeVnText(el.textContent || '')
        return t.includes(cleanTyped) || cleanTyped.includes(t) || (cleanTyped.length > 5 && t.includes(cleanTyped.slice(0, 8)))
      })
      const targetEl = matched.length > 0 ? matched[0] : dropOptions[0]
      console.log('[Bookstore AI] Đã tìm thấy option trong dropdown danh sách:', targetEl, targetEl.textContent?.trim())
      targetEl.scrollIntoView({ block: 'nearest' })
      await sleep(50)
      dispatchMouseClick(targetEl)
      try { targetEl.click() } catch { }
      await sleep(350)
      return true
    }

    const candidates = Array.from(document.querySelectorAll('*')).filter((el) => {
      if (!isElementVisible(el)) return false
      if (el === prodInput || el.contains(prodInput) || prodInput.contains(el) || isInsideSection2(el as HTMLElement)) {
        return false
      }

      const r = el.getBoundingClientRect()
      const isBelow = r.top >= inputRect.bottom - 10 && r.top <= inputRect.bottom + 250
      const isOverlapX = Math.max(r.left, inputRect.left) < Math.min(r.right, inputRect.right) + 20
      if (!isBelow || !isOverlapX) return false

      const text = (el.textContent || '').trim()
      if (!text || text.length < 2) return false

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
      try { targetEl.click() } catch { }
      const firstChild = targetEl.firstElementChild as HTMLElement | null
      if (firstChild) {
        dispatchMouseClick(firstChild)
        try { firstChild.click() } catch { }
      }
      await sleep(400)
      return true
    }

    await sleep(150)
  }

  console.warn('[Bookstore AI] Không thấy ô gợi ý sau 3.5s, dispatch Enter fallback...')
  const enterKey = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }
  prodInput.dispatchEvent(new KeyboardEvent('keydown', enterKey))
  prodInput.dispatchEvent(new KeyboardEvent('keypress', enterKey))
  prodInput.dispatchEvent(new KeyboardEvent('keyup', enterKey))
  return false
}

function findInputByLabel(sec4Card: HTMLElement, labelText: string, excludeText?: string): HTMLInputElement | null {
  const normTarget = normalizeVnText(labelText)
  const allLabels = Array.from(sec4Card.querySelectorAll('label, div, span, p')).filter((el) => {
    if (el.children.length > 2) return false
    const t = normalizeVnText(el.textContent || '')
    if (excludeText && t.includes(normalizeVnText(excludeText))) return false
    return t === normTarget || t.startsWith(normTarget) || t.includes(normTarget)
  }) as HTMLElement[]

  for (const lbl of allLabels) {
    let p: HTMLElement | null = lbl.parentElement
    let depth = 0
    while (p && p !== sec4Card && depth < 4) {
      if (p.classList.contains('ant-row') || p.classList.contains('row')) {
        break
      }

      const inps = Array.from(
        p.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])'),
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

    const sibling = lbl.nextElementSibling as HTMLElement | null
    if (sibling) {
      const inp = sibling.querySelector(
        'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])',
      ) as HTMLInputElement | null
      if (inp && isElementVisible(inp)) return inp
    }
  }

  return null
}

export function findSection4Inputs(sec4Card: HTMLElement) {
  const allSec4Inputs = Array.from(
    sec4Card.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])'),
  ).filter((inp) => isElementVisible(inp) && !isInsideSection2(inp)) as HTMLInputElement[]

  const productInputs = allSec4Inputs.filter((inp) => {
    const ph = (inp.getAttribute('placeholder') || '').toLowerCase()
    if (ph.includes('sản phẩm') || ph.includes('tạo thêm') || ph.includes('chọn hoặc')) return false
    if (
      ph.includes('chiều dài') ||
      ph.includes('chiều rộng') ||
      ph.includes('chiều cao') ||
      ph.includes('dài') ||
      ph.includes('rộng') ||
      ph.includes('cao')
    ) {
      return false
    }
    if (inp.closest('.ant-select, [class*="select"]')) return false

    const formItem = inp.closest('.ant-form-item, [class*="col"], div')
    const itemText = (formItem?.textContent || '').toLowerCase()
    if (
      itemText.includes('chiều dài') ||
      itemText.includes('chiều rộng') ||
      itemText.includes('chiều cao') ||
      itemText.includes('kích thước')
    ) {
      return false
    }

    return true
  })

  productInputs.sort((a, b) => {
    const ra = a.getBoundingClientRect()
    const rb = b.getBoundingClientRect()
    if (Math.abs(ra.top - rb.top) > 18) return ra.top - rb.top
    return ra.left - rb.left
  })

  let priceInp = findInputByLabel(sec4Card, 'giá sản phẩm', 'giá trị')
  let weightInp = findInputByLabel(sec4Card, 'khối lượng', 'tổng')
  let qtyInp = findInputByLabel(sec4Card, 'số lượng', 'tổng')
  let goodsValInp = findInputByLabel(sec4Card, 'giá trị bưu gửi')
  let totalWeightInp = findInputByLabel(sec4Card, 'tổng khối lượng')

  const assigned = [priceInp, weightInp, qtyInp, goodsValInp, totalWeightInp]
  const validAssigned = assigned.filter((i): i is HTMLInputElement => Boolean(i))
  const uniqueCount = new Set(validAssigned).size

  if (uniqueCount < validAssigned.length) {
    priceInp = null
    weightInp = null
    qtyInp = null
    goodsValInp = null
    totalWeightInp = null
  }

  const usedInputs = new Set(
    [priceInp, weightInp, qtyInp, goodsValInp, totalWeightInp].filter(
      (i): i is HTMLInputElement => Boolean(i),
    ),
  )

  const takeFallback = (preferredIdx: number): HTMLInputElement | null => {
    const preferred = productInputs[preferredIdx]
    if (preferred && !usedInputs.has(preferred)) {
      usedInputs.add(preferred)
      return preferred
    }
    const nextFree = productInputs.find((inp) => !usedInputs.has(inp)) || null
    if (nextFree) usedInputs.add(nextFree)
    return nextFree
  }

  if (!priceInp) priceInp = takeFallback(0)
  if (!weightInp) weightInp = takeFallback(1)
  if (!qtyInp) qtyInp = takeFallback(2)
  if (!goodsValInp) goodsValInp = takeFallback(3)
  if (!totalWeightInp) totalWeightInp = takeFallback(4)

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

export async function fillSection4Goods(orderData: SpxOrderData) {
  try {
    const sec4Card = findSection4Card()
    console.log('[Bookstore AI] Đã định vị Section 4 Card:', sec4Card)

    const { weightKg: targetWeightKg, quantity: targetQty } = resolveWeightKgAndQty(orderData)

    let targetTitle = (orderData.productName || '').trim()
    if (!targetTitle && orderData.items && orderData.items.length > 0) {
      targetTitle = orderData.items
        .map((it) => `${it.title}${it.quantity > 1 ? ` (x${it.quantity})` : ''}`)
        .join(' + ')
    }
    if (!targetTitle) targetTitle = 'Sách theo yêu cầu'

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
      targetWeightKg,
    })

    const prodSelect = findProductNameSelect(sec4Card)
    if (prodSelect) {
      prodSelect.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
      prodSelect.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await sleep(80)

      const clearBtn = prodSelect.querySelector('.ant-select-clear') as HTMLElement | null
      if (clearBtn && isElementVisible(clearBtn)) {
        console.log('[Bookstore AI] Đã click nút xóa sản phẩm cũ (.ant-select-clear)...')
        dispatchMouseClick(clearBtn)
        await sleep(150)
      }

      const selector = (prodSelect.querySelector('.ant-select-selector') || prodSelect) as HTMLElement
      dispatchMouseClick(selector)
      await sleep(150)
    }

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
      try { prodInput.focus() } catch { }
      safelyClick(prodInput)
      await sleep(100)

      try {
        const tracker = (prodInput as any)._valueTracker
        if (tracker) tracker.setValue('')
      } catch { }

      try {
        prodInput.select()
        document.execCommand('selectAll', false, undefined)
        document.execCommand('delete', false, undefined)
      } catch { }

      simulateTyping(prodInput, targetTitle)

      const proto = window.HTMLInputElement.prototype
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
      if (setter) setter.call(prodInput, targetTitle)
      else prodInput.value = targetTitle

      prodInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
      try {
        prodInput.dispatchEvent(
          new InputEvent('input', { bubbles: true, composed: true, data: targetTitle, inputType: 'insertText' }),
        )
      } catch { }
      prodInput.dispatchEvent(new Event('change', { bubbles: true }))

      await sleep(350)

      await clickProductSuggestion(prodInput, targetTitle)
      await sleep(400)
    }

    let freshCard = findSection4Card()
    let inputs = findSection4Inputs(freshCard)
    const waitInputsStart = Date.now()
    while ((!inputs.priceInp || !inputs.weightInp) && Date.now() - waitInputsStart < 3500) {
      await sleep(200)
      freshCard = findSection4Card()
      inputs = findSection4Inputs(freshCard)
    }

    if (inputs.priceInp && unitPrice > 0) {
      console.log('[Bookstore AI] Điền Giá sản phẩm (= COD):', unitPrice, inputs.priceInp)
      setAntDesignNumber(inputs.priceInp, unitPrice)
      await sleep(150)
    }

    if (inputs.weightInp) {
      console.log('[Bookstore AI] Điền Khối lượng sản phẩm (kg):', targetWeightKg, inputs.weightInp)
      setAntDesignNumber(inputs.weightInp, targetWeightKg)
      await sleep(150)
    }

    if (inputs.qtyInp) {
      console.log('[Bookstore AI] Điền Số lượng sản phẩm:', targetQty, inputs.qtyInp)
      setAntDesignNumber(inputs.qtyInp, targetQty)
      await sleep(150)
    }

    if (inputs.goodsValInp && finalCod > 0) {
      console.log('[Bookstore AI] Điền Giá trị bưu gửi (= COD):', finalCod, inputs.goodsValInp)
      setAntDesignNumber(inputs.goodsValInp, finalCod)
      await sleep(150)
    }

    if (inputs.totalWeightInp) {
      console.log('[Bookstore AI] Điền Tổng khối lượng (kg):', targetWeightKg, inputs.totalWeightInp)
      setAntDesignNumber(inputs.totalWeightInp, targetWeightKg)
      await sleep(150)
    }
  } catch (err) {
    console.error('[Bookstore AI] Lỗi khi điền Mục 4 Thông tin bưu gửi:', err)
  }
}
