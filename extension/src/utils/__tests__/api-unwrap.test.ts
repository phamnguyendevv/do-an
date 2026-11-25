import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildOrderDraftFromAnalysis, formatCleanCustomerAddress } from '../address-format'
import {
  unwrapAnalyzeChatResponse,
  unwrapCreateOrderResponse,
  unwrapResponseEnvelope,
  unwrapTrackSpxResponse,
  unwrapVerifyAddressResponse,
} from '../api-unwrap'
import { fetchWithFallback } from '../auth-headers'

describe('API Response Unwrap Helpers', () => {
  it('unwrapResponseEnvelope xử lý cả payload bọc ResponseInterceptor và payload trần', () => {
    expect(unwrapResponseEnvelope({ data: { foo: 'bar' }, isArray: false })).toEqual({ foo: 'bar' })
    expect(unwrapResponseEnvelope({ foo: 'bar' })).toEqual({ foo: 'bar' })
    expect(unwrapResponseEnvelope(null)).toBeNull()
  })

  it('unwrapVerifyAddressResponse unwrap đúng 2 tầng ResponseInterceptor -> AssistantController', () => {
    const wrapped = {
      data: {
        success: true,
        data: {
          address: '15 Nguyễn Khang, Hà Nội',
          isValid: true,
          isExisting: true,
          province: 'Hà Nội',
          district: 'Cầu Giấy',
          ward: 'Yên Hòa',
          detailAddress: '15 Nguyễn Khang',
          addressType: 'OLD_3_LEVEL',
          spxRecommendation: {
            mode: 'OLD_3_LEVEL',
            modeText: 'Địa chỉ CŨ (3 cấp)',
            levels: ['Hà Nội', 'Cầu Giấy', 'Yên Hòa'],
            reason: 'Đủ 3 cấp',
          },
          overviewAi: 'Địa chỉ hợp lệ',
          bulletPoints: [],
        },
      },
      path: '/api/assistant/verify-address',
    }

    const result = unwrapVerifyAddressResponse(wrapped)
    expect(result).not.toBeNull()
    expect(result?.province).toBe('Hà Nội')
    expect(result?.district).toBe('Cầu Giấy')
  })

  it('unwrapVerifyAddressResponse trả null khi backend báo success: false', () => {
    const failed = {
      data: {
        success: false,
        error: 'Address cannot be empty',
      },
    }
    expect(unwrapVerifyAddressResponse(failed)).toBeNull()
  })

  it('unwrapAnalyzeChatResponse xử lý đúng kết quả thành công và lỗi nhiều định dạng', () => {
    const okWrapped = {
      data: {
        success: true,
        data: {
          intent: 'ORDER_CONFIRMATION',
          intentConfidence: 0.95,
          summary: 'Khách chốt 1 cuốn HSK 5, tổng 205k',
          customer: { customerName: 'Nam', phone: '0987654321' },
          items: [{ bookId: '1', bookTitle: 'HSK 5', quantity: 1 }],
          missingFields: [],
          isReadyToCreateOrder: true,
          suggestedReply: 'Dạ vâng ạ',
        },
      },
    }

    const okRes = unwrapAnalyzeChatResponse(okWrapped, true)
    expect(okRes.ok).toBe(true)
    expect(okRes.data?.intent).toBe('ORDER_CONFIRMATION')

    const errArray = unwrapAnalyzeChatResponse({ message: ['Thiếu messages', 'Sai định dạng'] }, false)
    expect(errArray.ok).toBe(false)
    expect(errArray.errorMessage).toBe('Thiếu messages, Sai định dạng')
  })

  it('unwrapCreateOrderResponse trích xuất orderCode & trackingCode hoặc thông báo lỗi', () => {
    const created = unwrapCreateOrderResponse({
      data: {
        success: true,
        data: {
          orderCode: 'ORD-2026001',
          trackingCode: 'SPXVN0312345678',
        },
      },
    })
    expect(created.orderCode).toBe('ORD-2026001')
    expect(created.trackingCode).toBe('SPXVN0312345678')

    const failed = unwrapCreateOrderResponse({ message: 'Tồn kho không đủ' })
    expect(failed.orderCode).toBeUndefined()
    expect(failed.errorMessage).toBe('Tồn kho không đủ')
  })

  it('unwrapTrackSpxResponse unwrap đúng kết quả tracking từ SpxController', () => {
    const tracked = unwrapTrackSpxResponse({
      data: {
        success: true,
        trackingCode: 'SPXVN0312345678',
        status: 'DELIVERED',
        statusText: 'Giao hàng thành công',
        checkpoints: [],
      },
    })
    expect(tracked?.trackingCode).toBe('SPXVN0312345678')
    expect(tracked?.status).toBe('DELIVERED')
    expect(unwrapTrackSpxResponse({ foo: 'bar' })).toBeNull()
  })
})

describe('formatCleanCustomerAddress & buildOrderDraftFromAnalysis', () => {
  it('khử trùng lặp cấp hành chính và giữ nguyên thứ tự địa chỉ', () => {
    expect(
      formatCleanCustomerAddress('548/6 Nguyễn Thái Sơn', 'Phường An Nhơn', 'Quận Gò Vấp', 'Hồ Chí Minh'),
    ).toBe('548/6 Nguyễn Thái Sơn, Phường An Nhơn, Quận Gò Vấp, Hồ Chí Minh')

    expect(
      formatCleanCustomerAddress('KCN Hựu Thạnh', 'Xã Đức Hòa', 'Huyện Đức Hòa', 'Long An'),
    ).toBe('KCN Hựu Thạnh, Xã Đức Hòa, Long An')
  })

  it('buildOrderDraftFromAnalysis tự quy đổi COD "205k" từ summary và suy luận tỉnh Hà Nội', () => {
    const draft = buildOrderDraftFromAnalysis(
      {
        intent: 'ORDER_CONFIRMATION',
        intentConfidence: 0.9,
        summary: 'Khách chốt đơn, tổng thành 205k',
        customer: {
          detailAddress: '15 Nguyễn Khang',
          district: 'Cầu Giấy',
          ward: 'Yên Hòa',
        },
        items: [{ bookId: null, bookTitle: 'HSK 5', quantity: 1 }],
        missingFields: [],
        isReadyToCreateOrder: true,
        suggestedReply: '',
      },
      {
        customerName: '',
        phone: '',
        address: '',
        province: '',
        district: '',
        ward: '',
        detailAddress: '',
        codAmount: 0,
        weightGram: 500,
        notes: '',
        addressType: 'OLD_3_LEVEL',
      },
      '15 Nguyễn Khang, Cầu Giấy',
      'Minh',
      '0901234567',
    )

    expect(draft.customerName).toBe('Minh')
    expect(draft.phone).toBe('0901234567')
    expect(draft.province).toBe('Hà Nội')
    expect(draft.codAmount).toBe(205000)
    expect(draft.weightGram).toBe(500)
  })
})

describe('fetchWithFallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('tự chuyển sang URL fallback khi endpoint đầu lỗi mạng hoặc HTTP 404', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await fetchWithFallback(
      ['https://api.example.com/a', 'https://api.example.com/v1/a'],
      () => ({ method: 'GET' }),
    )

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(res?.status).toBe(200)
  })

  it('dừng ngay không thử fallback khi gặp HTTP 401', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await fetchWithFallback(
      ['https://api.example.com/a', 'https://api.example.com/v1/a'],
      () => ({ method: 'GET' }),
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(res?.status).toBe(401)
  })
})
