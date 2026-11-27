// Content Script for SPX (Shopee Xpress - spx.vn / shopee.vn)
// Entry point gọn điều phối nhận diện 2 cấp / 3 cấp, điền Smart Import + Cascader + COD + Mục 4
// và giữ nguyên tab để người dùng kiểm tra thủ công (KHÔNG TỰ TẮT).

import { unwrapVerifyAddressResponse } from '../utils/api-unwrap'
import { buildAssistantHeaders, fetchWithFallback, resolveBackendBaseUrl } from '../utils/auth-headers'
import {
  normalizeProvinceName,
  normalizeVnText,
  parseAddressComponents,
  resolveWeightKgAndQty,
  stripAdminPrefixes,
  type SpxOrderData,
  type SpxOrderItem,
} from '../utils/spx-address'
import {
  attachSmartImportObserver,
  ensureAddressTypeRadio,
  fillSmartImport,
  findCascaderTrigger,
  findSmartImportInput,
  selectAddressSuggestionIfPresent,
  selectCascaderAddress,
} from './spx/address-rpa'
import {
  canRedirectToSingleOrder,
  findAddressDetailField,
  findCodField,
  findNameField,
  findNotesField,
  findPhoneField,
  isSpxLoginPage,
  setAntDesignNumber,
  setInputValue,
  showCompletedBanner,
  showSpxLoginRequiredBanner,
  sleep,
} from './spx/dom-helpers'
import {
  fillSection4Goods,
  findSection4Card,
  findSection4Inputs,
} from './spx/goods-rpa'
import {
  resumeSpxTrackingWatcherIfActive,
  startSpxTrackingWatcher,
} from './spx/tracking-sync'

export {
  normalizeProvinceName,
  normalizeVnText,
  parseAddressComponents,
  stripAdminPrefixes,
  type SpxOrderData,
  type SpxOrderItem,
}

console.log('[Bookstore AI] SPX content script loaded on:', window.location.href)

async function enrichMissingGeoWithGemini(orderData: SpxOrderData) {
  const isMissingGeo =
    !orderData.province ||
    (!orderData.district && orderData.addressType === 'OLD_3_LEVEL')

  if (!isMissingGeo || (!orderData.address && !orderData.detailAddress)) {
    return
  }

  const rawAddr = (orderData.address || orderData.detailAddress || '').trim()
  console.log(
    `[Bookstore AI] Phát hiện đơn hàng SPX bị thiếu Tỉnh hoặc Quận/Huyện ("${rawAddr}"), đang gửi vào Gemini AI kiểm tra...`,
  )

  try {
    const targetApi = await resolveBackendBaseUrl()
    const headers = await buildAssistantHeaders()
    const body = JSON.stringify({ address: rawAddr })
    const candidateUrls = [
      `${targetApi}/api/assistant/verify-address`,
      `${targetApi}/api/v1/assistant/verify-address`,
      ...(targetApi !== 'http://localhost:3000'
        ? ['http://localhost:3000/api/assistant/verify-address']
        : []),
    ]

    const res = await fetchWithFallback(candidateUrls, () => ({
      method: 'POST',
      headers,
      body,
    }))

    if (res && res.ok) {
      const json = await res.json().catch(() => null)
      const data = unwrapVerifyAddressResponse(json)
      if (data && data.province) {
        console.log('[Bookstore AI] Gemini AI đã tra cứu bổ sung Tỉnh/Huyện thành công:', data)
        orderData.province = data.province
        if (data.district && !orderData.district) orderData.district = data.district
        if (data.ward && !orderData.ward) orderData.ward = data.ward
        if (data.detailAddress && (!orderData.detailAddress || orderData.detailAddress.length < 5)) {
          orderData.detailAddress = data.detailAddress
        }
        if (data.addressType) orderData.addressType = data.addressType
      }
    }
  } catch (geminiErr) {
    console.warn('[Bookstore AI] Không thể gọi Gemini verify-address từ SPX content script:', geminiErr)
  }
}

