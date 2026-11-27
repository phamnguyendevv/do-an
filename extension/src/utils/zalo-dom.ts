export interface ZaloExtractedMessage {
  sender: 'customer' | 'seller'
  text: string
  time?: string
}

export interface ZaloExtractionResult {
  customerName: string
  customerPhone?: string
  messages: ZaloExtractedMessage[]
}

/**
 * Hợp nhất batch tin nhắn mới (cũ hơn về thời gian) vào đầu danh sách hiện tại,
 * chỉ khử phần giao nhau ở biên hoặc trùng ID thật để KHÔNG làm mất tin nhắn lặp nội dung (vd: "Ok" 2 lần).
 */
export function mergeZaloScrollBatch<T extends ZaloExtractedMessage & { uniqueKey?: string }>(
  existing: T[],
  batch: T[],
  isPrepend: boolean,
  seenUniqueKeys: Set<string>,
): number {
  if (!batch.length) return 0

  if (!isPrepend) {
    let added = 0
    for (const item of batch) {
      if (item.uniqueKey) {
        if (seenUniqueKeys.has(item.uniqueKey)) continue
        seenUniqueKeys.add(item.uniqueKey)
      }
      existing.push(item)
      added++
    }
    return added
  }

  // Lọc bỏ phần tử đã xác định chắc chắn trùng uniqueKey (DOM node hoặc message ID thật)
  const freshItems = batch.filter((item) => {
    if (!item.uniqueKey) return true
    return !seenUniqueKeys.has(item.uniqueKey)
  })
  if (!freshItems.length) return 0

  // Tìm độ dài phần chồng lấn lớn nhất giữa đuôi `freshItems` và đầu `existing`
  const maxOverlap = Math.min(freshItems.length, existing.length)
  let overlapLen = 0
  for (let len = maxOverlap; len >= 1; len--) {
    let matches = true
    for (let i = 0; i < len; i++) {
      const a = freshItems[freshItems.length - len + i]
      const b = existing[i]
      if (a.sender !== b.sender || a.text !== b.text) {
        matches = false
        break
      }
    }
    if (matches) {
      overlapLen = len
      break
    }
  }

  const toPrepend = freshItems.slice(0, freshItems.length - overlapLen)
  for (let i = toPrepend.length - 1; i >= 0; i--) {
    const item = toPrepend[i]
    if (item.uniqueKey) {
      seenUniqueKeys.add(item.uniqueKey)
    }
    existing.unshift(item)
  }
  return toPrepend.length
}

/**
 * Trích xuất số điện thoại Việt Nam (10 chữ số, hỗ trợ khoảng trắng, dấu chấm, gạch ngang, +84 / 84).
 */
