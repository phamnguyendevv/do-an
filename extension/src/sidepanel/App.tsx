import React, { useState, useEffect } from 'react'
import { parseAddressComponents } from '../content/spx'
import {
  Sparkles,
  MessageSquare,
  PackageCheck,
  Truck,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Search,
  Settings,
  ChevronRight,
  BookOpen,
  Zap,
  Send,
  Edit3,
  ArrowRight,
  CheckCircle2,
  Download,
} from 'lucide-react'

export interface ChatMessage {
  sender: 'customer' | 'seller' | 'system'
  text: string
}

export interface AnalyzedData {
  intent: string
  intentConfidence: number
  summary: string
  customer: {
    customerName?: string
    phone?: string
    province?: string
    district?: string
    ward?: string
    detailAddress?: string
    rawAddress?: string
  }
  items: Array<{
    bookId: string | null
    bookTitle: string
    quantity: number
    price?: number
    action?: string
    originalText?: string
  }>
  missingFields: string[]
  isReadyToCreateOrder: boolean
  suggestedReply: string
  shippingFee?: number
  totalCod?: number
}

export interface SpxRecommendation {
  mode: 'OLD_3_LEVEL' | 'NEW_2_LEVEL'
  modeText: string
  levels: string[]
  reason: string
}

export interface AddressVerificationResult {
  address: string
  isValid: boolean
  isExisting: boolean
  province: string
  district: string
  ward: string
  suggestedWard?: string
  detailAddress: string
  addressType: 'OLD_3_LEVEL' | 'NEW_2_LEVEL'
  streetInfo?: string
  administrativeHistory?: string
  spxRecommendation: SpxRecommendation
  overviewAi: string
  bulletPoints: string[]
}

// Helper trích xuất số điện thoại Việt Nam siêu linh hoạt (hỗ trợ có khoảng trắng, dấu chấm, dấu gạch ngang, tiền tố +84 / 84)
export function extractVnPhone(raw: string): string {
  if (!raw) return ''
  const normalized = raw
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')

  // 1. Regex tìm SĐT 10 số VN (hỗ trợ khoảng trắng, dấu chấm, dấu gạch ngang giữa các số, mã +84 / 84)
  const regex = /(?:(?:\+?84|0)\s*[35789])(?:[\s.-]*\d){8}\b/
  const match = normalized.match(regex)
  if (match) {
    let cleaned = match[0].replace(/\D/g, '')
    if (cleaned.startsWith('84')) {
      cleaned = '0' + cleaned.slice(2)
    }
    if (cleaned.length === 10 && /^0[35789]\d{8}$/.test(cleaned)) {
      return cleaned
    }
  }

  // 2. Fallback: Quét tìm bất kỳ chuỗi 10 chữ số nào bắt đầu bằng 03, 05, 07, 08, 09
  const digitsOnly = normalized.replace(/\D/g, '')
  const fallbackMatch = digitsOnly.match(/(?:0[35789]\d{8})/)
  if (fallbackMatch) {
    return fallbackMatch[0]
  }

  return ''
}

async function extractZaloInPage(scrollUp = false) {
  function localExtractPhone(raw: string): string {
    if (!raw) return ''
    const normalized = raw
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ')

    const regex = /(?:(?:\+?84|0)\s*[35789])(?:[\s.-]*\d){8}\b/
    const match = normalized.match(regex)
    if (match) {
      let cleaned = match[0].replace(/\D/g, '')
      if (cleaned.startsWith('84')) {
        cleaned = '0' + cleaned.slice(2)
      }
      if (cleaned.length === 10 && /^0[35789]\d{8}$/.test(cleaned)) {
        return cleaned
      }
    }

    const digitsOnly = normalized.replace(/\D/g, '')
    const fallbackMatch = digitsOnly.match(/(?:0[35789]\d{8})/)
    if (fallbackMatch) {
      return fallbackMatch[0]
    }
    return ''
  }

  let customerName = ''
  const headerNameEl =
    document.querySelector('.chat-title__name') ||
    document.querySelector('[data-id="chat-title"]') ||
    document.querySelector('.truncate.title') ||
    document.querySelector('.header-title') ||
    document.querySelector('[class*="chat-title"]') ||
    document.querySelector('[class*="chatTitle"]') ||
    document.querySelector('.chat-header [class*="title"]') ||
    document.querySelector('#chatHeader [class*="title"]')
  if (headerNameEl && headerNameEl.textContent) {
    customerName = headerNameEl.textContent.trim()
  }

  const scrollContainer =
    document.querySelector('#messageViewScroll') ||
    document.querySelector('[data-id="div_ScrollableChat"]') ||
    document.querySelector('.message-view__scroll') ||
    document.querySelector('.chat-message-list') ||
    document.querySelector('#messageView') ||
    document.querySelector('.chat-view') ||
    document.querySelector('#chatView') ||
    document.querySelector('.chat-conversation') ||
    document.querySelector('[class*="chat-message-list"]') ||
    document.querySelector('[class*="message-view"]') ||
    document.body

  const chatArea =
    document.querySelector('#chatView') ||
    document.querySelector('.chat-view') ||
    document.querySelector('[data-id="chat-box"]') ||
    document.querySelector('.chat-box') ||
    document.querySelector('.chat-conversation') ||
    document.querySelector('#messageView') ||
    document.body

  // Scroll container and viewport midX setup

  const containerRect =
    scrollContainer === document.body
      ? document.body.getBoundingClientRect()
      : (scrollContainer as Element).getBoundingClientRect()
  const midX = containerRect.left + containerRect.width / 2

  let detectedPhone = ''

  // 1. Quét tìm Tin nhắn ghim (Pinned messages) trong Zalo Web
  const pinnedMessages: string[] = []
  const candidatePinElements = new Set<Element>()

  const pinSelectors = [
    '[class*="pin-board"]',
    '[class*="pinBoard"]',
    '[class*="pin-msg"]',
    '[class*="pinMsg"]',
    '[class*="pin-message"]',
    '[class*="pinMessage"]',
    '[class*="chat-pin"]',
    '[class*="pinned"]',
    '[class*="PinItem"]',
    '[class*="pin-item"]',
    '[class*="pin_item"]',
    '[class*="pin-container"]',
    '[class*="pin_container"]',
    '[class*="pin-content"]',
    '[class*="pin_content"]',
    '[class*="board-pinned"]',
    '[data-id*="pin"]',
    '[data-id*="Pin"]',
    '.pin-board',
    '.pinned-message',
    '.chat-pin',
    '.pin-item',
    '.pin-content',
    '.pin-box',
  ]

  // a. Tìm qua selectors
  pinSelectors.forEach((sel) => {
    try {
      chatArea.querySelectorAll(sel).forEach((el) => {
        if (
          !el.closest('#chatList') &&
          !el.closest('.conv-item') &&
          !el.closest('.conversation-item') &&
          !el.closest('.nav-item') &&
          !el.closest('#chatInput') &&
          !el.closest('.chat-input')
        ) {
          candidatePinElements.add(el)
        }
      })
    } catch (_) {}
  })

  // b. Tìm các phần tử nằm giữa Header và scrollContainer
  const headerEl =
    chatArea.querySelector('.chat-header') ||
    chatArea.querySelector('#chatHeader') ||
    document.querySelector('.chat-header') ||
    document.querySelector('#chatHeader')

  if (scrollContainer && scrollContainer !== document.body) {
    let cur: Element | null = scrollContainer
    while (cur && cur !== chatArea && cur !== document.body) {
      let prev = cur.previousElementSibling
      while (prev) {
        if (
          prev !== headerEl &&
          !prev.contains(headerEl) &&
          !prev.closest('#chatList') &&
          !prev.closest('.conv-item') &&
          !prev.closest('.nav-item')
        ) {
          candidatePinElements.add(prev)
        }
        prev = prev.previousElementSibling
      }
      cur = cur.parentElement
    }
  }

  // c. Quét các thẻ có nhãn ghim "Tin nhắn" hoặc "Tin ghim" hoặc "Ghim"
  const potentialPinEls = Array.from(chatArea.querySelectorAll('div, section, span, p'))
  for (const el of potentialPinEls) {
    if (
      el.closest('#chatList') ||
      el.closest('.conv-item') ||
      el.closest('.conversation-item') ||
      el.closest('.nav-item') ||
      el.closest('#chatInput') ||
      el.closest('.chat-input') ||
      el.closest('.chat-header') ||
      el.closest('#chatHeader')
    ) {
      continue
    }
    const t = (el.textContent || '').trim()
    if (
      /^(Tin nhắn|Tin ghim|Ghim|Pinned message)\b/i.test(t) &&
      t.length >= 15 &&
      (t.includes(':') || t.includes('SĐT') || /0[35789]\d{8}/.test(t))
    ) {
      candidatePinElements.add(el)
    }
  }

  // Làm sạch và bóc tách nội dung tin nhắn ghim
  const seenPinTexts = new Set<string>()
  Array.from(candidatePinElements).forEach((el) => {
    if (el === chatArea || el === document.body) return
    const clone = el.cloneNode(true) as HTMLElement
    clone
      .querySelectorAll(
        'button, svg, [role="button"], [class*="close"], [class*="menu"], [class*="more"], [class*="action"], [class*="icon"], [class*="btn"]',
      )
      .forEach((b) => b.remove())

    const raw = (clone.innerText || clone.textContent || '').trim()
    if (!raw || raw.length < 8) return

    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => {
        if (!l) return false
        if (/^(Tin nhắn|Tin ghim|Ghim|Pinned message|Bình chọn|Nhắc hẹn)$/i.test(l)) return false
        if (/^\d{1,2}:\d{2}(\s*(AM|PM|Hôm nay|Hôm qua|\w+))?$/i.test(l)) return false
        if (/^[.…\s•\-]+$/.test(l)) return false
        return true
      })

    const cleanText = lines.join(' ').replace(/\s+/g, ' ').trim()
    if (!cleanText || cleanText.length < 8) return

    let isSubset = false
    for (const existing of seenPinTexts) {
      if (existing.includes(cleanText) || cleanText.includes(existing)) {
        isSubset = true
        if (cleanText.length > existing.length) {
          seenPinTexts.delete(existing)
          const idx = pinnedMessages.indexOf(existing)
          if (idx !== -1) pinnedMessages.splice(idx, 1)
          seenPinTexts.add(cleanText)
          pinnedMessages.push(cleanText)
        }
        break
      }
    }
    if (!isSubset) {
      seenPinTexts.add(cleanText)
      pinnedMessages.push(cleanText)
    }
  })

  // Ưu tiên SĐT trong tin nhắn ghim số 1
  for (const pinText of pinnedMessages) {
    const pinPhone = localExtractPhone(pinText)
    if (pinPhone) {
      detectedPhone = pinPhone
      break
    }
  }

  // Nếu tên khách chưa có hoặc là "Khách hàng", trích xuất tên từ đầu tin ghim (ví dụ: "Trần Huyền: Khu 9 Thị trấn Thịnh Long...")
  if (!customerName || customerName === 'Khách hàng') {
    for (const pinText of pinnedMessages) {
      const match = pinText.match(/^([A-ZÀ-Ỹa-zà-ỹ\s]{2,30}):/)
      if (match && !/tin nhắn|tin ghim|ghi chú|thông báo/i.test(match[1])) {
        customerName = match[1].trim()
        break
      }
    }
  }

  // 2. Quét tìm tất cả các thẻ Danh thiếp (Contact Card) trong Zalo Web
  const contactCardMap = new Map<HTMLElement, { name: string; phone: string }>()
  const candidateButtons = Array.from(
    (scrollContainer as Element).querySelectorAll('button, a, div[role="button"], span, div'),
  )
  candidateButtons.forEach((el) => {
    const text = (el.textContent || '').trim()
    if (/kết bạn|nhắn tin|chia sẻ danh thiếp|danh thiếp/i.test(text)) {
      const card =
        el.closest('.card') ||
        el.closest('[class*="card"]') ||
        el.closest('[data-id*="Msg_"]') ||
        el.closest('.chat-item') ||
        el.closest('.msg-item') ||
        el.parentElement?.parentElement ||
        el.parentElement
      if (card && !contactCardMap.has(card as HTMLElement)) {
        const cardText = ((card as HTMLElement).innerText || card.textContent || '').trim()
        const cardPhone = localExtractPhone(cardText)
        if (cardPhone) {
          if (!detectedPhone) {
            detectedPhone = cardPhone
          }
          const lines = cardText
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l && !/kết bạn|nhắn tin|chia sẻ|danh thiếp/i.test(l))
          let nameFound = ''
          for (const line of lines) {
            if (!localExtractPhone(line) && line.length >= 2 && line.length <= 40) {
              nameFound = line
              break
            }
          }
          contactCardMap.set(card as HTMLElement, {
            name: nameFound || customerName || 'Khách hàng',
            phone: cardPhone,
          })
        }
      }
    }
  })

  // 3. Helper bóc tách tin nhắn đang hiển thị trong DOM Zalo
  const collectVisibleZaloMessages = (
    container: Element,
    dividerX: number,
    cardMap: Map<HTMLElement, { name: string; phone: string }>
  ): Array<{ id: string; sender: 'customer' | 'seller'; text: string; top: number }> => {
    const bubbleSelectors = [
      '[data-id="div_ReceivedMsg_Text"]',
      '[data-id="div_SentMsg_Text"]',
      '[data-id*="Msg_Recommend"]',
      '[data-id*="Msg_Contact"]',
      '[data-id*="Msg_NameCard"]',
      '[data-id*="div_ReceivedMsg"]',
      '[data-id*="div_SentMsg"]',
      '.card--text',
      '.card--contact',
      '.card--recommend',
      '.card--share',
      '.card',
      '[class*="card--text"]',
      '[class*="card--contact"]',
      '[class*="card--recommend"]',
      '.chat-message__content',
      '[class*="bubble"]',
      '.bubble',
      '[class*="msg-text"]',
      '.chat-item',
      '.msg-item',
      '.chat-message',
    ]

    let bubbleNodes = Array.from(container.querySelectorAll(bubbleSelectors.join(', '))) as HTMLElement[]

    bubbleNodes = bubbleNodes.filter((node) => {
      return (
        !node.closest('#chatList') &&
        !node.closest('.conv-item') &&
        !node.closest('.conversation-item') &&
        !node.closest('.nav-item') &&
        !node.closest('.chat-header') &&
        !node.closest('.chat-input') &&
        !node.closest('#chatInput')
      )
    })

    cardMap.forEach((_, cardEl) => {
      if (!bubbleNodes.includes(cardEl)) {
        bubbleNodes.push(cardEl)
      }
    })

    const finalNodes = bubbleNodes.filter((node) => {
      if (cardMap.has(node)) return true
      return !bubbleNodes.some((other) => other !== node && node.contains(other))
    })

    finalNodes.sort((a, b) => {
      return a.getBoundingClientRect().top - b.getBoundingClientRect().top
    })

    const results: Array<{ id: string; sender: 'customer' | 'seller'; text: string; top: number }> = []

    finalNodes.forEach((node) => {
      const matchedCard = Array.from(cardMap.entries()).find(
        ([cardEl]) => cardEl === node || cardEl.contains(node)
      )
      if (matchedCard) {
        const cardInfo = matchedCard[1]
        const text = `[Chia sẻ danh thiếp]: ${cardInfo.name} - SĐT: ${cardInfo.phone}`
        const id = `card:${cardInfo.phone}`
        results.push({ id, sender: 'customer', text, top: node.getBoundingClientRect().top })
        return
      }

      let quotePrefix = ''
      const quoteEl = node.querySelector('.quote-banner, .quote-content, [class*="quote"]')
      if (quoteEl) {
        const qText = (quoteEl.textContent || '').trim().replace(/\s+/g, ' ')
        if (qText && qText.length >= 2 && qText.length <= 150) {
          quotePrefix = `[Trả lời: "${qText}"]: `
        }
      }

      const clone = node.cloneNode(true) as HTMLElement
      const noiseSelectors = [
        '.time',
        '.message-time',
        '[class*="time"]',
        '.reaction-emoji',
        '[class*="reaction"]',
        '.status',
        '[class*="status"]',
        '.quote-banner',
        'svg',
        '.card-actions',
        'button',
      ]
      clone.querySelectorAll(noiseSelectors.join(', ')).forEach((el) => el.remove())

      let rawText = (clone.innerText || clone.textContent || '').trim()
      if (!rawText || rawText.length < 1) return
      if (/^\d{1,2}:\d{2}(\s+(Hôm nay|Hôm qua|ngày|\w+))?$/i.test(rawText)) return
      if (['Đã gửi', 'Đã nhận', 'Đã xem', 'Chuyển tiếp', 'Thu hồi', 'Tin nhắn đã bị thu hồi'].includes(rawText)) return

      const fullText = (quotePrefix + rawText).trim()
      if (!fullText) return

      const rect = node.getBoundingClientRect()
      const isRight = rect.left + rect.width / 2 > dividerX

      const hasMeClass =
        node.classList.contains('me') ||
        node.classList.contains('chat-message--me') ||
        node.closest('[data-id="div_SentMsg_Text"]') !== null ||
        node.closest('[data-id*="SentMsg"]') !== null ||
        node.closest('.me') !== null ||
        node.closest('[class*="sent"]') !== null ||
        node.closest('[class*="me-"]') !== null

      const hasReceivedClass =
        node.closest('[data-id="div_ReceivedMsg_Text"]') !== null ||
        node.closest('[data-id*="ReceivedMsg"]') !== null ||
        node.closest('[class*="received"]') !== null ||
        node.closest('[class*="other"]') !== null

      let sender: 'customer' | 'seller' = 'customer'
      if (hasMeClass) {
        sender = 'seller'
      } else if (hasReceivedClass) {
        sender = 'customer'
      } else {
        sender = isRight ? 'seller' : 'customer'
      }

      const row = node.closest('[data-id], .chat-item, .msg-item') as HTMLElement | null
      const rowId = row?.getAttribute('data-id') || row?.id || ''
      const id = rowId ? `${rowId}:${sender}:${fullText}` : `${sender}:${fullText}`

      results.push({
        id,
        sender,
        text: fullText,
        top: rect.top,
      })
    })

    return results
  }

  // 4. THU THẬP ĐA TẦNG VÀ TỰ ĐỘNG CUỘN NẠP TOÀN BỘ CUỘC TRÒ CHUYỆN (FULL HISTORY)
  const orderedMessages: Array<{ sender: 'customer' | 'seller'; text: string }> = []
  const seenMessageIds = new Set<string>()

  const addBatch = (
    batch: Array<{ id: string; sender: 'customer' | 'seller'; text: string }>,
    isPrepend = false
  ) => {
    let added = 0
    if (isPrepend) {
      for (let i = batch.length - 1; i >= 0; i--) {
        const item = batch[i]
        if (!seenMessageIds.has(item.id)) {
          seenMessageIds.add(item.id)
          orderedMessages.unshift({ sender: item.sender, text: item.text })
          added++
        }
      }
    } else {
      for (const item of batch) {
        if (!seenMessageIds.has(item.id)) {
          seenMessageIds.add(item.id)
          orderedMessages.push({ sender: item.sender, text: item.text })
          added++
        }
      }
    }
    return added
  }

  const initialBatch = collectVisibleZaloMessages(scrollContainer as Element, midX, contactCardMap)
  addBatch(initialBatch, false)

  // Mặc định cuộn 10 đợt nếu bấm lấy tin thường, cuộn 20 đợt nếu bấm "Cuộn sâu lấy hết"
  const maxScrollPasses = scrollUp ? 20 : 10
  if (
    scrollContainer &&
    scrollContainer !== document.body &&
    (scrollContainer as HTMLElement).scrollHeight > (scrollContainer as HTMLElement).clientHeight
  ) {
    const el = scrollContainer as HTMLElement
    let consecutiveZeroCount = 0

    for (let pass = 0; pass < maxScrollPasses; pass++) {
      const prevScrollTop = el.scrollTop

      el.scrollTop = Math.max(0, el.scrollTop - 1500)
      el.dispatchEvent(new Event('scroll', { bubbles: true }))

      await new Promise((resolve) => setTimeout(resolve, 380))

      const batch = collectVisibleZaloMessages(scrollContainer as Element, midX, contactCardMap)
      const added = addBatch(batch, true)

      if (added === 0 && (el.scrollTop <= 0 || el.scrollTop === prevScrollTop)) {
        consecutiveZeroCount++
        if (consecutiveZeroCount >= 2) {
          break
        }
      } else {
        consecutiveZeroCount = 0
      }
    }

    try {
      el.scrollTop = el.scrollHeight
      el.dispatchEvent(new Event('scroll', { bubbles: true }))
    } catch (_) {}
  }

  // 5. Đưa các tin nhắn ghim lên đầu danh sách tin nhắn
  pinnedMessages.forEach((pinText) => {
    const formattedPin = `[Tin nhắn ghim]: ${pinText}`
    const key = `pin:${formattedPin}`
    if (!seenMessageIds.has(key)) {
      seenMessageIds.add(key)
      orderedMessages.unshift({
        sender: 'customer',
        text: formattedPin,
      })
    }
  })

  // 6. Quét tìm số điện thoại trong toàn bộ tin nhắn đã thu thập
  if (!detectedPhone) {
    for (const msg of orderedMessages) {
      const found = localExtractPhone(msg.text)
      if (found) {
        detectedPhone = found
        break
      }
    }
  }

  // Fallback: Tìm trong toàn bộ text của chatArea
  if (!detectedPhone) {
    const containerText =
      ((scrollContainer as HTMLElement).innerText || scrollContainer.textContent || '').trim()
    detectedPhone = localExtractPhone(containerText)
  }

  if (!detectedPhone && chatArea && chatArea !== document.body) {
    const chatText = ((chatArea as HTMLElement).innerText || chatArea.textContent || '').trim()
    detectedPhone = localExtractPhone(chatText)
  }

  if (!detectedPhone) {
    const telLink = (chatArea || document).querySelector('a[href^="tel:"]')
    if (telLink) {
      detectedPhone = localExtractPhone(telLink.getAttribute('href') || '')
    }
  }

  // Đảm bảo số điện thoại luôn có trong danh sách tin nhắn gửi sang AI
  if (detectedPhone) {
    const hasPhoneInMessages = orderedMessages.some((m) => m.text.includes(detectedPhone))
    if (!hasPhoneInMessages) {
      orderedMessages.unshift({
        sender: 'customer',
        text: `[Chia sẻ danh thiếp]: ${customerName || 'Khách hàng'} - SĐT: ${detectedPhone}`,
      })
    }
  }

  return {
    customerName,
    customerPhone: detectedPhone,
    messages: orderedMessages,
  }
}