function schedulePostFillVerification(orderData: SpxOrderData, finalCod: number) {
  const { weightKg: targetWeightKg, quantity: targetQty } = resolveWeightKgAndQty(orderData)
  const parseNumericInput = (val: string): number => {
    const cleaned = (val || '').replace(/,/g, '.').replace(/[^0-9.]/g, '')
    if (!cleaned) return NaN
    const num = Number(cleaned)
    return Number.isFinite(num) ? num : NaN
  }

  const verifyPasses = [400, 800, 1400]
  verifyPasses.forEach((delayMs) => {
    setTimeout(async () => {
      const curCod = findCodField()
      if (curCod && finalCod > 0) {
        const curCodClean = (curCod.value || '').replace(/\D/g, '')
        if (!curCodClean || curCodClean === '0' || curCodClean !== String(finalCod)) {
          setAntDesignNumber(curCod, finalCod)
        }
      }

      try {
        const curCard = findSection4Card()
        const reInputs = findSection4Inputs(curCard)
        if (reInputs.priceInp && finalCod > 0) {
          const curPriceClean = (reInputs.priceInp.value || '').replace(/\D/g, '')
          if (!curPriceClean || curPriceClean === '0' || curPriceClean !== String(finalCod)) {
            setAntDesignNumber(reInputs.priceInp, finalCod)
          }
        }
        if (reInputs.weightInp) {
          const curWeight = parseNumericInput(reInputs.weightInp.value)
          if (!Number.isFinite(curWeight) || curWeight <= 0 || Math.abs(curWeight - targetWeightKg) > 0.001) {
            setAntDesignNumber(reInputs.weightInp, targetWeightKg)
          }
        }
        if (reInputs.qtyInp) {
          const curQty = parseNumericInput(reInputs.qtyInp.value)
          if (!Number.isFinite(curQty) || curQty <= 0 || Math.round(curQty) !== targetQty) {
            setAntDesignNumber(reInputs.qtyInp, targetQty)
          }
        }
        if (reInputs.goodsValInp && finalCod > 0) {
          const curGoodsClean = (reInputs.goodsValInp.value || '').replace(/\D/g, '')
          if (!curGoodsClean || curGoodsClean === '0' || curGoodsClean !== String(finalCod)) {
            console.log('[Bookstore AI] Phát hiện Giá trị bưu gửi bị SPX ghi đè sai, ép lại đúng COD:', finalCod)
            setAntDesignNumber(reInputs.goodsValInp, finalCod)
          }
        }
        if (reInputs.totalWeightInp) {
          const curTotalWeight = parseNumericInput(reInputs.totalWeightInp.value)
          if (
            !Number.isFinite(curTotalWeight) ||
            curTotalWeight <= 0 ||
            Math.abs(curTotalWeight - targetWeightKg) > 0.001
          ) {
            setAntDesignNumber(reInputs.totalWeightInp, targetWeightKg)
          }
        }
      } catch { }

      if (delayMs === 1400) {
        try {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
          }
          window.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }),
          )
        } catch { }
      }
    }, delayMs)
  })
}

