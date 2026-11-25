// Content Script for Zalo Web (chat.zalo.me / web.zalo.me)
import {
  extractVnPhone,
  extractZaloFromDom,
  insertZaloChatTextInDom,
  type ZaloExtractedMessage,
} from '../utils/zalo-dom'

export { extractVnPhone, type ZaloExtractedMessage }

console.log('[Bookstore AI] Zalo content script loaded.')

export async function extractZaloMessages(scrollUp?: boolean) {
  const result = await extractZaloFromDom(Boolean(scrollUp))
  console.log(`[Bookstore AI] Đã lấy trọn vẹn ${result.messages.length} tin nhắn Zalo:`, {
    customerName: result.customerName,
    customerPhone: result.customerPhone,
    totalMessages: result.messages.length,
  })
  return result
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
    const inserted = insertZaloChatTextInDom(text)
    if (inserted) {
      sendResponse({ success: true })
    } else {
      sendResponse({ success: false, error: 'Không tìm thấy khung nhập tin nhắn Zalo' })
    }
    return true
  }
})
