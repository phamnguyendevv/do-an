// Content Script for Zalo Web (chat.zalo.me / web.zalo.me)

export interface ZaloExtractedMessage {
  sender: 'customer' | 'seller'
  text: string
  time?: string
}

console.log('[Bookstore AI] Zalo content script loaded.')

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

// Helper tìm đúng container cuộn tin nhắn thực tế của Zalo Web
function findZaloScrollContainer(): HTMLElement {
  const selectors = [
    '#messageViewScroll',
    '[data-id="div_ScrollableChat"]',
    '.message-view__scroll',
    '.chat-message-list',
    '#messageView',
    '.chat-conversation',
    '.chat-view',
    '#chatView',
  ]

  for (const sel of selectors) {
    const el = document.querySelector(sel) as HTMLElement | null
    if (el && el.scrollHeight > el.clientHeight) {
      return el
    }
  }

  // Quét tìm container có overflow scroll/auto và chứa tin nhắn
  const allDivs = Array.from(document.querySelectorAll('div'))
  for (const div of allDivs) {
    if (
      div.closest('#chatList') ||
      div.closest('.conv-item') ||
      div.closest('.conversation-item') ||
      div.closest('#chatInput')
    ) {
      continue
    }
    const hasMsg = div.querySelector('[data-id*="Msg"], .chat-item, .msg-item, [class*="bubble"], .card--text')
    if (hasMsg && div.scrollHeight > div.clientHeight + 80) {
      const style = window.getComputedStyle(div)
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        return div
      }
    }
  }

  return (document.querySelector('#messageViewScroll') as HTMLElement) || document.body
}