export async function fillSpxOrderForm(orderData: SpxOrderData, attempt = 1) {
  if (window.top !== window.self) return
  console.log(`[Bookstore AI] Đang tự động điền form SPX (Lần thử ${attempt}/30)...`, orderData)

  if (isSpxLoginPage()) {
    console.warn('[Bookstore AI] Phát hiện trang đăng nhập SPX, dừng chuyển hướng để tránh lặp vô tận.')
    showSpxLoginRequiredBanner()
    return
  }

  const isSingleOrderPage = window.location.href.includes('single-order/create')
  if (!isSingleOrderPage) {
    if (!canRedirectToSingleOrder()) {
      console.warn('[Bookstore AI] Đã vượt quá số lần chuyển hướng tới single-order/create, tạm dừng để tránh lặp.')
      showSpxLoginRequiredBanner()
      return
    }
    console.log('[Bookstore AI] Chuyển hướng sang trang single-order/create...')
    window.location.href = 'https://spx.vn/spx-admin/single-order/create'
    return
  }

  const phoneField = findPhoneField()
  const nameField = findNameField(phoneField)
  const smartImportInput = findSmartImportInput()

  if (!phoneField && !nameField && !smartImportInput && attempt < 30) {
    await sleep(350)
    return fillSpxOrderForm(orderData, attempt + 1)
  }

  try {
    await enrichMissingGeoWithGemini(orderData)

    const addrInfo = parseAddressComponents(orderData)
    console.log('[Bookstore AI] Kết quả bóc tách địa chỉ:', addrInfo)

    await ensureAddressTypeRadio(addrInfo.addressType)
    await sleep(400)

    const filledFields: string[] = []
    const smartImportSuccess = await fillSmartImport(orderData, addrInfo)

    if (smartImportSuccess) {
      filledFields.push('Nhập tự động (SPX)')
      await selectAddressSuggestionIfPresent(addrInfo)
      try {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
      } catch { }
    } else {
      console.log('[Bookstore AI] Không dùng được Tự động điền, chuyển sang điền RPA thủ công...')
      await sleep(300)

      const cleanPhoneNoZero = (orderData.recipientPhone || '').trim().replace(/^(\+84|84|0)/, '')
      const curPhoneInput = findPhoneField()
      if (curPhoneInput && (!curPhoneInput.value || curPhoneInput.value.trim() === '') && cleanPhoneNoZero) {
        setInputValue(curPhoneInput, cleanPhoneNoZero)
        filledFields.push('Điện thoại')
      }

      const curNameInput = findNameField(curPhoneInput)
      if (curNameInput && (!curNameInput.value || curNameInput.value.trim() === '') && orderData.recipientName) {
        setInputValue(curNameInput, orderData.recipientName)
        filledFields.push('Tên người nhận')
      }

      const curDetailInput = findAddressDetailField()
      if (curDetailInput && (!curDetailInput.value || curDetailInput.value.trim() === '') && addrInfo.detailAddress) {
        setInputValue(curDetailInput, addrInfo.detailAddress)
        filledFields.push('Địa chỉ chi tiết')
      }

      const trigger = findCascaderTrigger()
      const triggerText = (trigger?.textContent || '').trim()
      if (!triggerText || triggerText.includes('Please Select') || triggerText.includes('Vui lòng chọn')) {
        await selectCascaderAddress(addrInfo.province, addrInfo.district, addrInfo.formattedWard || addrInfo.ward)
        filledFields.push('Cascader')
      }
    }

    let finalCod = Number(orderData.codAmount || 0)
    if (finalCod > 0 && finalCod < 1000) finalCod *= 1000

    const codInput = findCodField()
    if (codInput && finalCod > 0) {
      setAntDesignNumber(codInput, finalCod)
      filledFields.push('Tiền thu hộ COD')
    }

    const notesInput = findNotesField()
    if (notesInput && orderData.notes) {
      setInputValue(notesInput, orderData.notes)
      filledFields.push('Lưu ý người bán')
    }

    const { weightKg: targetWeightKg, quantity: targetQty } = resolveWeightKgAndQty(orderData)
    await fillSection4Goods(orderData)
    filledFields.push(`Hàng hóa & Khối lượng ${targetWeightKg}kg (x${targetQty})`)

    schedulePostFillVerification(orderData, finalCod)
    console.log('[Bookstore AI] Đã điền xong các trường:', filledFields)

    setTimeout(() => {
      chrome.runtime?.sendMessage?.(
        {
          action: 'CAPTURE_FILLED_SCREENSHOT',
          orderData,
          filledCount: filledFields.length,
        },
        (res) => {
          console.log('[Bookstore AI] Đã chụp ảnh màn hình xác nhận kết quả điền form:', res?.success)
        },
      )
    }, 700)

    chrome.storage?.local?.remove(['pendingSpxOrder'])
    document.getElementById('bookstore-ai-spx-waiting-banner')?.remove()
    showCompletedBanner(orderData, addrInfo.addressType, addrInfo)

    // Theo dõi sau khi nhân viên bấm Tạo đơn để tự bắt mã vận đơn SPX thật & đồng bộ về Web Quản Lý
    startSpxTrackingWatcher({
      orderCode: orderData.linkedOrderCode,
      recipientName: orderData.recipientName,
      recipientPhone: orderData.recipientPhone,
      createdAt: Date.now(),
    })
  } catch (err) {
    console.error('[Bookstore AI] Lỗi nghiêm trọng khi tự động điền form SPX:', err)
  }
}

function checkPendingOrder() {
  if (window.top !== window.self) return
  if (typeof chrome === 'undefined' || !chrome.storage) return

  if (isSpxLoginPage()) {
    chrome.storage.local.get(['pendingSpxOrder'], (res) => {
      const order = res?.pendingSpxOrder as SpxOrderData | undefined
      if (order?.recipientName && Date.now() - (order.createdAt || 0) < 10 * 60 * 1000) {
        showSpxLoginRequiredBanner()
      }
    })
    return
  }

  const currentPath = window.location.pathname
  const isHomeOrMass = currentPath === '/' || currentPath === '' || currentPath.includes('mass-order')
  if (isHomeOrMass && window.location.hostname.includes('spx.vn')) {
    chrome.storage.local.get(['pendingSpxOrder'], (res) => {
      const order = res?.pendingSpxOrder as SpxOrderData | undefined
      if (order?.recipientName && canRedirectToSingleOrder()) {
        console.log('[Bookstore AI] Chuyển hướng thẳng vào https://spx.vn/spx-admin/single-order/create...')
        window.location.href = 'https://spx.vn/spx-admin/single-order/create'
      }
    })
    return
  }

  chrome.storage.local.get(['pendingSpxOrder'], (res) => {
    const data = res?.pendingSpxOrder as SpxOrderData | undefined
    if (data && data.recipientName) {
      const age = Date.now() - (data.createdAt || 0)
      if (age < 10 * 60 * 1000) {
        setTimeout(() => {
          fillSpxOrderForm(data)
        }, 500)
      } else {
        chrome.storage.local.remove(['pendingSpxOrder'])
      }
    }
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    checkPendingOrder()
    attachSmartImportObserver()
    resumeSpxTrackingWatcherIfActive()
  })
} else {
  checkPendingOrder()
  attachSmartImportObserver()
  resumeSpxTrackingWatcherIfActive()
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (window.top !== window.self) return
  if (request.action === 'AUTO_FILL_SPX') {
    fillSpxOrderForm(request.orderData)
    sendResponse({ success: true })
    return true
  }

})