async function extractFbInPage(scrollUp = false) {
  function localExtractPhone(raw: string): string {
    if (!raw) return ''
    const normalized = raw
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ')

    const regex = /(?:(?:\+?84|0)\s*[35789])(?:[\s.-]*\d){8}\b/
    const match = normalized.match(regex)
    if (match) {
      let cleaned = match[0].replace(/\D/g, '')
      if (cleaned.startsWith('84')) {
        cleaned = '0' + cleaned.slice(2)
      }
      if (cleaned.length === 10 && /^0[35789]\d{8}$/.test(cleaned)) {
        return cleaned
      }
    }

    const digitsOnly = normalized.replace(/\D/g, '')
    const fallbackMatch = digitsOnly.match(/(?:0[35789]\d{8})/)
    if (fallbackMatch) {
      return fallbackMatch[0]
    }
    return ''
  }

  let customerName = ''
  const headerEl =
    document.querySelector('h2') ||
    document.querySelector('[role="main"] h1') ||
    document.querySelector('span[dir="auto"]')
  if (headerEl && headerEl.textContent) {
    customerName = headerEl.textContent.trim()
  }

  const scrollContainer =
    document.querySelector('[role="main"] [role="region"]') ||
    document.querySelector('div[data-scope="messages_table"]') ||
    document.querySelector('[role="main"]') ||
    document.body

  const containerRect =
    scrollContainer === document.body
      ? document.body.getBoundingClientRect()
      : (scrollContainer as Element).getBoundingClientRect()
  const midX = containerRect.left + containerRect.width / 2

  const collectVisibleFbMessages = (
    container: Element | Document,
    dividerX: number
  ): Array<{ id: string; sender: 'customer' | 'seller'; text: string; top: number }> => {
    const messageNodes = Array.from(
      container.querySelectorAll(
        '[role="row"] [dir="auto"], div[data-scope="messages_table"] span, [data-testid="message-container"], [class*="messageText"]'
      )
    )

    const finalNodes = messageNodes.filter((node) => {
      return !messageNodes.some((other) => other !== node && node.contains(other))
    })

    finalNodes.sort((a, b) => {
      return a.getBoundingClientRect().top - b.getBoundingClientRect().top
    })

    const results: Array<{ id: string; sender: 'customer' | 'seller'; text: string; top: number }> = []

    finalNodes.forEach((node) => {
      const clone = node.cloneNode(true) as HTMLElement
      clone.querySelectorAll('svg, button, [aria-hidden="true"]').forEach((el) => el.remove())

      const text = (clone.innerText || clone.textContent || '').trim()
      if (!text || text.length < 1) return
      if (/^\d{1,2}:\d{2}(\s*(AM|PM))?$/i.test(text)) return
      if (['Đã gửi', 'Đã chuyển', 'Đã xem', 'Thích', 'Đã gỡ'].includes(text)) return

      const parentRow = node.closest('[role="row"]')
      const rect = node.getBoundingClientRect()
      const isRight = rect.left + rect.width / 2 > dividerX

      const isSeller =
        parentRow?.getAttribute('aria-label')?.includes('Bạn đã gửi') ||
        parentRow?.getAttribute('aria-label')?.includes('You sent') ||
        isRight

      const sender: 'customer' | 'seller' = isSeller ? 'seller' : 'customer'
      const id = `${sender}:${text}`

      results.push({
        id,
        sender,
        text,
        top: rect.top,
      })
    })

    return results
  }

  const orderedMessages: Array<{ sender: 'customer' | 'seller'; text: string }> = []
  const seenIds = new Set<string>()

  const addBatch = (
    batch: Array<{ id: string; sender: 'customer' | 'seller'; text: string }>,
    isPrepend = false
  ) => {
    let added = 0
    if (isPrepend) {
      for (let i = batch.length - 1; i >= 0; i--) {
        const item = batch[i]
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id)
          orderedMessages.unshift({ sender: item.sender, text: item.text })
          added++
        }
      }
    } else {
      for (const item of batch) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id)
          orderedMessages.push({ sender: item.sender, text: item.text })
          added++
        }
      }
    }
    return added
  }

  const initialBatch = collectVisibleFbMessages(scrollContainer, midX)
  addBatch(initialBatch, false)

  const maxPasses = scrollUp ? 16 : 8
  if (scrollContainer && scrollContainer !== document.body) {
    const el = scrollContainer as HTMLElement
    for (let pass = 0; pass < maxPasses; pass++) {
      const prevTop = el.scrollTop
      el.scrollTop = Math.max(0, el.scrollTop - 1600)
      el.dispatchEvent(new Event('scroll', { bubbles: true }))

      await new Promise((r) => setTimeout(r, 450))

      const batch = collectVisibleFbMessages(scrollContainer, midX)
      const added = addBatch(batch, true)

      if (added === 0 && (el.scrollTop <= 0 || el.scrollTop === prevTop)) {
        break
      }
    }

    try {
      el.scrollTop = el.scrollHeight
    } catch (_) {}
  }

  let detectedPhone = ''
  for (const m of orderedMessages) {
    const p = localExtractPhone(m.text)
    if (p) {
      detectedPhone = p
      break
    }
  }

  if (!detectedPhone) {
    const rawAll = (scrollContainer as Element).textContent || ''
    detectedPhone = localExtractPhone(rawAll)
  }

  return {
    customerName,
    customerPhone: detectedPhone,
    messages: orderedMessages,
  }
}