// Bóc tách nhanh các tin nhắn đang hiển thị trong DOM ở thời điểm hiện tại
function collectVisibleZaloMessages(
  scrollContainer: HTMLElement,
  midX: number,
  contactCardMap: Map<HTMLElement, { name: string; phone: string }>
): Array<{ id: string; sender: 'customer' | 'seller'; text: string; top: number }> {
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

  let bubbleNodes = Array.from(
    scrollContainer.querySelectorAll(bubbleSelectors.join(', '))
  ) as HTMLElement[]

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

  // Thêm các thẻ card danh thiếp đã phát hiện vào danh sách node nếu chưa có
  contactCardMap.forEach((_, cardEl) => {
    if (!bubbleNodes.includes(cardEl)) {
      bubbleNodes.push(cardEl)
    }
  })

  // Chỉ giữ các node lá hoặc node chứa text trực tiếp
  const finalNodes = bubbleNodes.filter((node) => {
    if (contactCardMap.has(node)) return true
    return !bubbleNodes.some((other) => other !== node && node.contains(other))
  })

  finalNodes.sort((a, b) => {
    return a.getBoundingClientRect().top - b.getBoundingClientRect().top
  })

  const results: Array<{ id: string; sender: 'customer' | 'seller'; text: string; top: number }> = []

  finalNodes.forEach((node) => {
    // 1. Nếu là Danh thiếp (Contact Card)
    const matchedCard = Array.from(contactCardMap.entries()).find(
      ([cardEl]) => cardEl === node || cardEl.contains(node)
    )
    if (matchedCard) {
      const cardInfo = matchedCard[1]
      const text = `[Chia sẻ danh thiếp]: ${cardInfo.name} - SĐT: ${cardInfo.phone}`
      const id = `card:${cardInfo.phone}`
      results.push({ id, sender: 'customer', text, top: node.getBoundingClientRect().top })
      return
    }

    // 2. Bóc tách nội dung Quote (trích dẫn / trả lời tin nhắn) nếu có
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
    const isRight = rect.left + rect.width / 2 > midX

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

export async function extractZaloMessages(scrollUp?: boolean): Promise<{
  customerName: string
  customerPhone?: string
  messages: ZaloExtractedMessage[]
}> {
  // 1. Lấy tên người chat từ Header
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

  // 2. Tìm container cuộn tin nhắn chính và khung chat
  const scrollContainer = findZaloScrollContainer()
  const chatArea =
    document.querySelector('#chatView') ||
    document.querySelector('.chat-view') ||
    document.querySelector('[data-id="chat-box"]') ||
    document.querySelector('.chat-box') ||
    document.querySelector('.chat-conversation') ||
    document.querySelector('#messageView') ||
    document.body

  const containerRect =
    scrollContainer === document.body
      ? document.body.getBoundingClientRect()
      : scrollContainer.getBoundingClientRect()
  const midX = containerRect.left + containerRect.width / 2

  let detectedPhone = ''

  // 3. Quét tìm Tin nhắn ghim (Pinned messages) trong Zalo Web
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

  // Tìm các phần tử nằm giữa Header và scrollContainer
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

  // Quét các thẻ có nhãn ghim
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
        'button, svg, [role="button"], [class*="close"], [class*="menu"], [class*="more"], [class*="action"], [class*="icon"], [class*="btn"]'
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

  for (const pinText of pinnedMessages) {
    const pinPhone = extractVnPhone(pinText)
    if (pinPhone) {
      detectedPhone = pinPhone
      break
    }
  }

  if (!customerName || customerName === 'Khách hàng') {
    for (const pinText of pinnedMessages) {
      const match = pinText.match(/^([A-ZÀ-Ỹa-zà-ỹ\s]{2,30}):/)
      if (match && !/tin nhắn|tin ghim|ghi chú|thông báo/i.test(match[1])) {
        customerName = match[1].trim()
        break
      }
    }
  }

  // 4. Quét trực tiếp các Contact Card / Danh thiếp Zalo
  const contactCardMap = new Map<HTMLElement, { name: string; phone: string }>()
  const candidateButtons = Array.from(
    scrollContainer.querySelectorAll('button, a, div[role="button"], span, div')
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
        const cardPhone = extractVnPhone(cardText)
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
            if (!extractVnPhone(line) && line.length >= 2 && line.length <= 40) {
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

  // 5. THU THẬP ĐA TẦNG VÀ TỰ ĐỘNG CUỘN NẠP TOÀN BỘ CUỘC TRÒ CHUYỆN (FULL HISTORY)
  const orderedMessages: ZaloExtractedMessage[] = []
  const seenMessageIds = new Set<string>()

  const addBatch = (batch: Array<{ id: string; sender: 'customer' | 'seller'; text: string }>, isPrepend = false) => {
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

  // Thu thập đợt tin nhắn đang hiển thị tại vị trí hiện tại
  const initialBatch = collectVisibleZaloMessages(scrollContainer, midX, contactCardMap)
  addBatch(initialBatch, false)

  // Tự động cuộn ngược lên nhiều lần để tải trọn vẹn toàn bộ các tin nhắn cũ hơn
  // Mặc định cuộn 8 lần (đủ cho 100-150 tin nhắn), nếu scrollUp = true thì cuộn 16 lần
  const maxScrollPasses = scrollUp ? 16 : 8

  if (scrollContainer && scrollContainer !== document.body && scrollContainer.scrollHeight > scrollContainer.clientHeight) {
    let consecutiveZeroCount = 0

    for (let pass = 0; pass < maxScrollPasses; pass++) {
      const prevScrollTop = scrollContainer.scrollTop

      // Cuộn lên 1500px hoặc về đỉnh
      scrollContainer.scrollTop = Math.max(0, scrollContainer.scrollTop - 1500)
      scrollContainer.dispatchEvent(new Event('scroll', { bubbles: true }))

      // Chờ Zalo Web nạp thêm tin nhắn vào DOM
      await new Promise((resolve) => setTimeout(resolve, 400))

      const batch = collectVisibleZaloMessages(scrollContainer, midX, contactCardMap)
      const added = addBatch(batch, true)

      if (added === 0 && (scrollContainer.scrollTop <= 0 || scrollContainer.scrollTop === prevScrollTop)) {
        consecutiveZeroCount++
        if (consecutiveZeroCount >= 2) {
          // Đã chạm đỉnh cuộc trò chuyện
          break
        }
      } else {
        consecutiveZeroCount = 0
      }
    }

    // Cuộn lại về vị trí gần cuối để người dùng tiếp tục chat bình thường
    try {
      scrollContainer.scrollTop = scrollContainer.scrollHeight
      scrollContainer.dispatchEvent(new Event('scroll', { bubbles: true }))
    } catch (_) {}
  }

  // 6. Đưa các tin nhắn ghim lên đầu danh sách tin nhắn
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

  // 7. Quét tìm số điện thoại trong toàn bộ tin nhắn đã thu thập
  if (!detectedPhone) {
    for (const msg of orderedMessages) {
      const found = extractVnPhone(msg.text)
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
    detectedPhone = extractVnPhone(containerText)
  }

  if (!detectedPhone && chatArea && chatArea !== document.body) {
    const chatText = ((chatArea as HTMLElement).innerText || chatArea.textContent || '').trim()
    detectedPhone = extractVnPhone(chatText)
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

  console.log(`[Bookstore AI] Đã lấy trọn vẹn ${orderedMessages.length} tin nhắn Zalo:`, {
    customerName,
    customerPhone: detectedPhone,
    totalMessages: orderedMessages.length,
  })

  return {
    customerName,
    customerPhone: detectedPhone,
    messages: orderedMessages,
  }
}

// Lắng nghe yêu cầu từ Side Panel
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'EXTRACT_ZALO_CHAT') {
    extractZaloMessages(Boolean(request.scrollUp))
      .then((data) => {
        sendResponse({ success: true, data })
      })
      .catch((err) => {
        sendResponse({ success: false, error: err?.message || String(err) })
      })
    return true // Giữ kết nối bất đồng bộ cho sendResponse
  }

  if (request.action === 'INSERT_ZALO_CHAT_TEXT') {
    const text = request.text || ''
    const el =
      (document.querySelector('#input_quill') as HTMLElement) ||
      (document.querySelector('div[contenteditable="true"]') as HTMLElement) ||
      (document.querySelector('[data-id="div_InputText"]') as HTMLElement) ||
      (document.querySelector('#chatInput') as HTMLElement) ||
      (document.querySelector('.chat-input textarea') as HTMLTextAreaElement)

    if (el) {
      el.focus()
      if ('value' in el) {
        (el as HTMLTextAreaElement).value = text
      } else {
        el.innerText = text
      }
      el.dispatchEvent(new Event('input', { bubbles: true }))
      sendResponse({ success: true })
    } else {
      sendResponse({ success: false, error: 'Không tìm thấy khung nhập tin nhắn' })
    }
    return true
  }
})
