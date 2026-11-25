import { unwrapResponseEnvelope } from '../../utils/api-unwrap'
import { buildAssistantHeaders, fetchWithFallback, resolveBackendBaseUrl } from '../../utils/auth-headers'

export interface ActiveSpxOrderSync {
  orderCode?: string
  recipientName: string
  recipientPhone: string
  createdAt: number
  submittedAt?: number
  syncedTrackingCode?: string
}

const SPX_TRACKING_REGEX = /\b(SPXVN[0-9A-Z]{6,16}|SPX[0-9]{8,16})\b/i

export function extractSpxTrackingCodeFromText(text: string): string | null {
  if (!text) return null
  const match = text.match(SPX_TRACKING_REGEX)
  return match ? match[1].toUpperCase() : null
}

function showSyncedTrackingBanner(trackingCode: string, orderCode?: string, synced = false) {
  const existing = document.getElementById('bookstore-ai-spx-tracking-sync-banner')
  if (existing) existing.remove()

  const banner = document.createElement('div')
  banner.id = 'bookstore-ai-spx-tracking-sync-banner'
  banner.style.cssText = `
    position: fixed;
    bottom: 18px;
    right: 18px;
    z-index: 2147483647;
    max-width: 400px;
    background: #ecfdf5;
    color: #065f46;
    border: 2px solid #10b981;
    border-radius: 10px;
    padding: 12px 14px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 12px;
    line-height: 1.45;
  `
  banner.innerHTML = `
    <div style="font-weight: 800; color: #047857; margin-bottom: 4px;">
      📦 Bookstore AI — ${synced ? 'Đã đồng bộ mã vận đơn SPX' : 'Đã bắt được mã vận đơn SPX'}
    </div>
    <div>
      • Mã vận đơn: <strong style="color: #b45309;">${trackingCode}</strong><br/>
      ${
        orderCode
          ? `• Đơn hàng Web: <strong>${orderCode}</strong> (${synced ? 'Đã gắn vào hệ thống' : 'Đã lưu tạm để gắn'})`
          : '• Đã lưu về Extension Side Panel để gắn vào đơn / tra cứu.'
      }
    </div>
  `
  document.body.appendChild(banner)

  setTimeout(() => {
    try {
      banner.remove()
    } catch { }
  }, 15000)
}

export async function syncCapturedTrackingToBackend(
  trackingCode: string,
  orderCode?: string,
): Promise<boolean> {
  if (!orderCode) return false
  try {
    const baseUrl = await resolveBackendBaseUrl()
    const headers = await buildAssistantHeaders()
    const payload = JSON.stringify({
      orderCode,
      trackingCode,
      shippingMethod: 'Shopee Xpress (SPX)',
    })

    const res = await fetchWithFallback(
      [`${baseUrl}/api/assistant/update-tracking`, `${baseUrl}/api/v1/assistant/update-tracking`],
      () => ({ method: 'POST', headers, body: payload }),
    )

    if (res && res.ok) {
      const json = await res.json().catch(() => null)
      const inner = unwrapResponseEnvelope<Record<string, any>>(json)
      return Boolean(inner?.success !== false)
    }
  } catch (err) {
    console.warn('[Bookstore AI] Lỗi đồng bộ tracking SPX về backend:', err)
  }
  return false
}

let watcherCleanup: (() => void) | null = null

