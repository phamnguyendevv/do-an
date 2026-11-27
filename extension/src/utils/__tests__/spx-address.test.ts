import { describe, expect, it } from 'vitest'
import { extractSpxTrackingCodeFromText } from '../../content/spx/tracking-sync'
import {
  checkCascaderAddressMatches,
  inferProvinceFromAddressText,
  isWardDistrictDuplicate,
  normalizeProvinceName,
  normalizeVnText,
  parseAddressComponents,
  resolveWeightKgAndQty,
  sanitizeCrossProvinceGeo,
  stripAdminPrefixes,
} from '../spx-address'

describe('normalizeVnText & stripAdminPrefixes & normalizeProvinceName', () => {
  it('chuẩn hóa chữ tiếng Việt có dấu thành không dấu chữ thường', () => {
    expect(normalizeVnText('Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh!')).toBe(
      'phuong ben nghe quan 1 tp ho chi minh',
    )
    expect(normalizeVnText('Đống Đa - Hà Nội')).toBe('dong da ha noi')
  })

  it('loại bỏ đúng các tiền tố hành chính', () => {
    expect(stripAdminPrefixes('Thành phố Hồ Chí Minh')).toBe('Hồ Chí Minh')
    expect(stripAdminPrefixes('Quận Gò Vấp')).toBe('Gò Vấp')
    expect(stripAdminPrefixes('Phường An Nhơn')).toBe('An Nhơn')
    expect(stripAdminPrefixes('tx. Bến Cát')).toBe('Bến Cát')
  })

  it('chuẩn hóa các biến thể tên tỉnh/thành phố lớn', () => {
    expect(normalizeProvinceName('TP.HCM')).toBe('Hồ Chí Minh')
    expect(normalizeProvinceName('Sài Gòn')).toBe('Hồ Chí Minh')
    expect(normalizeProvinceName('Thành phố Hà Nội')).toBe('Hà Nội')
    expect(normalizeProvinceName('Tỉnh Quảng Ngãi')).toBe('Quảng Ngãi')
  })

  it('nhận diện trùng ward/district, suy luận tỉnh HCM/HN và khử rò rỉ địa danh', () => {
    expect(isWardDistrictDuplicate('Xã Đức Hòa', 'Huyện Đức Hòa')).toBe(true)
    expect(isWardDistrictDuplicate('Phường 5', 'Quận Gò Vấp')).toBe(false)
    expect(inferProvinceFromAddressText('45 Lê Duẩn, q1')).toBe('Hồ Chí Minh')
    expect(inferProvinceFromAddressText('15 Nguyễn Khang, Cầu Giấy')).toBe('Hà Nội')
    expect(sanitizeCrossProvinceGeo('Quảng Ngãi', 'Quận Bình Tân', 'Phường Bình Trị Đông')).toEqual({
      district: '',
      ward: '',
    })
  })
})

describe('parseAddressComponents', () => {
  it('bóc tách chuẩn địa chỉ 3 cấp tại TP.HCM', () => {
    const parsed = parseAddressComponents({
      recipientName: 'Nguyễn Văn A',
      recipientPhone: '0901234567',
      address: '548/6 Nguyễn Thái Sơn, Phường 5, Quận Gò Vấp, TP.HCM',
      codAmount: 200000,
    })

    expect(parsed.addressType).toBe('OLD_3_LEVEL')
    expect(parsed.province).toBe('Hồ Chí Minh')
    expect(parsed.district).toBe('Quận Gò Vấp')
    expect(parsed.ward).toBe('Phường 5')
    expect(parsed.detailAddress).toBe('548/6 Nguyễn Thái Sơn')
  })

  it('bóc tách chuẩn địa chỉ 2 cấp (Tỉnh - Xã) khi không có Quận/Huyện', () => {
    const parsed = parseAddressComponents({
      recipientName: 'Trần Thị B',
      recipientPhone: '0912345678',
      address: '81A Trần Văn Trà, Xã Sơn Hà, Quảng Ngãi',
      codAmount: 150000,
      addressType: 'NEW_2_LEVEL',
    })

    expect(parsed.addressType).toBe('NEW_2_LEVEL')
    expect(parsed.province).toBe('Quảng Ngãi')
    expect(parsed.district).toBe('')
    expect(parsed.ward).toBe('Xã Sơn Hà')
    expect(parsed.detailAddress).toBe('81A Trần Văn Trà')
  })

  it('khử trùng lặp khi ward và district cùng tên (Đức Hòa)', () => {
    const parsed = parseAddressComponents({
      recipientName: 'Lê Văn C',
      recipientPhone: '0988777666',
      address: 'KCN Hựu Thạnh, Đức Hòa, Long An',
      province: 'Long An',
      district: 'Huyện Đức Hòa',
      ward: 'Xã Đức Hòa',
      codAmount: 100000,
    })

    expect(parsed.addressType).toBe('NEW_2_LEVEL')
    expect(parsed.district).toBe('')
    expect(parsed.ward).toBe('Xã Đức Hòa')
  })

  it('chống rò rỉ dữ liệu phường/quận TP.HCM lạc vào tỉnh khác', () => {
    const parsed = parseAddressComponents({
      recipientName: 'Phạm D',
      recipientPhone: '0933444555',
      address: '12 Quang Trung, Quảng Ngãi',
      province: 'Quảng Ngãi',
      district: 'Quận Bình Tân',
      ward: 'Phường Bình Trị Đông',
      codAmount: 120000,
    })

    expect(parsed.province).toBe('Quảng Ngãi')
    expect(parsed.district).toBe('')
  })

  it('format ward dạng số thành "Phường <số>" và nhận diện viết tắt q1', () => {
    const parsed = parseAddressComponents({
      recipientName: 'Test',
      recipientPhone: '0909000111',
      address: '45 Lê Duẩn, q1',
      ward: '5',
      codAmount: 50000,
    })

    expect(parsed.province).toBe('Hồ Chí Minh')
    expect(parsed.district).toBe('Quận 1')
    expect(parsed.formattedWard).toBe('Phường 5')
  })
})