export function extractVnPhone(raw: string): string {
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

/**
 * Self-contained DOM extractor cho Zalo Web.
 * Toàn bộ helper được đặt bên trong để có thể serialize chạy trực tiếp qua chrome.scripting.executeScript.
 */
export async function extractZaloFromDom(scrollUp = false): Promise<ZaloExtractionResult> {
  const GENERIC_DATA_IDS = new Set([
    'div_ReceivedMsg_Text',
    'div_SentMsg_Text',
    'div_ReceivedMsg',
    'div_SentMsg',
    'chat-box',
    'messageView',
    'messageViewScroll',
    'div_ScrollableChat',
  ])

  const nodeKeyMap = new WeakMap<HTMLElement, string>()
  let nextNodeSeq = 1

  function getStableDomKey(node: HTMLElement): string {
    const existing = nodeKeyMap.get(node)
    if (existing) return existing
    const row = node.closest('[data-id], .chat-item, .msg-item') as HTMLElement | null
    const rawAttrId = row?.getAttribute('data-id') || row?.id || ''
    const isSpecificMsgId =
      Boolean(rawAttrId) &&
      !GENERIC_DATA_IDS.has(rawAttrId) &&
      (/\d{4,}/.test(rawAttrId) || rawAttrId.startsWith('msg') || rawAttrId.includes('_'))
    const key = isSpecificMsgId ? `msg:${rawAttrId}` : `dom:${nextNodeSeq++}`
    nodeKeyMap.set(node, key)
    return key
  }

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

  function findScrollContainer(): HTMLElement {
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

    return (
      (document.querySelector('#messageViewScroll') as HTMLElement) ||
      (document.querySelector('[data-id="div_ScrollableChat"]') as HTMLElement) ||
      (document.querySelector('.message-view__scroll') as HTMLElement) ||
      (document.querySelector('.chat-message-list') as HTMLElement) ||
      (document.querySelector('#messageView') as HTMLElement) ||
      (document.querySelector('.chat-view') as HTMLElement) ||
      (document.querySelector('#chatView') as HTMLElement) ||
      document.body
    )
  }

  function collectVisibleMessages(
    container: HTMLElement,
    dividerX: number,
    cardMap: Map<HTMLElement, { name: string; phone: string }>,
  ): Array<{ uniqueKey: string; sender: 'customer' | 'seller'; text: string; top: number }> {
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
      container.querySelectorAll(bubbleSelectors.join(', ')),
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

    cardMap.forEach((_, cardEl) => {
      if (!bubbleNodes.includes(cardEl)) {
        bubbleNodes.push(cardEl)
      }
    })

    const finalNodes = bubbleNodes.filter((node) => {
      if (cardMap.has(node)) return true
      return !bubbleNodes.some((other) => other !== node && node.contains(other))
    })

    finalNodes.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)

    const results: Array<{ uniqueKey: string; sender: 'customer' | 'seller'; text: string; top: number }> = []

    finalNodes.forEach((node) => {
      const matchedCard = Array.from(cardMap.entries()).find(
        ([cardEl]) => cardEl === node || cardEl.contains(node),
      )
      if (matchedCard) {
        const cardInfo = matchedCard[1]
        const text = `[Chia sẻ danh thiếp]: ${cardInfo.name} - SĐT: ${cardInfo.phone}`
        results.push({
          uniqueKey: `card:${cardInfo.phone}`,
          sender: 'customer',
          text,
          top: node.getBoundingClientRect().top,
        })
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

      const rawText = (clone.innerText || clone.textContent || '').trim()
      if (!rawText || rawText.length < 1) return
      if (/^\d{1,2}:\d{2}(\s+(Hôm nay|Hôm qua|ngày|\w+))?$/i.test(rawText)) return
      if (
        ['Đã gửi', 'Đã nhận', 'Đã xem', 'Chuyển tiếp', 'Thu hồi', 'Tin nhắn đã bị thu hồi'].includes(
          rawText,
        )
      ) {
        return
      }

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

      const uniqueKey = getStableDomKey(node)
      results.push({
        uniqueKey,
        sender,
        text: fullText,
        top: rect.top,
      })
    })

    return results
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

  const scrollContainer = findScrollContainer()
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
    } catch {}
  })

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
        if (/^[.…\s•-]+$/.test(l)) return false
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
    const pinPhone = localExtractPhone(pinText)
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

  const contactCardMap = new Map<HTMLElement, { name: string; phone: string }>()

  const explicitContactCards = Array.from(
    scrollContainer.querySelectorAll(
      '[data-id*="Msg_Contact"], [data-id*="Msg_NameCard"], [data-id*="Msg_Recommend"], .card--contact, .card--recommend, [class*="card--contact"], [class*="card--recommend"]',
    ),
  ) as HTMLElement[]

  const registerContactCard = (card: HTMLElement | null) => {
    if (!card || contactCardMap.has(card)) return
    if (card.matches('[data-id*="Msg_Text"], .card--text, [class*="card--text"]')) return

    const cardText = (card.innerText || card.textContent || '').trim()
    const cardPhone = localExtractPhone(cardText)
    if (!cardPhone) return

    if (!detectedPhone) {
      detectedPhone = cardPhone
    }
    const lines = cardText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !/^(kết bạn|nhắn tin|chia sẻ danh thiếp|danh thiếp|gọi điện|thêm bạn)$/i.test(l))
    let nameFound = ''
    for (const line of lines) {
      if (!localExtractPhone(line) && line.length >= 2 && line.length <= 40) {
        nameFound = line
        break
      }
    }
    contactCardMap.set(card, {
      name: nameFound || customerName || 'Khách hàng',
      phone: cardPhone,
    })
  }

  explicitContactCards.forEach((card) => registerContactCard(card))

  const candidateActionBtns = Array.from(
    scrollContainer.querySelectorAll('button, a, [role="button"]'),
  ) as HTMLElement[]
  candidateActionBtns.forEach((el) => {
    const text = (el.textContent || '').trim()
    if (
      text.length <= 35 &&
      /^(kết bạn|nhắn tin|chia sẻ danh thiếp|danh thiếp|gửi danh thiếp|thêm bạn)$/i.test(text)
    ) {
      const card = (el.closest(
        '[data-id*="Msg_Contact"], [data-id*="Msg_NameCard"], [data-id*="Msg_Recommend"], .card--contact, .card--recommend, .card, [class*="card"]',
      ) || el.closest('[data-id*="Msg_"]')) as HTMLElement | null
      registerContactCard(card)
    }
  })

  // Thu thập & cuộn nạp lịch sử tin nhắn (giữ nguyên tin nhắn lặp nội dung như "Ok" 2 lần)
  const orderedRecords: Array<{ uniqueKey: string; sender: 'customer' | 'seller'; text: string }> = []
  const seenUniqueKeys = new Set<string>()

  const addBatch = (
    batch: Array<{ uniqueKey: string; sender: 'customer' | 'seller'; text: string }>,
    isPrepend = false,
  ) => {
    if (!batch.length) return 0
    if (!isPrepend) {
      let added = 0
      for (const item of batch) {
        if (seenUniqueKeys.has(item.uniqueKey)) continue
        seenUniqueKeys.add(item.uniqueKey)
        orderedRecords.push({ uniqueKey: item.uniqueKey, sender: item.sender, text: item.text })
        added++
      }
      return added
    }

    const freshItems = batch.filter((item) => !seenUniqueKeys.has(item.uniqueKey))
    if (!freshItems.length) return 0

    const maxOverlap = Math.min(freshItems.length, orderedRecords.length)
    let overlapLen = 0
    for (let len = maxOverlap; len >= 1; len--) {
      let matches = true
      for (let i = 0; i < len; i++) {
        const a = freshItems[freshItems.length - len + i]
        const b = orderedRecords[i]
        if (a.sender !== b.sender || a.text !== b.text) {
          matches = false
          break
        }
      }
      if (matches) {
        overlapLen = len
        break
      }
    }

    const toPrepend = freshItems.slice(0, freshItems.length - overlapLen)
    for (let i = toPrepend.length - 1; i >= 0; i--) {
      const item = toPrepend[i]
      seenUniqueKeys.add(item.uniqueKey)
      orderedRecords.unshift({ uniqueKey: item.uniqueKey, sender: item.sender, text: item.text })
    }
    return toPrepend.length
  }

  const initialBatch = collectVisibleMessages(scrollContainer, midX, contactCardMap)
  addBatch(initialBatch, false)

  const maxScrollPasses = scrollUp ? 15 : 6
  if (
    scrollContainer &&
    scrollContainer !== document.body &&
    scrollContainer.scrollHeight > scrollContainer.clientHeight
  ) {
    let consecutiveZeroCount = 0

    for (let pass = 0; pass < maxScrollPasses; pass++) {
      const prevScrollTop = scrollContainer.scrollTop
      scrollContainer.scrollTop = Math.max(0, scrollContainer.scrollTop - 1500)
      scrollContainer.dispatchEvent(new Event('scroll', { bubbles: true }))

      await new Promise((resolve) => setTimeout(resolve, 180))

      const batch = collectVisibleMessages(scrollContainer, midX, contactCardMap)
      const added = addBatch(batch, true)

      if (added === 0 && (scrollContainer.scrollTop <= 0 || scrollContainer.scrollTop === prevScrollTop)) {
        consecutiveZeroCount++
        if (consecutiveZeroCount >= 2) {
          break
        }
      } else {
        consecutiveZeroCount = 0
      }
    }

    try {
      scrollContainer.scrollTop = scrollContainer.scrollHeight
      scrollContainer.dispatchEvent(new Event('scroll', { bubbles: true }))
    } catch {}
  }

  const orderedMessages: ZaloExtractedMessage[] = orderedRecords.map((r) => ({
    sender: r.sender,
    text: r.text,
  }))

  const seenPinKeys = new Set<string>()
  pinnedMessages.forEach((pinText) => {
    const formattedPin = `[Tin nhắn ghim]: ${pinText}`
    if (!seenPinKeys.has(formattedPin)) {
      seenPinKeys.add(formattedPin)
      orderedMessages.unshift({
        sender: 'customer',
        text: formattedPin,
      })
    }
  })

  if (!detectedPhone) {
    for (const msg of orderedMessages) {
      const found = localExtractPhone(msg.text)
      if (found) {
        detectedPhone = found
        break
      }
    }
  }

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

