import { useEffect, useState } from 'react'
import {
  BookOpen,
  MessageSquare,
  PackageCheck,
  Settings,
  Truck,
} from 'lucide-react'
import type {
  AddressVerificationResult,
  AnalyzedData,
  ChatMessage,
  OrderDraft,
  ShippingCarrier,
  SpxAddressAlert,
  TrackingResult,
} from '../types/assistant'
import { buildOrderDraftFromAnalysis, formatCleanCustomerAddress } from '../utils/address-format'
import {
  unwrapAnalyzeChatResponse,
  unwrapCreateOrderResponse,
  unwrapResponseEnvelope,
  unwrapTrackSpxResponse,
  unwrapVerifyAddressResponse,
} from '../utils/api-unwrap'
import {
  buildAssistantHeaders,
  ensureHostPermission,
  fetchWithFallback,
  getExtensionAuthCredentials,
  saveExtensionAuthCredentials,
} from '../utils/auth-headers'
import {
  inferProvinceFromAddressText,
  isWardDistrictDuplicate,
} from '../utils/spx-address'
import {
  extractVnPhone,
  extractZaloFromDom,
  insertZaloChatTextInDom,
} from '../utils/zalo-dom'
import { ChatTab } from './components/ChatTab'
import { OrderTab } from './components/OrderTab'
import { SettingsPanel } from './components/SettingsPanel'
import { TrackingTab } from './components/TrackingTab'

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'order' | 'tracking'>('chat')
  const [backendUrl, setBackendUrlState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bookstore_backend_url') || 'https://api.zymail.site'
    }
    return 'https://api.zymail.site'
  })

  const [webAppUrl, setWebAppUrlState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bookstore_webapp_url') || 'http://localhost:5173'
    }
    return 'http://localhost:5173'
  })

  const setBackendUrl = (url: string) => {
    setBackendUrlState(url)
    if (typeof window !== 'undefined') {
      localStorage.setItem('bookstore_backend_url', url)
    }
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ backendUrl: url })
    }
  }

  const setWebAppUrl = (url: string) => {
    setWebAppUrlState(url)
    if (typeof window !== 'undefined') {
      localStorage.setItem('bookstore_webapp_url', url)
    }
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ webAppUrl: url })
    }
  }

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['backendUrl', 'webAppUrl'], (result: Record<string, any>) => {
        if (result?.backendUrl && typeof result.backendUrl === 'string') {
          setBackendUrlState(result.backendUrl)
        }
        if (result?.webAppUrl && typeof result.webAppUrl === 'string') {
          setWebAppUrlState(result.webAppUrl)
        }
      })
    }
  }, [])

  const [showSettings, setShowSettings] = useState(false)
  const [authToken, setAuthToken] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [assistantApiKey, setAssistantApiKey] = useState('')

  useEffect(() => {
    void getExtensionAuthCredentials().then((creds) => {
      setAuthToken(creds.authToken)
      setUserEmail(creds.userEmail)
      setAssistantApiKey(creds.assistantApiKey)
    })
  }, [])

  const handleSaveBackendUrl = async (url: string) => {
    if (!url) return
    setBackendUrl(url)
    await ensureHostPermission(url)
  }

  const handleLogin = async (email: string, password: string) => {
    try {
      const baseUrl = backendUrl.replace(/\/+$/, '')
      await ensureHostPermission(baseUrl)

      const loginBody = JSON.stringify({ email, password })
      const res = await fetchWithFallback(
        [`${baseUrl}/api/v1/auth/login`, `${baseUrl}/auth/login`],
        () => ({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: loginBody,
        }),
      )

      if (!res) {
        return { ok: false, error: `Không kết nối được tới ${baseUrl}` }
      }

      const json = await res.json().catch(() => null)
      const inner = unwrapResponseEnvelope<Record<string, any>>(json)
      const accessToken = inner?.token?.accessToken || inner?.accessToken
      if (res.ok && accessToken) {
        await saveExtensionAuthCredentials({ authToken: accessToken, userEmail: email })
        setAuthToken(accessToken)
        setUserEmail(email)
        return { ok: true }
      }
      return { ok: false, error: json?.message || 'Sai thông tin đăng nhập.' }
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Lỗi đăng nhập' }
    }
  }

  const handleLogout = async () => {
    await saveExtensionAuthCredentials({ authToken: '', userEmail: '' })
    setAuthToken('')
    setUserEmail('')
  }

  const handleSaveApiKey = async (key: string) => {
    await saveExtensionAuthCredentials({ assistantApiKey: key })
    setAssistantApiKey(key)
  }

  // Chat input & analysis state
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
  const [orderDraft, setOrderDraft] = useState<OrderDraft>({
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
    addressType: 'OLD_3_LEVEL',
  })
  const [shippingCarrier, setShippingCarrier] = useState<ShippingCarrier>('SPX')
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [createdOrderCode, setCreatedOrderCode] = useState<string | null>(null)
  const [spxTrackingCode, setSpxTrackingCode] = useState<string | null>(null)
  const [addressVerification, setAddressVerification] = useState<AddressVerificationResult | null>(null)
  const [isVerifyingAddress, setIsVerifyingAddress] = useState(false)

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
      (activeCustomerAddress.trim() || orderDraft.address.trim()),
  )

  // Tracking tab state
  const [trackingInput, setTrackingInput] = useState('')
  const [isTracking, setIsTracking] = useState(false)
  const [trackingResult, setTrackingResult] = useState<TrackingResult | null>(null)

  // SPX Automation Screenshot & Verification State
  const [spxScreenshot, setSpxScreenshot] = useState<string | null>(null)
  const [spxFilledData, setSpxFilledData] = useState<Record<string, any> | null>(null)
  const [spxScreenshotTime, setSpxScreenshotTime] = useState<number | null>(null)
  const [spxAddressAlert, setSpxAddressAlert] = useState<SpxAddressAlert | null>(null)

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(
        [
          'lastSpxScreenshot',
          'lastSpxOrderData',
          'lastSpxScreenshotTime',
          'lastSpxAddressAlert',
          'lastCapturedSpxTracking',
        ],
        (res) => {
          if (res?.lastSpxScreenshot) {
            setSpxScreenshot(res.lastSpxScreenshot as string)
            setSpxFilledData((res.lastSpxOrderData as Record<string, any>) || null)
            setSpxScreenshotTime(res.lastSpxScreenshotTime ? Number(res.lastSpxScreenshotTime) : null)
          }
          if (res?.lastSpxAddressAlert) {
            setSpxAddressAlert(res.lastSpxAddressAlert as SpxAddressAlert)
          }
          const captured = res?.lastCapturedSpxTracking as
            | { trackingCode?: string; orderCode?: string; capturedAt?: number }
            | undefined
          if (
            captured?.trackingCode &&
            Date.now() - Number(captured.capturedAt || 0) < 30 * 60 * 1000
          ) {
            setSpxTrackingCode(captured.trackingCode)
            setTrackingInput(captured.trackingCode)
          }
        },
      )

      const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
        if (area === 'local') {
          if (changes.lastSpxScreenshot) {
            setSpxScreenshot((changes.lastSpxScreenshot.newValue as string) || null)
          }
          if (changes.lastSpxOrderData) {
            setSpxFilledData((changes.lastSpxOrderData.newValue as Record<string, any>) || null)
          }
          if (changes.lastSpxScreenshotTime) {
            setSpxScreenshotTime(
              changes.lastSpxScreenshotTime.newValue ? Number(changes.lastSpxScreenshotTime.newValue) : null,
            )
          }
          if (changes.lastSpxAddressAlert) {
            setSpxAddressAlert((changes.lastSpxAddressAlert.newValue as SpxAddressAlert) || null)
          }
          if (changes.lastCapturedSpxTracking?.newValue) {
            const captured = changes.lastCapturedSpxTracking.newValue as {
              trackingCode?: string
              orderCode?: string
              synced?: boolean
            }
            if (captured.trackingCode) {
              setSpxTrackingCode(captured.trackingCode)
              setTrackingInput(captured.trackingCode)
            }
          }
        }
      }
      chrome.storage.onChanged.addListener(listener)
      return () => chrome.storage.onChanged.removeListener(listener)
    }
  }, [])

  // Trích xuất tin nhắn từ Tab Zalo Web đang mở
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

      const isZalo = tab.url?.includes('chat.zalo.me') || tab.url?.includes('web.zalo.me')
      if (!isZalo) {
        alert('Vui lòng mở tab Zalo Web (chat.zalo.me hoặc web.zalo.me) trước khi bấm lấy tin!')
        return
      }

      let extractedData: {
        customerName?: string
        customerPhone?: string
        messages: Array<{ sender: string; text: string }>
      } | null = null

      if (chrome.scripting && chrome.scripting.executeScript) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: extractZaloFromDom,
            args: [scrollUp],
          })
          if (results && results[0]?.result?.messages?.length) {
            extractedData = results[0].result
          }
        } catch (scriptErr) {
          console.warn('Script injection attempt failed, falling back to sendMessage:', scriptErr)
        }
      }

      if (!extractedData?.messages?.length && tab.id !== undefined) {
        extractedData = await new Promise((resolve) => {
          chrome.tabs.sendMessage(
            tab.id as number,
            { action: 'EXTRACT_ZALO_CHAT', scrollUp },
            (res: any) => {
              if (chrome.runtime.lastError || !res?.data?.messages?.length) {
                resolve(null)
              } else {
                resolve(res.data)
              }
            },
          )
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
        .map((m) => `[${m.sender === 'customer' ? 'Khách hàng' : 'Người bán'}]: ${m.text}`)
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
      let activeName = customerZaloName || orderDraft.customerName
      let activePhone = customerZaloPhone || orderDraft.phone

      if (!activePhone) {
        activePhone = extractVnPhone(rawChatText)
        if (activePhone) {
          setCustomerZaloPhone(activePhone)
        }
      }

      const cardNameInText = rawChatText.match(/\[Chia sẻ danh thiếp\]:\s*([^-]+?)\s*-\s*SĐT:/i)
      if (cardNameInText && !activeName) {
        activeName = cardNameInText[1].trim()
        setCustomerZaloName(activeName)
      }

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
      await ensureHostPermission(baseUrl)
      const headers = await buildAssistantHeaders()

      const reqPayload = JSON.stringify({
        messages,
        customerName: activeName || undefined,
        customerPhone: activePhone || undefined,
      })

      const res = await fetchWithFallback(
        [`${baseUrl}/api/assistant/analyze-chat`, `${baseUrl}/api/v1/assistant/analyze-chat`],
        () => ({ method: 'POST', headers, body: reqPayload }),
      )

      if (!res) {
        throw new Error(`Không thể kết nối đến máy chủ tại ${baseUrl}. Vui lòng kiểm tra backend đã chạy chưa.`)
      }

      if (res.status === 401) {
        setShowSettings(true)
        alert('Chưa xác thực hoặc hết phiên (401). Vui lòng đăng nhập hoặc nhập API Key trong mục Cài đặt ⚙!')
        return
      }

      const json = await res.json().catch(() => null)
      if (!json) {
        throw new Error(`Máy chủ trả về phản hồi không hợp lệ (HTTP ${res.status}).`)
      }

      const parsed = unwrapAnalyzeChatResponse(json, res.ok)
      if (parsed.ok && parsed.data) {
        const resultData = parsed.data
        if (!resultData.customer) {
          resultData.customer = {}
        }

        const invalidNames = [
          'thêm',
          'thêm tin cũ',
          'khách',
          'khách hàng',
          'người bán',
          'shop',
          'chưa có',
          'null',
          'undefined',
          'bạn',
        ]
        const currentParsedName = (resultData.customer.customerName || '').trim()
        if (
          (!currentParsedName || invalidNames.includes(currentParsedName.toLowerCase())) &&
          activeName &&
          !invalidNames.includes(activeName.trim().toLowerCase())
        ) {
          resultData.customer.customerName = activeName
        }

        if (
          (!resultData.customer.phone ||
            resultData.customer.phone === '(Chưa có)' ||
            resultData.customer.phone === 'null') &&
          activePhone
        ) {
          resultData.customer.phone = activePhone
        }

        if (Array.isArray(resultData.missingFields)) {
          if (resultData.customer.customerName) {
            resultData.missingFields = resultData.missingFields.filter((f) => f !== 'customerName')
          }
          if (resultData.customer.phone) {
            resultData.missingFields = resultData.missingFields.filter((f) => f !== 'phone')
          }
        }

        if (
          !resultData.customer.province ||
          resultData.customer.province === 'null' ||
          resultData.customer.province.includes('Chưa có')
        ) {
          const inferred = inferProvinceFromAddressText(
            `${resultData.customer.district || ''} ${resultData.customer.ward || ''} ${resultData.customer.detailAddress || ''} ${resultData.customer.rawAddress || ''} ${rawChatText}`,
          )
          if (inferred) {
            resultData.customer.province = inferred
          }
        }
        if (resultData.customer.province && Array.isArray(resultData.missingFields)) {
          resultData.missingFields = resultData.missingFields.filter((f) => f !== 'province')
        }

        const hasItems = resultData.items && resultData.items.length > 0
        const hasPhone = Boolean(resultData.customer?.phone)
        const hasAddress = Boolean(
          resultData.customer?.detailAddress || resultData.customer?.rawAddress || orderDraft.address,
        )
        if (hasItems && hasPhone && hasAddress && resultData.missingFields.length === 0) {
          resultData.isReadyToCreateOrder = true
        }

        if (isWardDistrictDuplicate(resultData.customer?.ward || '', resultData.customer?.district || '')) {
          resultData.customer.district = ''
          resultData.customer.addressType = 'NEW_2_LEVEL'
        }

        setAnalyzedData(resultData)
        setOrderDraft((prev) =>
          buildOrderDraftFromAnalysis(resultData, prev, rawChatText, activeName, activePhone),
        )

        if (resultData.customer?.verification) {
          setAddressVerification(resultData.customer.verification)
        } else {
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
            const c = resultData.customer || {}
            const isOld = c.addressType === 'OLD_3_LEVEL'
            setAddressVerification({
              address: autoAddr.trim(),
              isValid: Boolean(c.province && (c.ward || c.district)),
              isExisting: true,
              province: c.province || '',
              district: c.district || '',
              ward: c.ward || '',
              detailAddress: c.detailAddress || '',
              addressType: c.addressType || (c.district ? 'OLD_3_LEVEL' : 'NEW_2_LEVEL'),
              spxRecommendation: {
                mode: c.addressType || (c.district ? 'OLD_3_LEVEL' : 'NEW_2_LEVEL'),
                modeText: isOld
                  ? 'Địa chỉ CŨ (3 cấp: Tỉnh - Huyện - Xã)'
                  : 'Địa chỉ MỚI (2 cấp: Tỉnh - Xã)',
                levels: isOld
                  ? [c.province, c.district, c.ward].filter(Boolean) as string[]
                  : [c.province, c.ward].filter(Boolean) as string[],
                reason: isOld
                  ? 'Địa chỉ có Quận/Huyện theo chuẩn 3 cấp'
                  : 'Địa chỉ áp dụng mô hình 2 cấp Tỉnh - Xã',
              },
              overviewAi: `Địa chỉ đã được AI phân tích: ${autoAddr.trim()}`,
              bulletPoints: [
                `Tỉnh/Thành phố: ${c.province || 'Chưa rõ'}`,
                c.district
                  ? `Quận/Huyện: ${c.district}`
                  : 'Không yêu cầu Quận/Huyện (mô hình 2 cấp)',
                `Phường/Xã: ${c.ward || 'Chưa rõ'}`,
              ],
            })
          }
        }
      } else {
        alert(`Phân tích thất bại: ${parsed.errorMessage}`)
      }
    } catch (err: any) {
      alert(`Không thể phân tích: ${err?.message || err}. Kiểm tra xem backend đã chạy ở ${backendUrl} chưa.`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleCopyReply = (customText?: string) => {
    const textToCopy = customText || analyzedData?.suggestedReply
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy)
      setCopiedReply(true)
      setTimeout(() => setCopiedReply(false), 2500)
    }
  }

  const handleSendToChatBox = async (customText?: string) => {
    const textToSend = customText || analyzedData?.suggestedReply
    if (!textToSend) return

    try {
      await navigator.clipboard.writeText(textToSend)
    } catch { }

    let inserted = false
    try {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tab?.id) {
          inserted = await new Promise<boolean>((resolve) => {
            chrome.tabs.sendMessage(
              tab.id as number,
              { action: 'INSERT_ZALO_CHAT_TEXT', text: textToSend },
              async (res) => {
                if (!chrome.runtime.lastError && res?.success) {
                  resolve(true)
                  return
                }
                if (chrome.scripting?.executeScript && tab.id) {
                  try {
                    const results = await chrome.scripting.executeScript({
                      target: { tabId: tab.id },
                      func: insertZaloChatTextInDom,
                      args: [textToSend],
                    })
                    resolve(Boolean(results?.[0]?.result))
                    return
                  } catch (e) {
                    console.warn('executeScript insert failed:', e)
                  }
                }
                resolve(false)
              },
            )
          })
        }
      }
      if (inserted) {
        setSentToZalo(true)
        setTimeout(() => setSentToZalo(false), 2500)
      }
      setCopiedReply(true)
      setTimeout(() => setCopiedReply(false), 2500)
    } catch (e) {
      console.warn('handleSendToChatBox err:', e)
    }
  }

  const handleFastCreateOrderAndSpx = async (targetCarrier: ShippingCarrier = 'SPX') => {
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
      await ensureHostPermission(baseUrl)
      const headers = await buildAssistantHeaders()

      const currentTracking = spxTrackingCode || undefined
      let currentCarrierName = 'Shopee Xpress (SPX)'
      if (targetCarrier === 'GHN') {
        currentCarrierName = 'Giao Hàng Nhanh (GHN)'
      } else if (targetCarrier === 'MANUAL') {
        currentCarrierName = 'Tự giao / Lấy tại shop'
      }

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
        trackingCode: currentTracking,
        note:
          orderDraft.notes ||
          `Tạo 1-Chạm từ Bookstore AI Extension (Zalo: ${customerZaloName || custName})`,
        status: 'PENDING',
        payment: 'UNPAID',
      }

      const orderBody = JSON.stringify(orderPayload)
      const res = await fetchWithFallback(
        [`${baseUrl}/api/assistant/create-order`, `${baseUrl}/api/v1/assistant/create-order`],
        () => ({ method: 'POST', headers, body: orderBody }),
      )

      if (!res) {
        throw new Error(`Không thể kết nối đến Backend tại ${baseUrl}. Vui lòng kiểm tra server.`)
      }

      if (res.status === 401) {
        setShowSettings(true)
        alert('Chưa xác thực hoặc hết phiên (401). Vui lòng đăng nhập hoặc nhập API Key trong mục Cài đặt ⚙!')
        return
      }

      const json = await res.json().catch(() => null)
      const created = unwrapCreateOrderResponse(json)

      if (res.ok && created.orderCode) {
        setCreatedOrderCode(created.orderCode)
        setSpxTrackingCode(created.trackingCode || null)
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          chrome.storage.local.set({
            lastCreatedOrder: { orderCode: created.orderCode, createdAt: Date.now() },
          })
        }

        let autoMsg = `Dạ shop đã lên đơn thành công cho bạn rồi ạ!\n• Mã đơn: ${created.orderCode}`
        if (currentTracking) {
          autoMsg += `\n• Mã vận đơn ${targetCarrier === 'SPX' ? 'SPX' : 'vận chuyển'}: ${currentTracking}`
        }
        autoMsg += `\nShop sẽ đóng gói gửi sớm, bạn để ý điện thoại nhận hàng giúp shop nhé!`

        setAnalyzedData((prev) => (prev ? { ...prev, suggestedReply: autoMsg } : null))

        try {
          await navigator.clipboard.writeText(autoMsg)
          setCopiedReply(true)
          setTimeout(() => setCopiedReply(false), 3000)
        } catch { }
      } else {
        alert(`Tạo đơn thất bại: ${created.errorMessage}`)
      }
    } catch (err: any) {
      alert(`Lỗi tạo đơn: ${err?.message || err}`)
    } finally {
      setIsCreatingOrder(false)
    }
  }

  const handleVerifyAddressWithAi = async (
    customAddr?: string,
  ): Promise<AddressVerificationResult | null> => {
    const raw = (customAddr || orderDraft.address || activeCustomerAddress).trim()
    if (!raw) {
      if (!customAddr) alert('Vui lòng nhập địa chỉ trước khi thẩm định!')
      return null
    }

    setIsVerifyingAddress(true)
    try {
      const baseUrl = backendUrl.replace(/\/+$/, '')
      await ensureHostPermission(baseUrl)
      const headers = await buildAssistantHeaders()
      const verifyBody = JSON.stringify({ address: raw })
      const res = await fetchWithFallback(
        [`${baseUrl}/api/assistant/verify-address`, `${baseUrl}/api/v1/assistant/verify-address`],
        () => ({ method: 'POST', headers, body: verifyBody }),
      )

      if (res && res.ok) {
        const json = await res.json().catch(() => null)
        const data = unwrapVerifyAddressResponse(json)
        if (data) {
          setAddressVerification(data)
          setOrderDraft((prev) => {
            const chosenType =
              prev.addressType === 'NEW_2_LEVEL'
                ? 'NEW_2_LEVEL'
                : data.spxRecommendation?.mode || (data.district ? 'OLD_3_LEVEL' : 'NEW_2_LEVEL')

            return {
              ...prev,
              province: data.province || prev.province,
              district: chosenType === 'NEW_2_LEVEL' ? '' : data.district || prev.district,
              ward: data.ward || prev.ward,
              detailAddress: data.detailAddress || prev.detailAddress,
              addressType: chosenType,
            }
          })
          return data
        }
      }
      return null
    } catch (err) {
      console.warn('handleVerifyAddressWithAi error:', err)
      return null
    } finally {
      setIsVerifyingAddress(false)
    }
  }

  const handleRpaFillSpxOrder = async () => {
    const custName = activeCustomerName.trim()
    let custPhone = activeCustomerPhone.trim()
    const custAddress = activeCustomerAddress.trim()

    if (!custPhone && rawChatText) {
      const phoneMatch = rawChatText.match(
        /(?:0|\+84)(?:3[2-9]|5[6|8|9]|7[0|6-9]|8[1-9]|9[0-9])[0-9]{7}/,
      )
      if (phoneMatch) {
        custPhone = phoneMatch[0]
      }
    }

    const isMissingGeo =
      !orderDraft.province ||
      (!orderDraft.district && orderDraft.addressType === 'OLD_3_LEVEL')

    let verifiedAiData: AddressVerificationResult | null = null
    if (isMissingGeo && custAddress && custAddress.length >= 4) {
      verifiedAiData = await handleVerifyAddressWithAi(custAddress)
    }

    const addrLower = (custAddress || '').toLowerCase()
    const detectedType =
      verifiedAiData?.addressType ||
      orderDraft.addressType ||
      analyzedData?.customer?.addressType ||
      (addrLower.includes('quận') ||
      addrLower.includes('huyện') ||
      addrLower.includes('thị xã') ||
      addrLower.includes('q.') ||
      addrLower.includes('h.') ||
      orderDraft.district
        ? 'OLD_3_LEVEL'
        : 'NEW_2_LEVEL')

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

    const combinedProductTitle =
      parsedItems.length > 1
        ? parsedItems.map((it) => `${it.title}${it.quantity > 1 ? ` (x${it.quantity})` : ''}`).join(' + ')
        : primaryItem?.title || 'Sách theo yêu cầu'

    const totalItemQty = parsedItems.reduce((sum, it) => sum + (it.quantity || 1), 0)

    const sendWard = (verifiedAiData?.ward || orderDraft.ward || analyzedData?.customer?.ward || '').trim()
    let sendDistrict = (
      verifiedAiData?.district ||
      orderDraft.district ||
      analyzedData?.customer?.district ||
      ''
    ).trim()

    if (detectedType === 'NEW_2_LEVEL') {
      sendDistrict = ''
    }

    const weightGram = Number(orderDraft.weightGram) > 0 ? Number(orderDraft.weightGram) : 1000
    const weightKg = Math.max(0.1, Math.round((weightGram / 1000) * 100) / 100)

    const orderData = {
      recipientName: custName || customerZaloName || 'Khách hàng',
      recipientPhone: custPhone || '',
      address: custAddress || '',
      province:
        verifiedAiData?.province || orderDraft.province || analyzedData?.customer?.province || '',
      district: sendDistrict,
      ward: sendWard,
      detailAddress:
        verifiedAiData?.detailAddress ||
        orderDraft.detailAddress ||
        analyzedData?.customer?.detailAddress ||
        '',
      addressType: detectedType,
      codAmount: currentCod,
      weightGram,
      weightKg,
      notes: orderDraft.notes || `Bookstore AI (Khách: ${customerZaloName || custName || 'Khách hàng'})`,
      items: parsedItems,
      productName: combinedProductTitle,
      quantity: totalItemQty || 1,
      productPrice: currentCod > 0 ? currentCod : primaryItem.price,
      linkedOrderCode: createdOrderCode || undefined,
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

  const handleTrackSpx = async () => {
    const code = trackingInput.trim().toUpperCase()
    if (!code) return
    setIsTracking(true)
    try {
      const baseUrl = backendUrl.replace(/\/+$/, '')
      await ensureHostPermission(baseUrl)
      const headers = await buildAssistantHeaders()
      const res = await fetchWithFallback(
        [
          `${baseUrl}/api/v1/shipping/spx/track/${encodeURIComponent(code)}`,
          `${baseUrl}/api/assistant/track-spx/${encodeURIComponent(code)}`,
        ],
        () => ({ headers }),
      )

      if (res && res.ok) {
        const json = await res.json().catch(() => null)
        const data = unwrapTrackSpxResponse(json)
        if (data) {
          setTrackingResult({
            trackingCode: data.trackingCode || code,
            carrierUrl:
              data.carrierUrl || `https://spx.vn/track?tracking_number=${encodeURIComponent(code)}`,
            status: data.status || 'IN_TRANSIT',
            statusText: data.statusText || 'Đang xử lý',
            source: data.source,
            order: data.order,
            checkpoints: (data.checkpoints || []).map((cp: any) => ({
              time: cp.timeFormatted || cp.time || 'Vừa xong',
              desc: cp.description || cp.status || '',
              location: cp.location,
            })),
          })
          return
        }
      }

      setTrackingResult({
        trackingCode: code,
        carrierUrl: `https://spx.vn/track?tracking_number=${encodeURIComponent(code)}`,
        status: 'UNKNOWN',
        statusText: 'Chưa lấy được từ máy chủ',
        source: 'DIRECT_LINK',
        checkpoints: [
          {
            time: 'Gợi ý',
            desc: `Không lấy được dữ liệu từ máy chủ cho mã ${code}. Bạn có thể bấm "Xem trực tiếp trên spx.vn" bên dưới.`,
          },
        ],
      })
    } catch (err) {
      console.error('Lỗi khi tra cứu SPX:', err)
      setTrackingResult({
        trackingCode: code,
        carrierUrl: `https://spx.vn/track?tracking_number=${encodeURIComponent(code)}`,
        status: 'UNKNOWN',
        statusText: 'Chưa có thông tin vận đơn',
        checkpoints: [
          {
            time: 'Thông báo',
            desc: 'Không thể kết nối đến máy chủ tra cứu hoặc chưa tìm thấy vận đơn.',
          },
        ],
      })
    } finally {
      setIsTracking(false)
    }
  }

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-800 select-none">
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

      {showSettings && (
        <SettingsPanel
          backendUrl={backendUrl}
          onSaveBackendUrl={handleSaveBackendUrl}
          webAppUrl={webAppUrl}
          onChangeWebAppUrl={setWebAppUrl}
          userEmail={userEmail}
          authToken={authToken}
          assistantApiKey={assistantApiKey}
          onSaveApiKey={handleSaveApiKey}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
      )}

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

      <main className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'chat' && (
          <ChatTab
            rawChatText={rawChatText}
            setRawChatText={setRawChatText}
            extractStatus={extractStatus}
            setExtractStatus={setExtractStatus}
            spxAddressAlert={spxAddressAlert}
            onDismissAlert={() => setSpxAddressAlert(null)}
            isExtracting={isExtracting}
            isAnalyzing={isAnalyzing}
            onExtract={handleExtractFromTab}
            onAnalyze={handleAnalyzeChat}
            analyzedData={analyzedData}
            customerZaloName={customerZaloName}
            customerZaloPhone={customerZaloPhone}
            orderDraft={orderDraft}
            setOrderDraft={setOrderDraft}
            isVerifyingAddress={isVerifyingAddress}
            addressVerification={addressVerification}
            onVerifyAddress={() => {
              void handleVerifyAddressWithAi()
            }}
            copiedReply={copiedReply}
            sentToZalo={sentToZalo}
            onSendToChatBox={(text) => {
              void handleSendToChatBox(text)
            }}
            onCopyReply={handleCopyReply}
            createdOrderCode={createdOrderCode}
            spxTrackingCode={spxTrackingCode}
            webAppUrl={webAppUrl}
            isInfoComplete={isInfoComplete}
            isCreatingOrder={isCreatingOrder}
            onFastCreateOrder={(carrier) => {
              void handleFastCreateOrderAndSpx(carrier)
            }}
            onRpaFillSpx={() => {
              void handleRpaFillSpxOrder()
            }}
            onGoToOrderTab={() => setActiveTab('order')}
            onGoToTracking={(code) => {
              setTrackingInput(code)
              setActiveTab('tracking')
            }}
          />
        )}

        {activeTab === 'order' && (
          <OrderTab
            spxAddressAlert={spxAddressAlert}
            onDismissAlert={() => setSpxAddressAlert(null)}
            orderDraft={orderDraft}
            setOrderDraft={setOrderDraft}
            isVerifyingAddress={isVerifyingAddress}
            onVerifyAddress={() => {
              void handleVerifyAddressWithAi()
            }}
            shippingCarrier={shippingCarrier}
            setShippingCarrier={setShippingCarrier}
            isCreatingOrder={isCreatingOrder}
            onCreateOrder={(carrier) => {
              void handleFastCreateOrderAndSpx(carrier)
            }}
            onRpaFillSpx={() => {
              void handleRpaFillSpxOrder()
            }}
            spxScreenshot={spxScreenshot}
            spxFilledData={spxFilledData}
            spxScreenshotTime={spxScreenshotTime}
            activeCustomerName={activeCustomerName}
            activeCustomerPhone={activeCustomerPhone}
            createdOrderCode={createdOrderCode}
            spxTrackingCode={spxTrackingCode}
            webAppUrl={webAppUrl}
          />
        )}

        {activeTab === 'tracking' && (
          <TrackingTab
            trackingInput={trackingInput}
            setTrackingInput={setTrackingInput}
            isTracking={isTracking}
            trackingResult={trackingResult}
            onTrack={() => {
              void handleTrackSpx()
            }}
          />
        )}
      </main>
    </div>
  )
}
