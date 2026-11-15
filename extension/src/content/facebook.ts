// Content Script for Facebook Messenger & Meta Business Suite

export interface FbExtractedMessage {
  sender: 'customer' | 'seller'
  text: string
  time?: string
}

console.log('[Bookstore AI] Facebook content script loaded.')

// Helper trích xuất số điện thoại Việt Nam
function extractVnPhone(raw: string): string {
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

function collectVisibleFbMessages(
  scrollContainer: Element | Document,
  midX: number
): Array<{ id: string; sender: 'customer' | 'seller'; text: string; top: number }> {
  const messageNodes = Array.from(
    scrollContainer.querySelectorAll(
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

    // Bỏ qua timestamp đơn thuần
    if (/^\d{1,2}:\d{2}(\s*(AM|PM))?$/i.test(text)) return
    if (['Đã gửi', 'Đã chuyển', 'Đã xem', 'Thích', 'Đã gỡ'].includes(text)) return

    const parentRow = node.closest('[role="row"]')
    const rect = node.getBoundingClientRect()
    const isRight = rect.left + rect.width / 2 > midX

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

export async function extractFacebookMessages(scrollUp?: boolean): Promise<{
  customerName: string
  customerPhone?: string
  messages: FbExtractedMessage[]
}> {
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

  const orderedMessages: FbExtractedMessage[] = []
  const seenIds = new Set<string>()

  const addBatch = (batch: Array<{ id: string; sender: 'customer' | 'seller'; text: string }>, isPrepend = false) => {
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

  // Thu thập đợt tin nhắn ban đầu
  const initialBatch = collectVisibleFbMessages(scrollContainer, midX)
  addBatch(initialBatch, false)

  // Tự động cuộn ngược lên để nạp toàn bộ tin nhắn
  const maxPasses = scrollUp ? 14 : 7
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
    const p = extractVnPhone(m.text)
    if (p) {
      detectedPhone = p
      break
    }
  }

  if (!detectedPhone) {
    const rawAll = (scrollContainer as Element).textContent || ''
    detectedPhone = extractVnPhone(rawAll)
  }

  return {
    customerName,
    customerPhone: detectedPhone,
    messages: orderedMessages,
  }
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'EXTRACT_FB_CHAT') {
    extractFacebookMessages(Boolean(request.scrollUp))
      .then((data) => {
        sendResponse({ success: true, data })
      })
      .catch((err) => {
        sendResponse({ success: false, error: String(err) })
      })
    return true
  }
})