/**
 * Điền văn bản vào ô nhập tin nhắn Zalo Web (tương thích Quill / contenteditable / textarea).
 */
export function insertZaloChatTextInDom(text: string): boolean {
  const el =
    (document.querySelector('#input_quill') as HTMLElement) ||
    (document.querySelector('#richInput') as HTMLElement) ||
    (document.querySelector('[data-id="div_InputText"] [contenteditable="true"]') as HTMLElement) ||
    (document.querySelector('[data-id="div_InputText"]') as HTMLElement) ||
    (document.querySelector('div[contenteditable="true"]') as HTMLElement) ||
    (document.querySelector('#chatInput') as HTMLElement) ||
    (document.querySelector('.chat-input textarea') as HTMLTextAreaElement)

  if (!el) return false

  el.focus()

  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    const proto =
      el instanceof HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    if (setter) {
      setter.call(el, text)
    } else {
      el.value = text
    }
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  }

  try {
    const sel = window.getSelection()
    if (sel) {
      const range = document.createRange()
      range.selectNodeContents(el)
      sel.removeAllRanges()
      sel.addRange(range)
    }
    document.execCommand('selectAll', false, undefined)
    document.execCommand('insertText', false, text)
  } catch {}

  const currentText = (el.innerText || el.textContent || '').trim()
  if (!currentText || !currentText.includes(text.trim().slice(0, 12))) {
    el.innerText = text
    try {
      el.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          composed: true,
          inputType: 'insertText',
          data: text,
        }),
      )
    } catch {
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
  } else {
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }

  try {
    el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ' ' }))
    const sel = window.getSelection()
    if (sel) {
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
      sel.removeAllRanges()
      sel.addRange(range)
    }
  } catch {}

  return true
}