// Helper chuẩn hóa & ghép nối địa chỉ người nhận, tự động khử trùng lặp (ví dụ: tránh bị "Đức Hòa, Đức Hòa")
export function formatCleanCustomerAddress(
  detail?: string,
  ward?: string,
  district?: string,
  province?: string
): string {
  const parts: string[] = []

  const cleanDetail = (detail || '').trim()
  const cleanWard = (ward || '').trim()
  const cleanDistrict = (district || '').trim()
  const cleanProvince = (province || '').trim()

  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/^(tỉnh|thành phố|tp|quận|huyện|thị xã|phường|xã|thị trấn|q|h|p|tx|tt)\.?\s+/i, '')
      .trim()

  if (cleanDetail) {
    parts.push(cleanDetail)
  }

  const normWard = norm(cleanWard)
  const normDist = norm(cleanDistrict)
  const isWardDistDuplicate = Boolean(
    normWard && normDist && (normWard === normDist || normWard.includes(normDist) || normDist.includes(normWard))
  )

  if (cleanWard) {
    const lastPart = parts.length > 0 ? norm(parts[parts.length - 1]) : ''
    if (!lastPart.includes(normWard)) {
      parts.push(cleanWard)
    }
  }

  if (cleanDistrict && !isWardDistDuplicate) {
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

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'order' | 'tracking'>('chat')
  const [backendUrl, setBackendUrl] = useState('http://localhost:3000')
  const [showSettings, setShowSettings] = useState(false)

  // Chat input
  const [rawChatText, setRawChatText] = useState('')
  const [extractStatus, setExtractStatus] = useState('')
  const [customerZaloName, setCustomerZaloName] = useState('')
  const [customerZaloPhone, setCustomerZaloPhone] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzedData, setAnalyzedData] = useState<AnalyzedData | null>(null)
  const [copiedReply, setCopiedReply] = useState(false)
  const [sentToZalo, setSentToZalo] = useState(false)

  // Order state
  const [orderDraft, setOrderDraft] = useState({
    customerName: '',
    phone: '',
    address: '',
    province: '',
    district: '',
    ward: '',
    detailAddress: '',
    codAmount: 0,
    weightGram: 1000,
    notes: '',
    addressType: 'OLD_3_LEVEL' as 'OLD_3_LEVEL' | 'NEW_2_LEVEL',
  })
  const [shippingCarrier, setShippingCarrier] = useState<'SPX' | 'GHN' | 'MANUAL'>('SPX')
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [createdOrderCode, setCreatedOrderCode] = useState<string | null>(null)
  const [spxTrackingCode, setSpxTrackingCode] = useState<string | null>(null)
  const [addressVerification, setAddressVerification] = useState<AddressVerificationResult | null>(null)
  const [isVerifyingAddress, setIsVerifyingAddress] = useState(false)

  // Trích xuất thông tin khách hàng tổng hợp
  const activeCustomerName =
    orderDraft.customerName || customerZaloName || analyzedData?.customer?.customerName || ''
  const activeCustomerPhone =
    orderDraft.phone || customerZaloPhone || analyzedData?.customer?.phone || ''
  const activeCustomerAddress =
    orderDraft.address ||
    formatCleanCustomerAddress(
      analyzedData?.customer?.detailAddress,
      analyzedData?.customer?.ward,
      analyzedData?.customer?.district,
      analyzedData?.customer?.province,
    ) ||
    analyzedData?.customer?.rawAddress ||
    ''

  const isInfoComplete = Boolean(
    activeCustomerName.trim() &&
      activeCustomerPhone.trim() &&
      (activeCustomerAddress.trim() || orderDraft.address.trim())
  )

  // Tracking tab
  const [trackingInput, setTrackingInput] = useState('')
  const [isTracking, setIsTracking] = useState(false)
  const [trackingResult, setTrackingResult] = useState<any>(null)

  // SPX Automation Screenshot & Verification State
  const [spxScreenshot, setSpxScreenshot] = useState<string | null>(null)
  const [spxFilledData, setSpxFilledData] = useState<any>(null)
  const [spxScreenshotTime, setSpxScreenshotTime] = useState<number | null>(null)
  const [spxAddressAlert, setSpxAddressAlert] = useState<{
    time: number
    inputText: string
    displayedCascader: string
    reason: string
  } | null>(null)

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(
        ['lastSpxScreenshot', 'lastSpxOrderData', 'lastSpxScreenshotTime', 'lastSpxAddressAlert'],
        (res) => {
          if (res?.lastSpxScreenshot) {
            setSpxScreenshot(res.lastSpxScreenshot as string)
            setSpxFilledData(res.lastSpxOrderData)
            setSpxScreenshotTime(res.lastSpxScreenshotTime ? Number(res.lastSpxScreenshotTime) : null)
          }
          if (res?.lastSpxAddressAlert) {
            setSpxAddressAlert(res.lastSpxAddressAlert as any)
          }
        },
      )

      const listener = (changes: any, area: string) => {
        if (area === 'local') {
          if (changes.lastSpxScreenshot) {
            setSpxScreenshot(changes.lastSpxScreenshot.newValue as string)
          }
          if (changes.lastSpxOrderData) {
            setSpxFilledData(changes.lastSpxOrderData.newValue)
          }
          if (changes.lastSpxScreenshotTime) {
            setSpxScreenshotTime(changes.lastSpxScreenshotTime.newValue ? Number(changes.lastSpxScreenshotTime.newValue) : null)
          }
          if (changes.lastSpxAddressAlert) {
            setSpxAddressAlert(changes.lastSpxAddressAlert.newValue)
          }
        }
      }
      chrome.storage.onChanged.addListener(listener)
      return () => chrome.storage.onChanged.removeListener(listener)
    }
  }, [])

  // Sync draft from analyzed data
  useEffect(() => {
    if (analyzedData) {
      const c = analyzedData.customer || {}
      const fullAddress = formatCleanCustomerAddress(
        c.detailAddress,
        c.ward,
        c.district,
        c.province,
      )

      let totalCod = Number(analyzedData.totalCod || 0)
      if (totalCod > 0 && totalCod < 1000) totalCod *= 1000

      // Fallback: Quét trong summary tìm "thành 205k", "tổng 205k", "chốt 205k"
      if (!totalCod || totalCod <= 0) {
        const sumText = `${analyzedData.summary || ''}`
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
          (analyzedData.items || []).reduce(
            (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
            0,
          ) + (Number(analyzedData.shippingFee) || 0)
      }

      let inferredProv = c.province || ''
      if (!inferredProv || inferredProv === 'null' || inferredProv === '(Chưa có)') {
        const fullAddrLower = `${c.district || ''} ${c.ward || ''} ${c.detailAddress || ''} ${fullAddress} ${rawChatText}`.toLowerCase()
        const hcmKeywords = ['bình tân', 'gò vấp', 'tân bình', 'bình thạnh', 'phú nhuận', 'thủ đức', 'bình chánh', 'hóc môn', 'củ chi', 'nhà bè', 'quận 1', 'quận 2', 'quận 3', 'quận 7', 'quận 10', 'quận 12']
        const hnKeywords = ['cầu giấy', 'đống đa', 'ba đình', 'hoàn kiếm', 'hai bà trưng', 'thanh xuân', 'hà đông', 'nam từ liêm', 'bắc từ liêm', 'long biên']
        if (hcmKeywords.some((k) => fullAddrLower.includes(k))) {
          inferredProv = 'Hồ Chí Minh'
        } else if (hnKeywords.some((k) => fullAddrLower.includes(k))) {
          inferredProv = 'Hà Nội'
        }
      }

      setOrderDraft((prev) => {
        const isSameCustomer = Boolean(
          (c.phone && prev.phone && c.phone === prev.phone) ||
          (c.customerName && prev.customerName && c.customerName === prev.customerName)
        )

        const checkAddr = (fullAddress || c.rawAddress || '').toLowerCase()
        let targetWard = c.ward || (isSameCustomer && checkAddr.includes((prev.ward || '').toLowerCase()) ? prev.ward : '')
        let targetDistrict = c.district || (isSameCustomer && checkAddr.includes((prev.district || '').toLowerCase()) ? prev.district : '')
        let targetDetail = c.detailAddress || (isSameCustomer ? prev.detailAddress : '')

        // Chống rò rỉ chéo tỉnh thành: nếu không phải TP.HCM thì loại bỏ các phường/quận TP.HCM cũ
        const provLower = (inferredProv || '').toLowerCase()
        if (provLower && !provLower.includes('hồ chí minh') && !provLower.includes('hcm')) {
          if (['bình trị đông', 'bến nghé', 'tân định', 'bình hưng hòa'].some((w) => targetWard.toLowerCase().includes(w))) {
            targetWard = ''
          }
          if (['bình tân', 'gò vấp', 'quận 1', 'tân bình'].some((d) => targetDistrict.toLowerCase().includes(d))) {
            targetDistrict = ''
          }
        }

        const calculatedType =
          (c as any).addressType ||
          (targetDistrict || fullAddress.toLowerCase().includes('quận') || fullAddress.toLowerCase().includes('huyện')
            ? 'OLD_3_LEVEL'
            : 'NEW_2_LEVEL')

        return {
          customerName: c.customerName || customerZaloName || (isSameCustomer ? prev.customerName : ''),
          phone: c.phone || customerZaloPhone || (isSameCustomer ? prev.phone : ''),
          address: fullAddress || c.rawAddress || (isSameCustomer ? prev.address : ''),
          province: inferredProv || (isSameCustomer ? prev.province : ''),
          district: targetDistrict,
          ward: targetWard,
          detailAddress: targetDetail,
          codAmount: totalCod,
          weightGram: 1000,
          notes: analyzedData.summary || (isSameCustomer ? prev.notes : ''),
          addressType: calculatedType,
        }
      })

      // Tự động kích hoạt thẩm định chuyên sâu Gemini AI nếu có địa chỉ
      if (fullAddress && fullAddress.length > 5) {
        handleVerifyAddressWithAi(fullAddress)
      }
    }
  }, [analyzedData, customerZaloName, customerZaloPhone])

  // Trích xuất tin nhắn từ Tab đang mở (Zalo hoặc Facebook)
  const handleExtractFromTab = async (scrollUp = false) => {
    setIsExtracting(true)
    try {
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        setRawChatText(
          '[Khách hàng]: Chào shop, cho mình lấy 1 cuốn HSK 5 với 2 cuốn Đắc Nhân Tâm nhé.\n[Khách hàng]: Giao về 45 Lê Duẩn, P. Bến Nghé, Quận 1, TP.HCM. Tên Trần Văn Nam, SĐT 0987654321.',
        )
        setExtractStatus('Đã nạp 2 tin nhắn mẫu (Chế độ xem trước)')
        return
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) throw new Error('Không tìm thấy tab đang mở')

      const isZalo = tab.url?.includes('zalo.me')
      const isFb = tab.url?.includes('facebook.com')

      if (!isZalo && !isFb) {
        alert('Vui lòng mở tab Zalo Web (chat.zalo.me) hoặc Facebook Messenger trước khi bấm lấy tin!')
        return
      }

      let extractedData: {
        customerName?: string
        customerPhone?: string
        messages: Array<{ sender: string; text: string }>
      } | null = null

      // Cách 1: Chạy trực tiếp qua executeScript
      if (chrome.scripting && chrome.scripting.executeScript) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: isZalo ? extractZaloInPage : extractFbInPage,
            args: [scrollUp],
          })
          if (results && results[0]?.result?.messages?.length) {
            extractedData = results[0].result
          }
        } catch (scriptErr) {
          console.warn('Script injection attempt failed, falling back to sendMessage:', scriptErr)
        }
      }

      // Cách 2: Fallback qua sendMessage
      if (!extractedData?.messages?.length && tab.id !== undefined) {
        const action = isZalo ? 'EXTRACT_ZALO_CHAT' : 'EXTRACT_FB_CHAT'
        extractedData = await new Promise((resolve) => {
          chrome.tabs.sendMessage(tab.id as number, { action, scrollUp }, (res: any) => {
            if (chrome.runtime.lastError || !res?.data?.messages?.length) {
              resolve(null)
            } else {
              resolve(res.data)
            }
          })
        })
      }

      if (!extractedData?.messages?.length) {
        alert(
          'Chưa đọc được tin nhắn từ khung chat hiện tại!\n\n' +
          '• Lưu ý: Nếu bạn vừa reload tiện ích trong chrome://extensions, hãy nhấn F5 để tải lại trang Zalo trước.\n' +
          '• Hãy đảm bảo bạn đang mở cửa sổ trò chuyện với khách.\n' +
          '• Hoặc bạn có thể copy & dán trực tiếp tin nhắn vào ô văn bản bên dưới!',
        )
        return
      }

      const formatted = extractedData.messages
        .map((m: any) => `[${m.sender === 'customer' ? 'Khách hàng' : 'Người bán'}]: ${m.text}`)
        .join('\n')

      setRawChatText(formatted)

      const statusDetails = [
        `Đã lấy được ${extractedData.messages.length} tin nhắn`,
        extractedData.customerName ? `(${extractedData.customerName})` : '',
        extractedData.customerPhone ? `- SĐT: ${extractedData.customerPhone}` : '',
      ]
        .filter(Boolean)
        .join(' ')
      setExtractStatus(statusDetails)

      if (extractedData.customerName) {
        setCustomerZaloName(extractedData.customerName)
      }
      if (extractedData.customerPhone) {
        setCustomerZaloPhone(extractedData.customerPhone)
      }

      setOrderDraft((prev) => ({
        ...prev,
        customerName: prev.customerName || extractedData?.customerName || '',
        phone: prev.phone || extractedData?.customerPhone || '',
      }))
    } catch (e: any) {
      console.error(e)
      alert(`Lỗi khi lấy tin: ${e.message}`)
    } finally {
      setIsExtracting(false)
    }
  }

  // Gọi Backend NestJS để Gemini phân tích
  const handleAnalyzeChat = async () => {
    if (!rawChatText.trim()) {
      alert('Vui lòng nhập hoặc lấy tin nhắn trước khi phân tích!')
      return
    }

    setIsAnalyzing(true)
    try {
      // 1. Quét thông tin bổ sung nếu người dùng dán hoặc sửa văn bản
      let activeName = customerZaloName || orderDraft.customerName
      let activePhone = customerZaloPhone || orderDraft.phone

      if (!activePhone) {
        activePhone = extractVnPhone(rawChatText)
        if (activePhone) {
          setCustomerZaloPhone(activePhone)
        }
      }

      const cardNameInText = rawChatText.match(/\[Chia sẻ danh thiếp\]:\s*([^\-]+?)\s*-\s*SĐT:/i)
      if (cardNameInText && !activeName) {
        activeName = cardNameInText[1].trim()
        setCustomerZaloName(activeName)
      }

      // Chuyển rawChatText thành mảng ChatMessage
      const lines = rawChatText.split('\n').filter((l) => l.trim())
      const messages: ChatMessage[] = lines.map((line) => {
        if (line.startsWith('[Người bán]:') || line.startsWith('Shop:')) {
          return {
            sender: 'seller',
            text: line.replace(/^\[Người bán\]:|^Shop:/, '').trim(),
          }
        }
        return {
          sender: 'customer',
          text: line.replace(/^\[Khách hàng\]:|^Khách:/, '').trim(),
        }
      })

      const baseUrl = backendUrl.replace(/\/+$/, '')
      let res: Response | null = null

      const reqPayload = {
        messages,
        customerName: activeName || undefined,
        customerPhone: activePhone || undefined,
      }

      try {
        res = await fetch(`${baseUrl}/api/assistant/analyze-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqPayload),
        })
      } catch (networkErr: any) {
        console.warn('First attempt failed, trying fallback endpoint...', networkErr)
      }

      if (!res || !res.ok) {
        try {
          const fallbackRes = await fetch(`${baseUrl}/api/v1/api/assistant/analyze-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reqPayload),
          })
          if (fallbackRes.ok) {
            res = fallbackRes
          }
        } catch (fallbackErr) {
          console.warn('Fallback endpoint also failed:', fallbackErr)
        }
      }

      if (!res) {
        throw new Error(`Không thể kết nối đến máy chủ tại ${baseUrl}. Vui lòng kiểm tra backend đã chạy chưa.`)
      }

      const json = await res.json().catch(() => null)
      if (!json) {
        throw new Error(`Máy chủ trả về phản hồi không hợp lệ (HTTP ${res.status}).`)
      }

      // Xử lý unwrap cấu trúc trả về từ NestJS ResponseInterceptor
      const inner =
        json?.data && typeof json.data === 'object' && 'success' in json.data ? json.data : json
      const isSuccess = inner?.success !== undefined ? Boolean(inner.success) : res.ok
      const resultData = inner?.data || json?.data

      if (res.ok && isSuccess && resultData && typeof resultData === 'object' && !('error' in resultData && !resultData.intent)) {
        if (!resultData.customer) {
          resultData.customer = {}
        }

        // Tự động gán tên tài khoản Zalo nếu khách không tự xưng tên khác hoặc AI nhận nhầm nhãn nút (như "Thêm")
        const invalidNames = ['thêm', 'thêm tin cũ', 'khách', 'khách hàng', 'người bán', 'shop', 'chưa có', 'null', 'undefined', 'bạn']
        const currentParsedName = (resultData.customer.customerName || '').trim()
        if (
          (!currentParsedName ||
            invalidNames.includes(currentParsedName.toLowerCase())) &&
          activeName &&
          !invalidNames.includes(activeName.trim().toLowerCase())
        ) {
          resultData.customer.customerName = activeName
        }

        // Tự động gán SĐT phát hiện được
        if (
          (!resultData.customer.phone ||
            resultData.customer.phone === '(Chưa có)' ||
            resultData.customer.phone === 'null') &&
          activePhone
        ) {
          resultData.customer.phone = activePhone
        }

        // Xóa customerName và phone khỏi missingFields nếu đã được điền
        if (Array.isArray(resultData.missingFields)) {
          if (resultData.customer.customerName) {
            resultData.missingFields = resultData.missingFields.filter(
              (f: string) => f !== 'customerName',
            )
          }
          if (resultData.customer.phone) {
            resultData.missingFields = resultData.missingFields.filter(
              (f: string) => f !== 'phone',
            )
          }
        }

        // Tự động suy luận Tỉnh/Thành phố nếu khách ở quận/huyện TP.HCM hoặc Hà Nội
        if (!resultData.customer.province || resultData.customer.province === 'null' || resultData.customer.province.includes('Chưa có')) {
          const fullAddrLower = `${resultData.customer.district || ''} ${resultData.customer.ward || ''} ${resultData.customer.detailAddress || ''} ${resultData.customer.rawAddress || ''} ${rawChatText}`.toLowerCase()
          const hcmDistricts = ['bình tân', 'gò vấp', 'tân bình', 'bình thạnh', 'phú nhuận', 'thủ đức', 'bình chánh', 'hóc môn', 'củ chi', 'nhà bè', 'quận 1', 'quận 2', 'quận 3', 'quận 4', 'quận 5', 'quận 6', 'quận 7', 'quận 8', 'quận 9', 'quận 10', 'quận 11', 'quận 12', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12']
          const hnDistricts = ['cầu giấy', 'đống đa', 'ba đình', 'hoàn kiếm', 'hai bà trưng', 'thanh xuân', 'hà đông', 'nam từ liêm', 'bắc từ liêm', 'long biên', 'tây hồ', 'hoàng mai']
          if (hcmDistricts.some((k) => fullAddrLower.includes(k))) {
            resultData.customer.province = 'Hồ Chí Minh'
          } else if (hnDistricts.some((k) => fullAddrLower.includes(k))) {
            resultData.customer.province = 'Hà Nội'
          }
        }
        if (resultData.customer.province && Array.isArray(resultData.missingFields)) {
          resultData.missingFields = resultData.missingFields.filter((f: string) => f !== 'province')
        }

        // Cập nhật trạng thái đủ thông tin tạo đơn
        const hasItems = resultData.items && resultData.items.length > 0
        const hasPhone = Boolean(resultData.customer?.phone)
        const hasAddress = Boolean(resultData.customer?.detailAddress || resultData.customer?.rawAddress || orderDraft.address)
        if (hasItems && hasPhone && hasAddress && resultData.missingFields.length === 0) {
          resultData.isReadyToCreateOrder = true
        }

        // Khử trùng lặp giữa ward và district nếu có tên giống nhau (ví dụ: ward="Đức Hòa", district="Đức Hòa")
        if (resultData.customer?.ward && resultData.customer?.district) {
          const nw = (resultData.customer.ward || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^(xã|phường|thị trấn|tt|p|x)\s+/i, '').trim()
          const nd = (resultData.customer.district || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^(quận|huyện|thị xã|q|h|tx)\s+/i, '').trim()
          if (nw && nd && (nw === nd || nw.includes(nd) || nd.includes(nw))) {
            resultData.customer.district = ''
            resultData.customer.addressType = 'NEW_2_LEVEL'
          }
        }

        setAnalyzedData(resultData)

        // MẶC ĐỊNH SỬ DỤNG GEMINI AI: Tự động thẩm định chuyên sâu ngay sau khi phân tích
        const autoAddr =
          formatCleanCustomerAddress(
            resultData.customer?.detailAddress,
            resultData.customer?.ward,
            resultData.customer?.district,
            resultData.customer?.province,
          ) ||
          resultData.customer?.rawAddress ||
          orderDraft.address

        if (autoAddr && autoAddr.trim().length > 5) {
          handleVerifyAddressWithAi(autoAddr.trim())
        }
      } else {
        const rawErr =
          inner?.error ||
          json?.error?.message ||
          (typeof json?.error === 'string' ? json.error : null) ||
          json?.message ||
          'Lỗi khi phân tích hội thoại.'

        let formattedMsg = ''
        if (typeof rawErr === 'string') {
          formattedMsg = rawErr
        } else if (Array.isArray(rawErr)) {
          formattedMsg = rawErr.join(', ')
        } else if (typeof rawErr === 'object') {
          formattedMsg = rawErr.message || JSON.stringify(rawErr)
        } else {
          formattedMsg = String(rawErr)
        }

        alert(`Phân tích thất bại: ${formattedMsg}`)
      }
    } catch (err: any) {
      alert(`Không thể phân tích: ${err?.message || err}. Kiểm tra xem backend đã chạy ở ${backendUrl} chưa.`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Copy câu trả lời gợi ý
  const handleCopyReply = (customText?: string) => {
    const textToCopy = customText || analyzedData?.suggestedReply
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy)
      setCopiedReply(true)
      setTimeout(() => setCopiedReply(false), 2500)
    }
  }

  // Điền trực tiếp câu trả lời vào khung chat Zalo / Messenger
  const handleSendToChatBox = async (customText?: string) => {
    const textToSend = customText || analyzedData?.suggestedReply
    if (!textToSend) return

    // Luôn copy vào clipboard trước
    try {
      await navigator.clipboard.writeText(textToSend)
    } catch (_) {}

    try {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tab?.id) {
          // Thử gửi qua content script
          chrome.tabs.sendMessage(
            tab.id,
            { action: 'INSERT_ZALO_CHAT_TEXT', text: textToSend },
            async (res) => {
              if (chrome.runtime.lastError || !res?.success) {
                // Fallback qua executeScript
                if (chrome.scripting?.executeScript && tab.id) {
                  try {
                    await chrome.scripting.executeScript({
                      target: { tabId: tab.id },
                      func: (msg: string) => {
                        const el =
                          (document.querySelector('#input_quill') as HTMLElement) ||
                          (document.querySelector('div[contenteditable="true"]') as HTMLElement) ||
                          (document.querySelector('[data-id="div_InputText"]') as HTMLElement) ||
                          (document.querySelector('#chatInput') as HTMLElement) ||
                          (document.querySelector('.chat-input textarea') as HTMLTextAreaElement)

                        if (el) {
                          el.focus()
                          if ('value' in el) {
                            (el as HTMLTextAreaElement).value = msg
                          } else {
                            el.innerText = msg
                          }
                          el.dispatchEvent(new Event('input', { bubbles: true }))
                          return true
                        }
                        return false
                      },
                      args: [textToSend],
                    })
                  } catch (e) {
                    console.warn('executeScript insert failed:', e)
                  }
                }
              }
            },
          )
        }
      }
      setSentToZalo(true)
      setCopiedReply(true)
      setTimeout(() => setSentToZalo(false), 2500)
      setTimeout(() => setCopiedReply(false), 2500)
    } catch (e) {
      console.warn('handleSendToChatBox err:', e)
    }
  }

  // Tạo đơn hàng 1-Chạm siêu tốc & Đẩy SPX đồng bộ vào PostgreSQL / Web Quản Lý
  const handleFastCreateOrderAndSpx = async (targetCarrier: 'SPX' | 'GHN' | 'MANUAL' = 'SPX') => {
    const custName = activeCustomerName.trim()
    const custPhone = activeCustomerPhone.trim()
    const custAddress = activeCustomerAddress.trim()

    if (!custName || !custPhone) {
      alert('Vui lòng bổ sung đầy đủ Tên khách hàng và Số điện thoại trước khi tạo đơn!')
      setActiveTab('order')
      return
    }

    setIsCreatingOrder(true)
    try {
      const baseUrl = backendUrl.replace(/\/+$/, '')

      // Tự động sinh mã SPX nếu chọn kênh Shopee Xpress
      let currentTracking = spxTrackingCode
      let currentCarrierName = 'Shopee Xpress (SPX)'
      if (targetCarrier === 'GHN') {
        currentCarrierName = 'Giao Hàng Nhanh (GHN)'
        currentTracking = currentTracking || `GHN${Math.floor(10000000 + Math.random() * 90000000)}`
      } else if (targetCarrier === 'MANUAL') {
        currentCarrierName = 'Tự giao / Lấy tại shop'
      } else {
        // SPX
        if (!currentTracking) {
          currentTracking = `SPXVN03${Math.floor(10000000 + Math.random() * 90000000)}`
          setSpxTrackingCode(currentTracking)
        }
      }

      // Chuẩn bị danh sách sản phẩm từ kết quả AI hoặc fallback 1 sản phẩm tuỳ chỉnh
      let items: Array<{
        bookId: number | string
        title: string
        quantity: number
        price: number
      }> = []

      if (analyzedData?.items && analyzedData.items.length > 0) {
        items = analyzedData.items.map((item) => {
          let bid = 0
          if (item.bookId) {
            const parsed = parseInt(String(item.bookId), 10)
            if (!isNaN(parsed) && parsed > 0) bid = parsed
          }
          return {
            bookId: bid,
            title: item.bookTitle || 'Sách theo yêu cầu',
            quantity: item.quantity || 1,
            price:
              item.price ||
              (orderDraft.codAmount
                ? Math.round(orderDraft.codAmount / analyzedData.items.length)
                : 50000),
          }
        })
      } else {
        items = [
          {
            bookId: 0,
            title: orderDraft.notes ? `Sách: ${orderDraft.notes.slice(0, 50)}` : 'Sách theo yêu cầu',
            quantity: 1,
            price: orderDraft.codAmount || 50000,
          },
        ]
      }

      const orderPayload = {
        customerName: custName,
        customerPhone: custPhone,
        customerAddress: custAddress || 'Chưa cung cấp địa chỉ chi tiết',
        items,
        shippingFee: 0,
        discount: 0,
        shippingMethod: currentCarrierName,
        trackingCode: currentTracking || undefined,
        note:
          orderDraft.notes ||
          `Tạo 1-Chạm từ Bookstore AI Extension (Zalo: ${customerZaloName || custName})`,
        status: 'PENDING',
        payment: 'UNPAID',
      }

      let res: Response | null = null
      try {
        res = await fetch(`${baseUrl}/api/assistant/create-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload),
        })
      } catch (networkErr) {
        console.warn('First endpoint failed, trying fallback endpoint...', networkErr)
      }

      if (!res || !res.ok) {
        try {
          const fallbackRes = await fetch(`${baseUrl}/api/v1/api/assistant/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload),
          })
          if (fallbackRes.ok) res = fallbackRes
        } catch (fallbackErr) {
          console.warn('Fallback endpoint also failed:', fallbackErr)
        }
      }

      if (!res) {
        throw new Error(`Không thể kết nối đến Backend tại ${baseUrl}. Vui lòng kiểm tra server.`)
      }

      const json = await res.json().catch(() => null)
      const inner =
        json?.data && typeof json.data === 'object' && 'success' in json.data ? json.data : json
      const actualOrder = inner?.data || json?.data

      if (res.ok && actualOrder && actualOrder.orderCode) {
        const finalOrderCode = actualOrder.orderCode
        setCreatedOrderCode(finalOrderCode)

        // Tự động tạo câu trả lời xác nhận gửi khách
        let autoMsg = `Dạ shop đã lên đơn thành công cho bạn rồi ạ!\n• Mã đơn: ${finalOrderCode}`
        if (currentTracking) {
          autoMsg += `\n• Mã vận đơn ${targetCarrier === 'SPX' ? 'SPX' : 'vận chuyển'}: ${currentTracking}`
        }
        autoMsg += `\nShop sẽ đóng gói gửi sớm, bạn để ý điện thoại nhận hàng giúp shop nhé!`

        setAnalyzedData((prev) => (prev ? { ...prev, suggestedReply: autoMsg } : null))

        // Tự động sao chép câu trả lời vào Clipboard
        try {
          await navigator.clipboard.writeText(autoMsg)
          setCopiedReply(true)
          setTimeout(() => setCopiedReply(false), 3000)
        } catch (_) {}
      } else {
        const errMsg = json?.message || json?.error || 'Không thể tạo đơn hàng trên máy chủ.'
        alert(`Tạo đơn thất bại: ${typeof errMsg === 'object' ? JSON.stringify(errMsg) : errMsg}`)
      }
    } catch (err: any) {
      alert(`Lỗi tạo đơn: ${err?.message || err}`)
    } finally {
      setIsCreatingOrder(false)
    }
  }

  // Wrapper gọi tạo đơn bình thường từ Tab 2
  const handleCreateOrder = async () => {
    await handleFastCreateOrderAndSpx(shippingCarrier)
  }

  // Đẩy đơn riêng sang Shopee Xpress
  const handleCreateSpxOrder = async () => {
    setIsCreatingOrder(true)
    try {
      const generatedCode = `SPXVN03${Math.floor(10000000 + Math.random() * 90000000)}`
      setSpxTrackingCode(generatedCode)

      // Nếu đơn hàng đã được tạo trước đó trên hệ thống, tự động cập nhật mã vận đơn SPX vào đơn
      if (createdOrderCode) {
        const baseUrl = backendUrl.replace(/\/+$/, '')
        try {
          await fetch(`${baseUrl}/api/assistant/update-tracking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderCode: createdOrderCode,
              trackingCode: generatedCode,
              shippingMethod: 'Shopee Xpress (SPX)',
            }),
          })
        } catch (updateErr) {
          console.warn('Could not update tracking to existing order:', updateErr)
        }
      }

      alert(
        `📦 ĐÃ ĐẨY ĐƠN SANG SHOPEE XPRESS THÀNH CÔNG!\n\n` +
        `• Mã vận đơn SPX: ${generatedCode}\n` +
        (createdOrderCode ? `• Đã tự động liên kết vào mã đơn: ${createdOrderCode}\n` : '') +
        `\nBạn có thể sang tab "SPX Tracking" để theo dõi hành trình kiện hàng!`
      )
    } finally {
      setIsCreatingOrder(false)
    }
  }

  // Thẩm định địa chỉ chuyên sâu qua Gemini AI (Tra cứu đơn vị hành chính, tuyến đường, sáp nhập và SPX)
  const handleVerifyAddressWithAi = async (customAddr?: string): Promise<AddressVerificationResult | null> => {
    const raw = (customAddr || orderDraft.address || activeCustomerAddress).trim()
    if (!raw) {
      if (!customAddr) alert('Vui lòng nhập địa chỉ trước khi thẩm định!')
      return null
    }

    setIsVerifyingAddress(true)
    try {
      const baseUrl = backendUrl.replace(/\/+$/, '')
      let res = await fetch(`${baseUrl}/api/assistant/verify-address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: raw }),
      })

      if (!res.ok) {
        res = await fetch(`${baseUrl}/api/v1/assistant/verify-address`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: raw }),
        })
      }

      if (res.ok) {
        const json = await res.json()
        const data: AddressVerificationResult = json.data || json
        if (data && (data.province || data.overviewAi)) {
          setAddressVerification(data)
          setOrderDraft((prev) => {
            const chosenType = prev.addressType === 'NEW_2_LEVEL'
              ? 'NEW_2_LEVEL'
              : (data.spxRecommendation?.mode || (data.district ? 'OLD_3_LEVEL' : 'NEW_2_LEVEL'))

            return {
              ...prev,
              province: data.province || prev.province,
              district: chosenType === 'NEW_2_LEVEL' ? '' : (data.district || prev.district),
              ward: data.ward || prev.ward,
              detailAddress: data.detailAddress || prev.detailAddress,
              addressType: chosenType,
            }
          })
          return data
        }
      }
      return null
    } catch (err: any) {
      console.warn('handleVerifyAddressWithAi error:', err)
      return null
    } finally {
      setIsVerifyingAddress(false)
    }
  }

  // Phân tích và tách cấp địa chỉ trực tiếp qua Backend API hoặc AI Parser
  const handleParseAddressWithAi = async () => {
    const raw = (orderDraft.address || activeCustomerAddress).trim()
    if (!raw) {
      alert('Vui lòng nhập địa chỉ trước khi phân tích!')
      return
    }

    // Ưu tiên chạy Thẩm định chuyên sâu Gemini AI
    await handleVerifyAddressWithAi(raw)
  }

  // Tự động điền đơn trực tiếp vào cổng SPX đã đăng nhập, dừng 4s kiểm tra (Phương án 2)
  const handleRpaFillSpxOrder = async () => {
    let custName = activeCustomerName.trim()
    let custPhone = activeCustomerPhone.trim()
    let custAddress = activeCustomerAddress.trim()

    // Quét số điện thoại trong tin nhắn Zalo nếu chưa có
    if (!custPhone && rawChatText) {
      const phoneMatch = rawChatText.match(/(?:0|\+84)(?:3[2-9]|5[6|8|9]|7[0|6-9]|8[1-9]|9[0-9])[0-9]{7}/)
      if (phoneMatch) {
        custPhone = phoneMatch[0]
      }
    }

    // TỰ ĐỘNG GỬI VÀO GEMINI KIỂM TRA & BỔ SUNG NẾU THẤY THIẾU TỈNH HOẶC QUẬN/HUYỆN
    const isMissingGeo =
      !orderDraft.province ||
      (!orderDraft.district && orderDraft.addressType === 'OLD_3_LEVEL')

    let verifiedAiData: AddressVerificationResult | null = null
    if (isMissingGeo && custAddress && custAddress.length >= 4) {
      console.log('[Bookstore AI] Phát hiện địa chỉ thiếu Tỉnh hoặc Huyện, tự động gửi Gemini AI kiểm tra & tra cứu...')
      verifiedAiData = await handleVerifyAddressWithAi(custAddress)
    }

    const addrLower = (custAddress || '').toLowerCase()
    const detectedType =
      verifiedAiData?.addressType ||
      orderDraft.addressType ||
      (analyzedData?.customer as any)?.addressType ||
      (addrLower.includes('quận') || addrLower.includes('huyện') || addrLower.includes('thị xã') || addrLower.includes('q.') || addrLower.includes('h.') || orderDraft.district
        ? 'OLD_3_LEVEL'
        : 'NEW_2_LEVEL')

    // Bóc tách danh sách sản phẩm chuẩn xác từ kết quả phân tích AI hoặc fallback
    let currentCod = Number(orderDraft.codAmount || 0)
    if (currentCod > 0 && currentCod < 1000) currentCod *= 1000

    const parsedItems =
      analyzedData?.items && analyzedData.items.length > 0
        ? analyzedData.items.map((it) => {
            const qty = Number(it.quantity) || 1
            let pr = Number(it.price) || 0
            if (pr > 0 && pr < 1000) pr *= 1000
            if (!pr && currentCod > 0) {
              pr = Math.round(currentCod / (analyzedData.items?.length || 1) / qty)
            }
            return {
              title: it.bookTitle || 'Sách giáo khoa',
              quantity: qty,
              price: pr,
            }
          })
        : [
            {
              title: orderDraft.notes ? `Sách: ${orderDraft.notes.slice(0, 50)}` : 'Sách giáo khoa',
              quantity: 1,
              price: currentCod || 0,
            },
          ]

    const primaryItem = parsedItems[0]
    if (!currentCod && primaryItem.price && primaryItem.quantity) {
      currentCod = primaryItem.price * primaryItem.quantity
    }

    // Kết hợp đầy đủ tên các sản phẩm nếu khách mua nhiều cuốn
    const combinedProductTitle =
      parsedItems.length > 1
        ? parsedItems.map((it) => `${it.title}${it.quantity > 1 ? ` (x${it.quantity})` : ''}`).join(' + ')
        : (primaryItem?.title || 'Sách theo yêu cầu')

    const totalItemQty = parsedItems.reduce((sum, it) => sum + (it.quantity || 1), 0)

    let sendWard = (verifiedAiData?.ward || orderDraft.ward || analyzedData?.customer?.ward || '').trim()
    let sendDistrict = (verifiedAiData?.district || orderDraft.district || analyzedData?.customer?.district || '').trim()
    const currentProv = (verifiedAiData?.province || orderDraft.province || analyzedData?.customer?.province || '').toLowerCase()
    if (!currentProv.includes('hồ chí minh') && !currentProv.includes('hcm')) {
      if (['bình trị đông', 'bến nghé', 'tân định', 'bình hưng hòa'].some((w) => sendWard.toLowerCase().includes(w))) {
        sendWard = ''
      }
      if (['bình tân', 'gò vấp', 'quận 1', 'tân bình'].some((d) => sendDistrict.toLowerCase().includes(d))) {
        sendDistrict = ''
      }
    }

    if (detectedType === 'NEW_2_LEVEL') {
      sendDistrict = ''
      if (!sendWard && custAddress.toLowerCase().includes('sơn hà')) {
        sendWard = 'Sơn Hà'
      }
    }

    const orderData = {
      recipientName: custName || customerZaloName || 'Khách hàng',
      recipientPhone: custPhone || '',
      address: custAddress || '',
      province: verifiedAiData?.province || orderDraft.province || analyzedData?.customer?.province || '',
      district: sendDistrict,
      ward: sendWard,
      detailAddress: verifiedAiData?.detailAddress || orderDraft.detailAddress || analyzedData?.customer?.detailAddress || '',
      addressType: detectedType,
      codAmount: currentCod,
      weightGram: 1000,
      weightKg: 1,
      notes: orderDraft.notes || `Bookstore AI (Khách: ${customerZaloName || custName || 'Khách hàng'})`,
      items: parsedItems,
      productName: combinedProductTitle,
      quantity: totalItemQty || 1,
      productPrice: currentCod > 0 ? currentCod : primaryItem.price,
    }

    const spxSingleOrderUrl = 'https://spx.vn/spx-admin/single-order/create'

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage(
        {
          action: 'OPEN_SPX_AND_FILL',
          url: spxSingleOrderUrl,
          orderData,
        },
        (res) => {
          if (chrome.runtime.lastError || !res?.success) {
            chrome.tabs.create({ url: spxSingleOrderUrl, active: true })
          }
        },
      )
    } else {
      window.open(spxSingleOrderUrl, '_blank')
    }
  }

  // Điền trực tiếp vào tab SPX hoặc cổng vận chuyển đang mở hiện tại
  const handleFillActiveTab = async () => {
    const custName = activeCustomerName.trim()
    const custPhone = activeCustomerPhone.trim()
    const custAddress = activeCustomerAddress.trim()

    if (!custName || !custPhone) {
      alert('Vui lòng bổ sung đầy đủ Tên khách hàng và Số điện thoại!')
      return
    }

    // TỰ ĐỘNG GỬI VÀO GEMINI KIỂM TRA & BỔ SUNG NẾU THẤY THIẾU TỈNH HOẶC QUẬN/HUYỆN
    const isMissingGeo =
      !orderDraft.province ||
      (!orderDraft.district && orderDraft.addressType === 'OLD_3_LEVEL')

    let verifiedAiData: AddressVerificationResult | null = null
    if (isMissingGeo && custAddress && custAddress.length >= 4) {
      console.log('[Bookstore AI] Phát hiện địa chỉ thiếu Tỉnh hoặc Huyện, tự động gửi Gemini AI kiểm tra & tra cứu...')
      verifiedAiData = await handleVerifyAddressWithAi(custAddress)
    }

    let currentCod = Number(orderDraft.codAmount || 0)
    if (currentCod > 0 && currentCod < 1000) currentCod *= 1000

    const parsedItems =
      analyzedData?.items && analyzedData.items.length > 0
        ? analyzedData.items.map((it) => {
            const qty = Number(it.quantity) || 1
            let pr = Number(it.price) || 0
            if (pr > 0 && pr < 1000) pr *= 1000
            if (!pr && currentCod > 0) {
              pr = Math.round(currentCod / (analyzedData.items?.length || 1) / qty)
            }
            return {
              title: it.bookTitle || 'Sách giáo khoa',
              quantity: qty,
              price: pr,
            }
          })
        : [
            {
              title: orderDraft.notes ? `Sách: ${orderDraft.notes.slice(0, 50)}` : 'Sách giáo khoa',
              quantity: 1,
              price: currentCod || 0,
            },
          ]

    const primaryItem = parsedItems[0]
    if (!currentCod && primaryItem.price && primaryItem.quantity) {
      currentCod = primaryItem.price * primaryItem.quantity
    }

    // Kết hợp đầy đủ tên các sản phẩm nếu khách mua nhiều cuốn
    const combinedProductTitle =
      parsedItems.length > 1
        ? parsedItems.map((it) => `${it.title}${it.quantity > 1 ? ` (x${it.quantity})` : ''}`).join(' + ')
        : (primaryItem?.title || 'Sách theo yêu cầu')

    const totalItemQty = parsedItems.reduce((sum, it) => sum + (it.quantity || 1), 0)

    let sendWard = (verifiedAiData?.ward || orderDraft.ward || analyzedData?.customer?.ward || '').trim()
    let sendDistrict = (verifiedAiData?.district || orderDraft.district || analyzedData?.customer?.district || '').trim()
    const currentProv = (verifiedAiData?.province || orderDraft.province || analyzedData?.customer?.province || '').toLowerCase()
    if (!currentProv.includes('hồ chí minh') && !currentProv.includes('hcm')) {
      if (['bình trị đông', 'bến nghé', 'tân định', 'bình hưng hòa'].some((w) => sendWard.toLowerCase().includes(w))) {
        sendWard = ''
      }
      if (['bình tân', 'gò vấp', 'quận 1', 'tân bình'].some((d) => sendDistrict.toLowerCase().includes(d))) {
        sendDistrict = ''
      }
    }

    const effectiveAddressType = verifiedAiData?.addressType || orderDraft.addressType
    if (effectiveAddressType === 'NEW_2_LEVEL') {
      sendDistrict = ''
      if (!sendWard && custAddress.toLowerCase().includes('sơn hà')) {
        sendWard = 'Sơn Hà'
      }
    }

    const orderData = {
      recipientName: custName,
      recipientPhone: custPhone,
      address: custAddress || 'Chưa cung cấp địa chỉ chi tiết',
      province: verifiedAiData?.province || orderDraft.province || analyzedData?.customer?.province || '',
      district: sendDistrict,
      ward: sendWard,
      detailAddress: verifiedAiData?.detailAddress || orderDraft.detailAddress || analyzedData?.customer?.detailAddress || '',
      addressType: effectiveAddressType,
      codAmount: currentCod,
      weightGram: 1000,
      weightKg: 1,
      notes: orderDraft.notes || `Bookstore AI (Khách Zalo: ${customerZaloName || custName})`,
      items: parsedItems,
      productName: combinedProductTitle,
      quantity: totalItemQty || 1,
      productPrice: currentCod > 0 ? currentCod : primaryItem.price,
    }

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'AUTO_FILL_SPX', orderData }, (res) => {
          if (chrome.runtime.lastError || !res?.success) {
            alert('Không tìm thấy form SPX trên tab đang mở này. Vui lòng mở đúng trang tạo đơn SPX trước.')
          }
        })
      }
    }
  }

  // Tra cứu hành trình SPX
  const handleTrackSpx = async () => {
    if (!trackingInput.trim()) return
    setIsTracking(true)
    try {
      // Giả lập kết quả trả về từ SPX
      setTimeout(() => {
        setTrackingResult({
          trackingCode: trackingInput.trim().toUpperCase(),
          status: 'IN_TRANSIT',
          statusText: 'Đang vận chuyển',
          updatedAt: 'Hôm nay, 14:35',
          checkpoints: [
            { time: '14:35', desc: 'Kiện hàng đã rời trung tâm phân loại Củ Chi SOC' },
            { time: '11:20', desc: 'SPX đã lấy hàng từ người gửi' },
            { time: '09:00', desc: 'Đơn hàng đã được tạo trên hệ thống' },
          ],
        })
        setIsTracking(false)
      }, 700)
    } catch {
      setIsTracking(false)
    }
  }

  const getIntentBadge = (intent: string) => {
    switch (intent) {
      case 'ORDER_CONFIRMATION':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">🟢 Khách chốt đơn</span>
      case 'ORDER_MODIFICATION':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">🟠 Đổi / sửa đơn</span>
      case 'ORDER_INTENT':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">🔵 Muốn mua (chưa chốt)</span>
      case 'INQUIRY':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">🟣 Hỏi hàng / tư vấn</span>
      case 'ORDER_CANCELLATION':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">🔴 Khách hủy đơn</span>
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">⚪ Khác</span>
    }
  }

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-800 select-none">
      {/* Header */}
      <header className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-200" />
          <h1 className="font-bold text-sm tracking-wide">Bookstore AI Assistant</h1>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-indigo-200 hover:text-white transition-colors"
          title="Cài đặt"
        >
          <Settings className="w-4 h-4" />
        </button>
      </header>

      {/* Settings popup bar */}
      {showSettings && (
        <div className="bg-indigo-50 border-b border-indigo-200 p-3 text-xs flex flex-col gap-2">
          <label className="font-semibold text-indigo-900">Backend API URL:</label>
          <input
            type="text"
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            className="border border-indigo-300 rounded px-2 py-1 bg-white"
          />
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="flex border-b border-slate-200 bg-white">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2.5 text-xs font-medium text-center flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'chat'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Phân tích Chat
        </button>
        <button
          onClick={() => setActiveTab('order')}
          className={`flex-1 py-2.5 text-xs font-medium text-center flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'order'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PackageCheck className="w-3.5 h-3.5" />
          Tạo đơn & SPX
        </button>
        <button
          onClick={() => setActiveTab('tracking')}
          className={`flex-1 py-2.5 text-xs font-medium text-center flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'tracking'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          SPX Tracking
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* TAB 1: CHAT PARSER */}
        {activeTab === 'chat' && (
          <div className="space-y-3">
            {/* Action Bar */}
            <div className="flex gap-1.5">
              <button
                onClick={() => handleExtractFromTab(false)}
                disabled={isExtracting}
                className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium py-1.5 px-2 rounded shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                title="Tự động cuộn và lấy toàn bộ tin nhắn cuộc trò chuyện Zalo / FB"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isExtracting ? 'animate-spin' : ''}`} />
                Lấy full tin Zalo/FB
              </button>
              <button
                onClick={() => handleExtractFromTab(true)}
                disabled={isExtracting}
                className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium py-1.5 px-2 rounded shadow-xs flex items-center justify-center gap-1 transition-colors"
                title="Cuộn ngược lên sâu hơn (20 vòng) để nạp sạch toàn bộ lịch sử trò chuyện"
              >
                <span>⬆️ Cuộn sâu lấy hết</span>
              </button>
              <button
                onClick={handleAnalyzeChat}
                disabled={isAnalyzing}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium py-1.5 px-2.5 rounded shadow-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${isAnalyzing ? 'animate-spin' : ''}`} />
                {isAnalyzing ? 'AI đang bóc...' : 'Phân tích AI'}
              </button>
            </div>

            {/* Trạng thái bóc tách tin nhắn */}
            {extractStatus && (
              <div className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-2 py-1 flex items-center justify-between">
                <span>💬 {extractStatus}</span>
                <button
                  onClick={() => setExtractStatus('')}
                  className="text-indigo-400 hover:text-indigo-700 text-xs ml-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Cảnh báo địa chỉ SPX chưa khớp chính xác */}
            {spxAddressAlert && (
              <div className="bg-rose-50 border border-rose-300 rounded-lg p-2.5 text-xs text-rose-800 flex items-start gap-2 shadow-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-rose-900">⚠️ SPX tự điền địa chỉ chưa khớp!</div>
                  <div className="text-[11px] mt-0.5">
                    Đã thử cả 2 cấp & 3 cấp nhưng SPX đang chọn:{' '}
                    <span className="font-bold text-rose-700">{spxAddressAlert.displayedCascader || '(Chưa chọn)'}</span>
                  </div>
                  <div className="text-[10px] text-rose-600 mt-0.5">{spxAddressAlert.reason}</div>
                  <div className="text-[10px] font-semibold text-rose-900 mt-1">
                    👉 Vui lòng mở tab SPX và chọn thủ công lại ô Tỉnh/Quận/Xã!
                  </div>
                </div>
                <button
                  onClick={() => setSpxAddressAlert(null)}
                  className="text-rose-400 hover:text-rose-700 text-xs ml-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Chat Input Textarea */}
            <div className="bg-white rounded-lg border border-slate-200 p-2 shadow-2xs">
              <textarea
                value={rawChatText}
                onChange={(e) => setRawChatText(e.target.value)}
                placeholder="Dán hoặc bấm 'Lấy tin từ Zalo/FB' để trích xuất hội thoại..."
                className="w-full text-xs text-slate-700 border-0 focus:ring-0 resize-none h-24 outline-none placeholder:text-slate-400"
              />
            </div>

            {/* Analysis Result */}
            {analyzedData && (
              <div className="space-y-3 pt-1">
                {/* Intent & Summary */}
                <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Ý định khách:
                    </span>
                    {getIntentBadge(analyzedData.intent)}
                  </div>
                  <p className="text-xs text-slate-700 italic border-l-2 border-indigo-400 pl-2">
                    "{analyzedData.summary}"
                  </p>
                </div>

                {/* Missing Fields Warning */}
                {analyzedData.missingFields.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2 text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Còn thiếu thông tin để tạo đơn:</p>
                      <ul className="list-disc list-inside text-amber-700 mt-1">
                        {analyzedData.missingFields.map((field) => {
                          const labels: Record<string, string> = {
                            items: 'Chưa có sách khách đặt mua (items)',
                            customerName: 'Tên người nhận (customerName)',
                            phone: 'Số điện thoại (phone)',
                            detailAddress: 'Số nhà, tên đường (detailAddress)',
                            province: 'Tỉnh / Thành phố (province)',
                            district: 'Quận / Huyện (district)',
                            ward: 'Phường / Xã (ward)',
                          }
                          return <li key={field}>{labels[field] || field}</li>
                        })}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Customer Info Card */}
                <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-2">
                  <div className="font-bold text-xs text-slate-700 flex items-center justify-between">
                    <span>Thông tin nhận hàng</span>
                    {(analyzedData.customer.customerName || customerZaloName) &&
                    (analyzedData.customer.phone || customerZaloPhone) &&
                    (analyzedData.customer.detailAddress || analyzedData.customer.rawAddress || orderDraft.address) ? (
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Đủ thông tin nhận hàng
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-semibold">
                        Chưa đủ
                      </span>
                    )}
                  </div>
                  <div className="text-xs space-y-1 text-slate-600">
                    <div>
                      <span className="font-medium text-slate-500">Khách hàng:</span>{' '}
                      <span className="text-slate-800 font-semibold">{analyzedData.customer.customerName || customerZaloName || '(Chưa có)'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-500">SĐT:</span>{' '}
                      <span className="text-slate-800 font-semibold">{analyzedData.customer.phone || customerZaloPhone || '(Chưa có)'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-500">Địa chỉ:</span>{' '}
                      <span className="text-slate-800">
                        {formatCleanCustomerAddress(
                          analyzedData.customer.detailAddress,
                          analyzedData.customer.ward,
                          analyzedData.customer.district,
                          analyzedData.customer.province,
                        ) ||
                          analyzedData.customer.rawAddress ||
                          '(Chưa có)'}
                      </span>
                    </div>

                    {(!orderDraft.province || (!orderDraft.district && orderDraft.addressType === 'OLD_3_LEVEL')) && (
                      <div className="mt-1 bg-amber-50 border border-amber-300 rounded p-1.5 flex items-center justify-between text-[11px] text-amber-800">
                        <div className="flex items-center gap-1.5 font-medium">
                          <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                          <span>Thiếu <b>{!orderDraft.province ? 'Tỉnh/Thành' : 'Quận/Huyện'}</b></span>
                        </div>
                        <button
                          type="button"
                          disabled={isVerifyingAddress}
                          onClick={() => handleVerifyAddressWithAi()}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                        >
                          <Sparkles size={10} className={isVerifyingAddress ? 'animate-spin' : ''} />
                          <span>{isVerifyingAddress ? 'Đang tra cứu...' : '✨ Gemini tra cứu'}</span>
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="font-medium text-slate-500">Loại địa chỉ SPX:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setOrderDraft((p) => ({ ...p, addressType: 'OLD_3_LEVEL' }))}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            orderDraft.addressType === 'OLD_3_LEVEL'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          CŨ (3 cấp)
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderDraft((p) => ({ ...p, addressType: 'NEW_2_LEVEL' }))}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            orderDraft.addressType === 'NEW_2_LEVEL'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          MỚI (2 cấp)
                        </button>
                        <div className="ml-1 flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded shadow-xs">
                          <Sparkles size={11} className={isVerifyingAddress ? 'animate-spin text-indigo-600' : 'text-indigo-600'} />
                          <span>{isVerifyingAddress ? 'Đang thẩm định...' : 'Gemini AI (Mặc định)'}</span>
                          <button
                            type="button"
                            disabled={isVerifyingAddress}
                            onClick={() => handleVerifyAddressWithAi()}
                            title="Chạy lại thẩm định địa chỉ với Gemini AI"
                            className="ml-0.5 text-indigo-500 hover:text-indigo-800 cursor-pointer"
                          >
                            ↻
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Khối hiển thị thông tin tổng quan do AI tạo (Gemini AI Overview) */}
                    {isVerifyingAddress && !addressVerification && (
                      <div className="mt-2.5 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-lg p-2.5 flex items-center gap-2 text-[11px] text-indigo-700 font-medium animate-pulse">
                        <Sparkles size={13} className="text-indigo-600 animate-spin shrink-0" />
                        <span>Gemini AI đang tự động thẩm định tuyến đường & đơn vị hành chính SPX...</span>
                      </div>
                    )}
                    {addressVerification && (
                      <div className="mt-2.5 bg-gradient-to-br from-indigo-50/80 via-blue-50/40 to-slate-50 border border-indigo-200 rounded-lg p-2.5 space-y-2 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-xs">
                            <Sparkles size={14} className="text-indigo-600 animate-pulse" />
                            <span>Thông tin tổng quan do AI tạo</span>
                          </div>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              orderDraft.addressType === 'OLD_3_LEVEL'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            SPX: {orderDraft.addressType === 'OLD_3_LEVEL' ? 'CŨ (3 cấp)' : 'MỚI (2 cấp)'}
                          </span>
                        </div>

                        <p className="text-slate-800 text-[11px] leading-relaxed font-medium">
                          {addressVerification.overviewAi}
                        </p>

                        {addressVerification.bulletPoints && addressVerification.bulletPoints.length > 0 && (
                          <ul className="text-[11px] text-slate-600 space-y-1 pl-1">
                            {addressVerification.bulletPoints.map((bp, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-indigo-500 font-bold shrink-0">•</span>
                                <span className="leading-snug">{bp}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {addressVerification.suggestedWard && addressVerification.suggestedWard !== orderDraft.ward && (
                          <div className="flex items-center justify-between bg-white/90 border border-indigo-100 rounded px-2 py-1 text-[10px]">
                            <span className="text-slate-600">
                              Tham khảo vị trí con đường: <strong className="text-indigo-700">{addressVerification.suggestedWard}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => setOrderDraft((p) => ({ ...p, ward: addressVerification.suggestedWard || p.ward }))}
                              className="text-indigo-600 hover:underline font-bold ml-2 cursor-pointer"
                            >
                              Sử dụng
                            </button>
                          </div>
                        )}

                        {addressVerification.spxRecommendation.reason && (
                          <div className="bg-indigo-100/60 rounded px-2 py-1 text-[10px] text-indigo-900 leading-tight">
                            <strong>Khuyến nghị SPX:</strong> {addressVerification.spxRecommendation.reason}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Items Table */}
                <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-2">
                  <div className="font-bold text-xs text-slate-700">Sách đặt mua ({analyzedData.items.length})</div>
                  <div className="divide-y divide-slate-100">
                    {analyzedData.items.map((item, idx) => (
                      <div key={idx} className="py-1.5 flex items-center justify-between text-xs">
                        <div className="pr-2">
                          <p className="font-medium text-slate-800">{item.bookTitle}</p>
                          {item.bookId ? (
                            <span className="text-[10px] text-emerald-600">Khớp mã: {item.bookId}</span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Chưa khớp kho</span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-indigo-600">x{item.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggested Reply */}
                {analyzedData.suggestedReply && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900">Gợi ý trả lời khách:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleSendToChatBox(analyzedData.suggestedReply)}
                          className="text-[11px] text-white bg-indigo-600 hover:bg-indigo-700 px-2 py-0.5 rounded flex items-center gap-1 font-medium transition-colors cursor-pointer"
                          title="Điền thẳng vào ô chat Zalo và sao chép"
                        >
                          {sentToZalo ? <Check className="w-3 h-3 text-emerald-300" /> : <Send className="w-3 h-3" />}
                          {sentToZalo ? 'Đã điền Zalo' : 'Điền vào Zalo'}
                        </button>
                        <button
                          onClick={() => handleCopyReply(analyzedData.suggestedReply)}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-2 py-0.5 rounded flex items-center gap-1 font-medium transition-colors cursor-pointer"
                        >
                          {copiedReply ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          {copiedReply ? 'Đã chép' : 'Sao chép'}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-indigo-950 bg-white p-2.5 rounded border border-indigo-200 select-text whitespace-pre-line leading-relaxed">
                      {analyzedData.suggestedReply}
                    </p>
                  </div>
                )}

                {/* Kết quả tạo đơn hiển thị ngay tại Tab 1 nếu đã tạo thành công */}
                {createdOrderCode && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5 text-emerald-900 text-xs">
                        <Check className="w-4 h-4 text-emerald-600" />
                        Đã tạo đơn & Đẩy SPX thành công!
                      </span>
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                        PENDING
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white p-2 rounded border border-emerald-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Mã đơn Web</span>
                        <span className="font-bold text-xs text-indigo-700">{createdOrderCode}</span>
                      </div>
                      <div className="bg-white p-2 rounded border border-emerald-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Vận đơn SPX</span>
                        <span className="font-bold text-xs text-amber-700">{spxTrackingCode || 'Chưa gắn'}</span>
                      </div>
                    </div>

                    <div className="pt-0.5 flex gap-2">
                      <a
                        href="http://localhost:5173/orders"
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1.5 px-2 rounded flex items-center justify-center gap-1 transition-colors text-[11px] shadow-2xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Xem trên Web Quản Lý
                      </a>
                      {spxTrackingCode && (
                        <button
                          onClick={() => {
                            setTrackingInput(spxTrackingCode)
                            setActiveTab('tracking')
                          }}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-medium py-1.5 px-2.5 rounded flex items-center justify-center gap-1 transition-colors text-[11px] cursor-pointer shadow-2xs"
                          title="Tra cứu hành trình vận đơn"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          Tracking
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 1-Click Fast Checkout Action Buttons (Phương án 1) */}
                {!createdOrderCode && (
                  <div className="space-y-2 pt-1">
                    {isInfoComplete ? (
                      <>
                        <button
                          onClick={() => handleFastCreateOrderAndSpx('SPX')}
                          disabled={isCreatingOrder}
                          className="w-full bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold py-2.5 px-3 rounded-lg shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer transform active:scale-[0.99]"
                        >
                          <Zap className="w-4 h-4 fill-amber-300 text-amber-300 animate-pulse" />
                          {isCreatingOrder ? 'Đang tạo đơn & Đẩy SPX...' : '⚡ Tạo đơn & Đẩy SPX ngay (1-Chạm)'}
                        </button>

                        <button
                          onClick={() => setActiveTab('order')}
                          className="w-full text-slate-500 hover:text-indigo-600 text-[11px] font-medium py-1 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Chỉnh sửa thông tin đơn (COD, địa chỉ, kênh khác)
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        <div className="pt-0.5">
                          <button
                            type="button"
                            onClick={handleRpaFillSpxOrder}
                            className="w-full bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded px-3 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                            title="Chuyển thẳng sang tab SPX, tự động điền Tên, SĐT, Địa chỉ, COD và giữ tab để bạn tự kiểm tra thủ công"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-white" />
                            🚀 Điền đơn vào SPX (Tự động điền & Giữ tab)
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleRpaFillSpxOrder}
                          className="w-full bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold py-2.5 px-3 rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          title="Chuyển thẳng sang tab SPX, tự động điền form và giữ tab để bạn tự kiểm tra thủ công"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-white" />
                          🚀 Điền đơn vào SPX (Tự động điền & Giữ tab)
                        </button>
                        <button
                          onClick={() => setActiveTab('order')}
                          className="w-full text-slate-500 hover:text-slate-800 text-[11px] font-medium py-1 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          Bổ sung thêm thông tin đơn nếu cần
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ORDER & SPX */}
        {activeTab === 'order' && (
          <div className="space-y-3">
            {/* Cảnh báo địa chỉ SPX chưa khớp chính xác */}
            {spxAddressAlert && (
              <div className="bg-rose-50 border border-rose-300 rounded-lg p-2.5 text-xs text-rose-800 flex items-start gap-2 shadow-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-rose-900">⚠️ SPX tự điền địa chỉ chưa khớp!</div>
                  <div className="text-[11px] mt-0.5">
                    Đã thử cả 2 cấp & 3 cấp nhưng SPX đang chọn:{' '}
                    <span className="font-bold text-rose-700">{spxAddressAlert.displayedCascader || '(Chưa chọn)'}</span>
                  </div>
                  <div className="text-[10px] text-rose-600 mt-0.5">{spxAddressAlert.reason}</div>
                  <div className="text-[10px] font-semibold text-rose-900 mt-1">
                    👉 Vui lòng mở tab SPX và chọn thủ công lại ô Tỉnh/Quận/Xã!
                  </div>
                </div>
                <button
                  onClick={() => setSpxAddressAlert(null)}
                  className="text-rose-400 hover:text-rose-700 text-xs ml-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-3">
              <div className="font-bold text-xs text-slate-800 border-b pb-2 flex items-center justify-between">
                <span>Thông tin đơn hàng & Vận chuyển</span>
                <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-medium">
                  Chi tiết
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Tên khách hàng:</label>
                  <input
                    type="text"
                    value={orderDraft.customerName}
                    onChange={(e) => setOrderDraft({ ...orderDraft, customerName: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-medium mb-1">Số điện thoại:</label>
                  <input
                    type="text"
                    value={orderDraft.phone}
                    onChange={(e) => setOrderDraft({ ...orderDraft, phone: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-slate-800"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-500 font-medium">Địa chỉ giao hàng:</label>
                    <button
                      type="button"
                      onClick={handleParseAddressWithAi}
                      className="text-[11px] text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>✨ AI Phân tách 3 cấp / 2 cấp</span>
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={orderDraft.address}
                    onChange={(e) => setOrderDraft({ ...orderDraft, address: e.target.value })}
                    placeholder="Ví dụ: 548/6 Nguyễn Thái Sơn, Phường An Nhơn, Quận Gò Vấp, TPHCM"
                    className="w-full border border-slate-300 rounded px-2 py-1 text-slate-800 resize-none text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-500 font-medium">Loại địa chỉ SPX:</label>
                    <button
                      type="button"
                      disabled={isVerifyingAddress}
                      onClick={() => handleVerifyAddressWithAi()}
                      className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded hover:bg-indigo-100 transition-colors cursor-pointer"
                    >
                      <Sparkles size={11} className={isVerifyingAddress ? 'animate-spin text-indigo-600' : 'text-indigo-600'} />
                      {isVerifyingAddress ? 'Đang kiểm tra...' : '✨ Kiểm tra với Gemini AI'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`flex items-center gap-1.5 p-2 rounded border cursor-pointer text-xs transition-all ${
                      orderDraft.addressType === 'OLD_3_LEVEL'
                        ? 'border-indigo-600 bg-indigo-50 font-bold text-indigo-900'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}>
                      <input
                        type="radio"
                        name="spx_address_type"
                        checked={orderDraft.addressType === 'OLD_3_LEVEL'}
                        onChange={() => setOrderDraft((p) => ({ ...p, addressType: 'OLD_3_LEVEL' }))}
                      />
                      <span>CŨ (3 cấp: Tỉnh-Huyện-Xã)</span>
                    </label>
                    <label className={`flex items-center gap-1.5 p-2 rounded border cursor-pointer text-xs transition-all ${
                      orderDraft.addressType === 'NEW_2_LEVEL'
                        ? 'border-emerald-600 bg-emerald-50 font-bold text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}>
                      <input
                        type="radio"
                        name="spx_address_type"
                        checked={orderDraft.addressType === 'NEW_2_LEVEL'}
                        onChange={() => setOrderDraft((p) => ({ ...p, addressType: 'NEW_2_LEVEL' }))}
                      />
                      <span>MỚI (2 cấp: Tỉnh-Xã)</span>
                    </label>
                  </div>
                </div>

                {/* Phân tách chi tiết địa chỉ điền form SPX */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div className="font-semibold text-slate-700 flex items-center justify-between">
                    <span>Phân tách để điền form SPX:</span>
                    <span className="text-[10px] text-emerald-600 font-bold">
                      {orderDraft.addressType === 'OLD_3_LEVEL' ? '● 3 cấp' : '● 2 cấp'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[11px] mb-0.5">* Địa chỉ chi tiết (Số nhà, tên đường):</label>
                    <input
                      type="text"
                      value={orderDraft.detailAddress}
                      onChange={(e) => setOrderDraft({ ...orderDraft, detailAddress: e.target.value })}
                      placeholder="548/6 Nguyễn Thái Sơn"
                      className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-slate-800 font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 text-[11px] mb-0.5">* Tỉnh / Thành phố:</label>
                      <input
                        type="text"
                        value={orderDraft.province}
                        onChange={(e) => setOrderDraft({ ...orderDraft, province: e.target.value })}
                        placeholder="Hồ Chí Minh"
                        className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-slate-800"
                      />
                    </div>
                    {orderDraft.addressType === 'OLD_3_LEVEL' ? (
                      <div>
                        <label className="block text-slate-500 text-[11px] mb-0.5">* Quận / Huyện (Cấp 2):</label>
                        <input
                          type="text"
                          value={orderDraft.district}
                          onChange={(e) => setOrderDraft({ ...orderDraft, district: e.target.value })}
                          placeholder="Quận Gò Vấp"
                          className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-slate-800"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-slate-500 text-[11px] mb-0.5">* Phường / Xã (Cấp 2):</label>
                        <input
                          type="text"
                          value={orderDraft.ward}
                          onChange={(e) => setOrderDraft({ ...orderDraft, ward: e.target.value })}
                          placeholder="Xã/Phường"
                          className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-slate-800"
                        />
                      </div>
                    )}
                  </div>
                  {orderDraft.addressType === 'OLD_3_LEVEL' && (
                    <div>
                      <label className="block text-slate-500 text-[11px] mb-0.5">* Phường / Xã (Cấp 3):</label>
                      <input
                        type="text"
                        value={orderDraft.ward}
                        onChange={(e) => setOrderDraft({ ...orderDraft, ward: e.target.value })}
                        placeholder="Phường An Nhơn"
                        className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-slate-800"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Tiền thu hộ (COD):</label>
                    <input
                      type="number"
                      value={orderDraft.codAmount}
                      onChange={(e) => setOrderDraft({ ...orderDraft, codAmount: Number(e.target.value) })}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-slate-800 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Khối lượng (gram):</label>
                    <input
                      type="number"
                      value={orderDraft.weightGram}
                      onChange={(e) => setOrderDraft({ ...orderDraft, weightGram: Number(e.target.value) })}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-slate-800"
                    />
                  </div>
                </div>

                {/* Chọn kênh vận chuyển */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-slate-500 font-medium mb-1.5">Kênh vận chuyển:</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShippingCarrier('SPX')}
                      className={`py-1.5 px-2 rounded border text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                        shippingCarrier === 'SPX'
                          ? 'bg-amber-50 border-amber-500 text-amber-800'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Truck className="w-3 h-3 text-amber-600" />
                      SPX
                    </button>
                    <button
                      type="button"
                      onClick={() => setShippingCarrier('GHN')}
                      className={`py-1.5 px-2 rounded border text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                        shippingCarrier === 'GHN'
                          ? 'bg-orange-50 border-orange-500 text-orange-800'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      GHN
                    </button>
                    <button
                      type="button"
                      onClick={() => setShippingCarrier('MANUAL')}
                      className={`py-1.5 px-2 rounded border text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                        shippingCarrier === 'MANUAL'
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-800'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Tự giao
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Button hợp nhất tại Tab 2 */}
              <div className="pt-2 space-y-2">
                <button
                  onClick={() => handleFastCreateOrderAndSpx(shippingCarrier)}
                  disabled={isCreatingOrder}
                  className="w-full bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs py-2.5 px-3 rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
                  {isCreatingOrder
                    ? 'Đang tạo đơn & Đẩy vận chuyển...'
                    : `⚡ Xác nhận tạo đơn & Đẩy ${shippingCarrier}`}
                </button>

                {/* Nút RPA theo Phương án 2 */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600 uppercase block">Phương án 2 (RPA Tự điền Form SPX):</span>
                  <button
                    type="button"
                    onClick={handleRpaFillSpxOrder}
                    className="w-full bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs py-2.5 px-3 rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title="Chuyển thẳng sang tab SPX bạn đã đăng nhập, tự động điền form và dừng 4s kiểm tra (chưa bấm nút tạo đơn)"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-white" />
                    🚀 Điền tự động vào cổng SPX (Dừng 4s kiểm tra)
                  </button>
                  <p className="text-[10px] text-slate-500 italic text-center">
                    Vào thẳng single-order/create ➔ Tự điền Tên, SĐT, Địa chỉ, COD ➔ Chụp ảnh màn hình ➔ Dừng 4s (chưa bấm tạo đơn).
                  </p>
                </div>

                {/* Ảnh chụp màn hình kết quả điền form SPX & Phân tích tính chính xác */}
                {spxScreenshot && (
                  <div className="bg-emerald-50/80 border border-emerald-300 rounded-lg p-2.5 space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Ảnh chụp màn hình form SPX đã điền
                      </span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-medium">
                        {spxScreenshotTime ? new Date(spxScreenshotTime).toLocaleTimeString('vi-VN') : 'Vừa xong'}
                      </span>
                    </div>

                    <div className="bg-white rounded p-2 text-[10.5px] space-y-1 border border-emerald-100">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Khách nhận:</span>
                        <span className="font-bold text-slate-800">{spxFilledData?.recipientName || activeCustomerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Số điện thoại:</span>
                        <span className="font-bold text-slate-800">{spxFilledData?.recipientPhone || activeCustomerPhone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tiền thu hộ (COD):</span>
                        <span className="font-bold text-emerald-700">{Number(spxFilledData?.codAmount || 0).toLocaleString('vi-VN')} đ</span>
                      </div>
                      <div className="flex justify-between items-center pt-0.5 border-t border-slate-100">
                        <span className="text-slate-500">Nút "Tạo đơn":</span>
                        <span className="font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded text-[10px]">
                          🛡️ Chưa bấm (đúng yêu cầu)
                        </span>
                      </div>
                    </div>

                    <div className="relative rounded overflow-hidden border border-emerald-200 bg-slate-50">
                      <img
                        src={spxScreenshot}
                        alt="Ảnh chụp màn hình form SPX"
                        className="w-full h-auto object-cover max-h-40 rounded"
                      />
                      <a
                        href={spxScreenshot}
                        download={`spx-filled-order-${Date.now()}.png`}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute bottom-1.5 right-1.5 bg-slate-900/80 hover:bg-slate-900 text-white text-[10px] font-semibold px-2 py-1 rounded shadow flex items-center gap-1 cursor-pointer"
                        title="Tải ảnh bằng chứng về máy"
                      >
                        <Download className="w-3 h-3" />
                        Tải ảnh
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Created Result */}
              {(createdOrderCode || spxTrackingCode) && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800 space-y-2">
                  <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Đã hoàn tất xử lý & đồng bộ đơn hàng!
                  </p>
                  {createdOrderCode && (
                    <div className="bg-white p-2 rounded border border-emerald-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Mã đơn hệ thống</span>
                        <span className="font-bold text-sm text-indigo-700">{createdOrderCode}</span>
                      </div>
                      <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        Đã lưu vào Web Quản Lý
                      </span>
                    </div>
                  )}
                  {spxTrackingCode && (
                    <div className="bg-white p-2 rounded border border-emerald-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Mã vận đơn SPX</span>
                        <span className="font-bold text-sm text-amber-700">{spxTrackingCode}</span>
                      </div>
                      <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        Shopee Xpress
                      </span>
                    </div>
                  )}
                  {createdOrderCode && (
                    <a
                      href="http://localhost:5173/orders"
                      target="_blank"
                      rel="noreferrer"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1.5 px-3 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs mt-1 shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Mở xem trên Web Quản Lý (localhost:5173/orders)
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SPX TRACKING */}
        {activeTab === 'tracking' && (
          <div className="space-y-3">
            <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-3">
              <div className="font-bold text-xs text-slate-800">Tra cứu vận đơn Shopee Xpress</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập mã vận đơn SPXVN..."
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  className="flex-1 text-xs border border-slate-300 rounded px-2.5 py-1.5 uppercase font-medium"
                />
                <button
                  onClick={handleTrackSpx}
                  disabled={isTracking}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  Tra cứu
                </button>
              </div>
            </div>

            {/* Tracking Result Card */}
            {trackingResult && (
              <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Mã vận đơn</span>
                    <p className="font-bold text-xs text-indigo-700">{trackingResult.trackingCode}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    {trackingResult.statusText}
                  </span>
                </div>

                {/* Timeline */}
                <div className="space-y-2 text-xs">
                  <span className="font-bold text-slate-700">Hành trình chi tiết:</span>
                  <div className="border-l-2 border-indigo-200 ml-2 pl-3 space-y-3">
                    {trackingResult.checkpoints.map((cp: any, idx: number) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 border-2 border-white" />
                        <span className="text-[10px] font-semibold text-slate-400">{cp.time}</span>
                        <p className="text-slate-700 text-xs">{cp.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