describe('resolveWeightKgAndQty', () => {
  it('ưu tiên weightKg hợp lệ và quantity truyền vào', () => {
    expect(
      resolveWeightKgAndQty({
        recipientName: 'A',
        recipientPhone: '0901234567',
        address: 'HN',
        codAmount: 100000,
        weightKg: 1.5,
        weightGram: 800,
        quantity: 3,
      }),
    ).toEqual({ weightKg: 1.5, quantity: 3 })
  })

  it('quy đổi weightGram sang kg và tính tổng số lượng từ items', () => {
    expect(
      resolveWeightKgAndQty({
        recipientName: 'A',
        recipientPhone: '0901234567',
        address: 'HN',
        codAmount: 100000,
        weightGram: 500,
        items: [
          { title: 'Sách A', quantity: 2, price: 50000 },
          { title: 'Sách B', quantity: 1, price: 50000 },
        ],
      }),
    ).toEqual({ weightKg: 0.5, quantity: 3 })
  })

  it('fallback mặc định 1kg và 1 sản phẩm nếu thiếu', () => {
    expect(
      resolveWeightKgAndQty({
        recipientName: 'A',
        recipientPhone: '0901234567',
        address: 'HN',
        codAmount: 100000,
      }),
    ).toEqual({ weightKg: 1, quantity: 1 })
  })
})

describe('checkCascaderAddressMatches', () => {
  it('khớp địa chỉ 3 cấp khi Tỉnh, Huyện, Xã khớp', () => {
    const res = checkCascaderAddressMatches(
      'Hồ Chí Minh / Quận Gò Vấp / Phường An Nhơn',
      '548/6 Nguyễn Thái Sơn, An Nhơn, Gò Vấp, TP.HCM',
    )
    expect(res.isMatch).toBe(true)
  })

  it('khớp địa chỉ 2 cấp khi Tỉnh và Xã khớp', () => {
    const res = checkCascaderAddressMatches(
      'Quảng Ngãi / Xã Sơn Hà',
      '81A Trần Văn Trà, Sơn Hà, Quảng Ngãi',
    )
    expect(res.isMatch).toBe(true)
  })

  it('báo không khớp khi SPX hiển thị cảnh báo hoặc chưa chọn', () => {
    expect(checkCascaderAddressMatches('Please Select', 'Hà Nội').isMatch).toBe(false)
    expect(
      checkCascaderAddressMatches(
        'Hà Nội / Cầu Giấy / Dịch Vọng',
        '15 Nguyễn Khang, Cầu Giấy, Hà Nội',
        undefined,
        'Địa chỉ này có thể chưa được khớp chính xác',
      ).isMatch,
    ).toBe(false)
  })

  it('báo không khớp khi Tỉnh bị lệch', () => {
    const res = checkCascaderAddressMatches(
      'Hà Nội / Quận Cầu Giấy / Phường Dịch Vọng',
      '45 Lê Duẩn, Quận 1, TP.HCM',
    )
    expect(res.isMatch).toBe(false)
  })
})

describe('extractSpxTrackingCodeFromText', () => {
  it('bắt đúng mã vận đơn SPX từ thông báo hoặc URL', () => {
    expect(
      extractSpxTrackingCodeFromText('Tạo đơn thành công! Mã vận đơn: spxvn03987654321'),
    ).toBe('SPXVN03987654321')
    expect(
      extractSpxTrackingCodeFromText('https://spx.vn/spx-admin/single-order/detail?tracking=SPX2600123456'),
    ).toBe('SPX2600123456')
    expect(extractSpxTrackingCodeFromText('Không có mã vận đơn')).toBeNull()
  })
})