export function startSpxTrackingWatcher(syncInfo: ActiveSpxOrderSync) {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return

  if (watcherCleanup) {
    watcherCleanup()
    watcherCleanup = null
  }

  let hasSubmitted = Boolean(syncInfo.submittedAt) || !window.location.href.includes('single-order/create')
  let capturedCode = syncInfo.syncedTrackingCode || ''

  chrome.storage.local.set({ activeSpxOrderSync: syncInfo })

  const onDocumentClick = (e: Event) => {
    const target = e.target as HTMLElement | null
    const btn = target?.closest('button, [role="button"]') as HTMLElement | null
    if (!btn) return
    const text = (btn.textContent || '').trim().toLowerCase()
    if (
      text.includes('tạo đơn') ||
      text.includes('xác nhận') ||
      text.includes('gửi đơn') ||
      text === 'submit' ||
      text === 'create'
    ) {
      hasSubmitted = true
      chrome.storage.local.set({
        activeSpxOrderSync: {
          ...syncInfo,
          submittedAt: Date.now(),
        },
      })
    }
  }

  document.addEventListener('click', onDocumentClick, true)

  const scanForTrackingCode = async () => {
    if (capturedCode) return

    // 1. Luôn kiểm tra URL trước (SPX chuyển trang detail/success kèm tracking)
    const fromUrl = extractSpxTrackingCodeFromText(window.location.href)
    if (fromUrl) {
      await handleCaptured(fromUrl)
      return
    }

    // 2. Chỉ quét DOM sau khi người dùng đã bấm Tạo đơn hoặc trang đã chuyển khỏi form tạo đơn
    if (!hasSubmitted && window.location.href.includes('single-order/create')) {
      return
    }

    const successContainers = Array.from(
      document.querySelectorAll(
        '.ant-modal, .ant-modal-content, .ant-notification-notice, .ant-message, .ant-result, [class*="success"], [class*="detail"], main, table',
      ),
    ) as HTMLElement[]

    for (const el of successContainers) {
      const txt = el.innerText || el.textContent || ''
      const found = extractSpxTrackingCodeFromText(txt)
      if (found) {
        await handleCaptured(found)
        return
      }
    }

    const bodyCode = extractSpxTrackingCodeFromText(document.body?.innerText || '')
    if (bodyCode) {
      await handleCaptured(bodyCode)
    }
  }

  const handleCaptured = async (trackingCode: string) => {
    if (capturedCode) return
    capturedCode = trackingCode

    let targetOrderCode = syncInfo.orderCode
    if (!targetOrderCode) {
      try {
        const stored = (await chrome.storage.local.get(['lastCreatedOrder'])) as Record<string, any>
        const lastOrder = stored?.lastCreatedOrder
        if (
          lastOrder?.orderCode &&
          Date.now() - Number(lastOrder.createdAt || 0) < 30 * 60 * 1000
        ) {
          targetOrderCode = lastOrder.orderCode
        }
      } catch { }
    }

    const synced = await syncCapturedTrackingToBackend(trackingCode, targetOrderCode)

    await chrome.storage.local.set({
      lastCapturedSpxTracking: {
        trackingCode,
        orderCode: targetOrderCode,
        capturedAt: Date.now(),
        synced,
      },
    })

    if (synced) {
      chrome.storage.local.remove(['activeSpxOrderSync'])
    } else {
      chrome.storage.local.set({
        activeSpxOrderSync: {
          ...syncInfo,
          orderCode: targetOrderCode,
          syncedTrackingCode: trackingCode,
        },
      })
    }

    showSyncedTrackingBanner(trackingCode, targetOrderCode, synced)
    cleanup()
  }

  const observer = new MutationObserver(() => {
    void scanForTrackingCode()
  })
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true })
  }

  const intervalId = window.setInterval(() => {
    void scanForTrackingCode()
  }, 1500)

  const timeoutId = window.setTimeout(() => {
    cleanup()
  }, 5 * 60 * 1000)

  const cleanup = () => {
    document.removeEventListener('click', onDocumentClick, true)
    observer.disconnect()
    window.clearInterval(intervalId)
    window.clearTimeout(timeoutId)
    if (watcherCleanup === cleanup) {
      watcherCleanup = null
    }
  }

  watcherCleanup = cleanup
  void scanForTrackingCode()
}

export function resumeSpxTrackingWatcherIfActive() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return
  chrome.storage.local.get(['activeSpxOrderSync'], (res) => {
    const syncInfo = res?.activeSpxOrderSync as ActiveSpxOrderSync | undefined
    if (
      syncInfo &&
      !syncInfo.syncedTrackingCode &&
      Date.now() - (syncInfo.createdAt || 0) < 10 * 60 * 1000
    ) {
      startSpxTrackingWatcher(syncInfo)
    }
  })
}
