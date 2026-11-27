import { describe, expect, it } from 'vitest'
import { extractVnPhone, mergeZaloScrollBatch } from '../zalo-dom'

describe('extractVnPhone', () => {
  it('trích xuất SĐT 10 chữ số chuẩn', () => {
    expect(extractVnPhone('SĐT của mình là 0987654321 nhé shop')).toBe('0987654321')
  })

  it('hỗ trợ định dạng có dấu chấm, dấu gạch ngang, khoảng trắng', () => {
    expect(extractVnPhone('Liên hệ: 0912.345.678')).toBe('0912345678')
    expect(extractVnPhone('Số mới: 0868-123-456')).toBe('0868123456')
    expect(extractVnPhone('SĐT: 035 678 9012')).toBe('0356789012')
  })

  it('chuyển đổi tiền tố +84 và 84 về 0', () => {
    expect(extractVnPhone('Call +84 909 123 456')).toBe('0909123456')
    expect(extractVnPhone('84977112233')).toBe('0977112233')
  })

  it('xử lý ký tự zero-width và non-breaking space', () => {
    expect(extractVnPhone('0901\u200B234\u00A0567')).toBe('0901234567')
  })

  it('trả về chuỗi rỗng khi không có SĐT VN hợp lệ', () => {
    expect(extractVnPhone('')).toBe('')
    expect(extractVnPhone('Không có số điện thoại ở đây 12345')).toBe('')
    expect(extractVnPhone('0123456789')).toBe('')
  })
})

describe('mergeZaloScrollBatch', () => {
  it('giữ nguyên các tin nhắn lặp nội dung giống nhau (ví dụ "Ok" 2 lần) và chỉ khử chồng lấn ở biên cuộn', () => {
    const ordered: Array<{ uniqueKey: string; sender: 'customer' | 'seller'; text: string }> = []
    const seen = new Set<string>()

    // Đợt ban đầu (cuối cuộc chat): có 2 tin "Ok" của khách với DOM node khác nhau
    mergeZaloScrollBatch(
      ordered,
      [
        { uniqueKey: 'dom:1', sender: 'seller', text: 'Bạn kiểm tra lại địa chỉ nhé' },
        { uniqueKey: 'dom:2', sender: 'customer', text: 'Ok' },
        { uniqueKey: 'dom:3', sender: 'customer', text: 'Ok' },
      ],
      false,
      seen,
    )

    // Đợt cuộn ngược lên: lấy lại tin cũ hơn + 1 tin giao nhau ("Bạn kiểm tra lại địa chỉ nhé")
    mergeZaloScrollBatch(
      ordered,
      [
        { uniqueKey: 'dom:4', sender: 'customer', text: 'Ok' },
        { uniqueKey: 'dom:5', sender: 'seller', text: 'Bạn kiểm tra lại địa chỉ nhé' },
      ],
      true,
      seen,
    )

    expect(ordered.map((m) => `${m.sender}:${m.text}`)).toEqual([
      'customer:Ok',
      'seller:Bạn kiểm tra lại địa chỉ nhé',
      'customer:Ok',
      'customer:Ok',
    ])
  })
})
