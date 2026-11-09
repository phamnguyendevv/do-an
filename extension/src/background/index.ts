// Background Service Worker (Manifest V3)

// Khi click vào icon extension trên toolbar -> Mở Side Panel
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    ?.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('Failed to set panel behavior:', error))
})

// Lắng nghe messages từ Content Script hoặc Side Panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_ACTIVE_TAB_INFO') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tab: tabs[0] })
    })
    return true
  }

  // Yêu cầu đóng tab hiện tại (ví dụ sau 4s dừng kiểm tra trên SPX)
  if (request.action === 'CLOSE_TAB') {
    if (sender.tab?.id) {
      chrome.tabs.remove(sender.tab.id)
      sendResponse({ success: true, tabId: sender.tab.id })
    } else {
      sendResponse({ success: false, error: 'Không tìm thấy tab ID' })
    }
    return true
  }

  // Chụp ảnh bằng chứng màn hình đã điền form trên SPX
  if (request.action === 'CAPTURE_FILLED_SCREENSHOT') {
    const windowId = sender.tab?.windowId
    chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        sendResponse({ success: false, error: chrome.runtime.lastError?.message })
        return
      }
      chrome.storage.local.set({
        lastSpxScreenshot: dataUrl,
        lastSpxScreenshotTime: Date.now(),
        lastSpxOrderData: request.orderData,
        lastSpxFilledCount: request.filledCount,
      })
      sendResponse({ success: true, dataUrl })
    })
    return true
  }

  // Điền đơn trực tiếp vào cổng tạo đơn lẻ SPX: https://spx.vn/spx-admin/single-order/create
  if (request.action === 'OPEN_SPX_AND_FILL') {
    const spxSingleOrderUrl = 'https://spx.vn/spx-admin/single-order/create'
    const orderData = request.orderData

    // 1. Lưu thông tin đơn chờ vào storage
    chrome.storage.local.set(
      {
        pendingSpxOrder: {
          ...orderData,
          createdAt: Date.now(),
        },
      },
      () => {
        // 2. Tìm kiếm trong các tab hiện tại xem tab SPX nào đang mở không
        chrome.tabs.query({}, (tabs) => {
          const spxTab = tabs.find(
            (t) =>
              t.url &&
              (t.url.includes('spx.vn') ||
                t.url.includes('banhang.shopee.vn') ||
                t.url.includes('shopee.vn/spx')),
          )

          if (spxTab && spxTab.id) {
            console.log('[Bookstore AI Background] Phát hiện tab SPX đã mở:', spxTab.url, 'ID:', spxTab.id)
            // Chuyển thẳng tab SPX đó vào trang tạo đơn lẻ single-order/create
            const shouldNavigate = !spxTab.url?.includes('single-order/create')

            chrome.tabs.update(
              spxTab.id,
              {
                url: shouldNavigate ? spxSingleOrderUrl : undefined,
                active: true,
              },
              (updatedTab) => {
                if (updatedTab?.windowId) {
                  chrome.windows.update(updatedTab.windowId, { focused: true })
                }

                if (!shouldNavigate) {
                  // Đang ở đúng trang single-order/create -> Gửi message điền ngay, giữ nguyên tab không reload
                  chrome.tabs.sendMessage(
                    spxTab.id!,
                    { action: 'AUTO_FILL_SPX', orderData },
                    (res) => {
                      if (chrome.runtime.lastError) {
                        console.log('[Bookstore AI Background] Tab SPX bận hoặc mất kết nối sau khi reload extension, nạp lại tab để tự động điền:', chrome.runtime.lastError.message)
                        chrome.tabs.reload(spxTab.id!)
                      }
                    },
                  )
                }
              },
            )
            sendResponse({ success: true, tabId: spxTab.id, reused: true })
          } else {
            // Nếu chưa mở tab SPX nào -> Mở thẳng https://spx.vn/spx-admin/single-order/create
            console.log('[Bookstore AI Background] Mở thẳng cổng tạo đơn lẻ SPX:', spxSingleOrderUrl)
            chrome.tabs.create({ url: spxSingleOrderUrl, active: true }, (tab) => {
              sendResponse({ success: true, tabId: tab.id, reused: false })
            })
          }
        })
      },
    )
    return true
  }

  // Ping test
  if (request.action === 'PING') {
    sendResponse({ status: 'PONG', timestamp: Date.now() })
  }
})
