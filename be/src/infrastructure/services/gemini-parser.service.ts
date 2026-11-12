import { Inject, Injectable, Logger, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import {
  BOOK_REPOSITORY,
  IBookRepositoryInterface,
} from '@domain/repositories/book.repository.interface'

function cleanJsonString(raw: string): string {
  let cleaned = raw.trim()
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '')
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '')
  }
  return cleaned.trim()
}

function extractVnPhoneNumber(raw: string): string {
  if (!raw) return ''
  const normalized = raw.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\u00A0/g, ' ')
  const match = normalized.match(/(?:(?:\+?84|0)\s*[35789])(?:[\s.-]*\d){8}\b/)
  if (!match) return ''
  let cleaned = match[0].replace(/\D/g, '')
  if (cleaned.startsWith('84')) {
    cleaned = '0' + cleaned.slice(2)
  }
  return cleaned
}

export interface SpxAddressFormat {
  radio: 'OLD_3_LEVEL' | 'NEW_2_LEVEL'
  cascaderLevels: string[]
  cascaderDisplay: string
  detailAddress: string
}

export interface SpxRecommendation {
  mode: 'OLD_3_LEVEL' | 'NEW_2_LEVEL'
  modeText: string
  levels: string[]
  reason: string
}

export interface AddressVerificationResult {
  address: string
  isValid: boolean
  isExisting: boolean
  province: string
  district: string
  ward: string
  suggestedWard?: string
  detailAddress: string
  addressType: 'OLD_3_LEVEL' | 'NEW_2_LEVEL'
  streetInfo?: string
  administrativeHistory?: string
  spxRecommendation: SpxRecommendation
  overviewAi: string
  bulletPoints: string[]
}

export interface ParsedAddressResult {
  customerName: string
  phone: string
  province: string
  district: string
  ward: string
  detailAddress: string
  addressType: 'OLD_3_LEVEL' | 'NEW_2_LEVEL'
  spxFormat?: SpxAddressFormat
  verification?: AddressVerificationResult
}

export interface ParsedProductItem {
  bookId: string | null
  bookTitle: string
  quantity: number
  originalText: string
}

export interface ParsedProductsResult {
  items: ParsedProductItem[]
  unmatched: string[]
}

export interface ConversationMessage {
  sender: 'customer' | 'seller' | 'system'
  text: string
  time?: string
}

export type ChatIntent =
  | 'INQUIRY'
  | 'ORDER_INTENT'
  | 'ORDER_CONFIRMATION'
  | 'ORDER_MODIFICATION'
  | 'ORDER_CANCELLATION'
  | 'OTHER'

export interface AnalyzedCustomerInfo {
  customerName?: string
  phone?: string
  province?: string
  district?: string
  ward?: string
  detailAddress?: string
  rawAddress?: string
  addressType?: 'OLD_3_LEVEL' | 'NEW_2_LEVEL'
  spxFormat?: SpxAddressFormat
  verification?: AddressVerificationResult
}

export interface AnalyzedOrderItem {
  bookId: string | null
  bookTitle: string
  quantity: number
  price?: number
  action: 'ADD' | 'UPDATE' | 'REMOVE'
  originalText?: string
}

export interface AnalyzeChatResult {
  intent: ChatIntent
  intentConfidence: number
  summary: string
  customer: AnalyzedCustomerInfo
  items: AnalyzedOrderItem[]
  unmatchedItems: string[]
  missingFields: string[]
  isReadyToCreateOrder: boolean
  suggestedReply: string
  shippingFee?: number
  totalCod?: number
}

@Injectable()
export class GeminiParserService {
  private readonly logger = new Logger(GeminiParserService.name)
  private readonly apiKey: string
  private readonly modelName: string

  constructor(
    private configService: ConfigService,
    @Optional()
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepository?: IBookRepositoryInterface,
  ) {
    this.apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY ||
      ''
    this.modelName =
      this.configService.get<string>('GEMINI_MODEL') ||
      process.env.GEMINI_MODEL ||
      'gemini-3.5-flash-lite'

    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY is not configured.')
    } else {
      this.logger.log(
        `GeminiParserService initialized with model: ${this.modelName}`,
      )
    }
  }

  private async callGemini(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured')
    }

    const candidateModels = [
      this.modelName,
      this.modelName === 'gemini-3.5-flash-lite' ? 'gemini-3.5-flash' : 'gemini-3.5-flash-lite',
    ]

    let lastError: Error | null = null

    for (const model of candidateModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
              maxOutputTokens: 4096,
            },
          }),
        })

        if (!response.ok) {
          const errText = await response.text()
          this.logger.warn(`Gemini API [${model}] returned ${response.status}: ${errText}`)
          lastError = new Error(`Gemini API returned status ${response.status}: ${errText}`)
          // If status is 503 or 429, try the next model
          if (response.status === 503 || response.status === 429) {
            continue
          }
          throw lastError
        }

        const data = await response.json()
        const content = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (!content) {
          throw new Error('Empty response from Gemini API')
        }

        return content
      } catch (err: any) {
        lastError = err
        this.logger.warn(`Model ${model} failed: ${err.message}`)
      }
    }

    throw lastError || new Error('Failed to call Gemini with all candidate models')
  }

  async verifyAddress(
    address: string,
  ): Promise<{ success: boolean; data?: AddressVerificationResult; error?: string }> {
    if (!address || !address.trim()) {
      return { success: false, error: 'Address cannot be empty' }
    }

    const prompt = `
Bạn là trợ lý AI chuyên gia phân tích địa lý và đơn vị hành chính Việt Nam (am hiểu sâu rộng về bản đồ địa giới 63 tỉnh thành, các quận/huyện, thị trấn/phường/xã, các đợt sáp nhập đơn vị hành chính và quy tắc phân loại địa chỉ trên cổng vận chuyển SPX - Shopee Express).

Nhiệm vụ: Thẩm định chuyên sâu và xác thực địa chỉ sau:
"""
${address.trim()}
"""

HƯỚNG DẪN THẨM ĐỊNH CHI TIẾT:
1. "isValid": true/false (địa chỉ có tồn tại và xác định được các cấp hành chính hay không).
2. "isExisting": true/false (đây là địa chỉ đã có từ trước / địa chỉ hiện hữu).
3. "province": Tên Tỉnh/Thành phố chuẩn (ví dụ "Quảng Ngãi", "Hồ Chí Minh", "Hà Nội", "Tiền Giang", "Nam Định", "Long An", "Bình Dương", "Đồng Nai", "Đà Nẵng", "Cần Thơ"...).
   - QUY TẮC BẮT BUỘC KHI THIẾU TỈNH / THÀNH PHỐ: Nếu địa chỉ khách cung cấp bị thiếu Tỉnh/Thành phố (ví dụ chỉ ghi số nhà, tên đường "15 Nguyễn Khang", "KCN Hựu Thạnh", "Chợ Gạo", "Hải Hậu", "Bến Nghé"...):
     BẮT BUỘC PHẢI DÙNG TRI THỨC BẢN ĐỒ ĐỊA LÝ VIỆT NAM ĐỂ TRA CỨU VÀ ĐIỀN CHUẨN XÁC TỈNH/THÀNH PHỐ vào "province".
4. "district": Tên Quận/Huyện/Thị xã chuẩn (ví dụ "Sơn Hà", "Hải Hậu", "Chợ Gạo", "Bình Tân", "Cầu Giấy", "Đức Hòa"...).
   - QUY TẮC BẮT BUỘC KHI THIẾU QUẬN/HUYỆN: Nếu địa chỉ chỉ ghi tên đường, tên ngõ, tên khu công nghiệp hoặc tên xã/phường mà không ghi rõ Quận/Huyện:
     BẮT BUỘC PHẢI DÙNG TRI THỨC ĐỊA LÝ ĐỂ TRA CỨU VÀ ĐIỀN CHUẨN XÁC QUẬN/HUYỆN vào "district".
     * Ví dụ: "15 Nguyễn Khang" -> đường Nguyễn Khang thuộc Quận "Cầu Giấy", TP "Hà Nội".
     * Ví dụ: "KCN Hựu Thạnh" -> thuộc Huyện "Đức Hòa", Tỉnh "Long An".
     * Ví dụ: "Xã Đức Hòa" -> nếu đi kèm Hựu Thạnh/Kingtec thì là Huyện "Đức Hòa", Tỉnh "Long An".
5. "ward": Tên Phường/Xã/Thị trấn THỰC TẾ mà khách hàng cung cấp trong văn bản.
   QUY TẮC CỐT LÕI (TUYỆT ĐỐI TUÂN THỦ):
   - TUYỆT ĐỐI KHÔNG TỰ Ý BỊA THÊM hoặc TỰ GIÁC ĐIỀN THÊM tên xã/thị trấn (ví dụ: "Thị trấn Di Lăng") nếu trong văn bản khách KHÔNG HỀ nhắc đến!
   - Nếu khách chỉ viết "81A Trần Văn Trà, Sơn Hà, Quảng Ngãi" thì ở chế độ 2 cấp, ward chính là "Sơn Hà" (hoặc "Xã Sơn Hà"). Ở chế độ 3 cấp nếu khách không nêu tên xã thì để chuỗi rỗng "".
6. "suggestedWard": Tên Phường/Xã/Thị trấn nếu có thể suy luận (chỉ để tham khảo, không ép vào trường ward chính thức).
7. "detailAddress": Số nhà, ngõ ngách, tên đường (ví dụ "81A Trần Văn Trà"). Tuyệt đối không lặp lại quận, huyện, tỉnh trong detailAddress.
8. "addressType":
   - "NEW_2_LEVEL": Địa chỉ MỚI (2 cấp: Tỉnh - Xã) -> Rất phổ biến khi địa chỉ chỉ có Tỉnh và Xã/Khu vực (ví dụ "Sơn Hà, Quảng Ngãi" -> Tỉnh Quảng Ngãi / Xã Sơn Hà).
   - "OLD_3_LEVEL": Địa chỉ CŨ (3 cấp: Tỉnh - Huyện - Xã) -> Khi có đầy đủ cả 3 cấp Tỉnh, Huyện, Xã.
9. "streetInfo": Thông tin thực tế về tuyến đường này.
10. "administrativeHistory": Thông tin về lịch sử, thay đổi hành chính, sáp nhập của địa chỉ này.
11. "spxRecommendation":
    {
      "mode": "OLD_3_LEVEL" hoặc "NEW_2_LEVEL",
      "modeText": "Địa chỉ MỚI (2 cấp: Tỉnh - Xã)" hoặc "Địa chỉ CŨ (3 cấp: Tỉnh - Huyện - Xã)",
      "levels": ["Quảng Ngãi", "Xã Sơn Hà"],
      "reason": "Giải thích ngắn gọn lý do."
    }
12. "overviewAi": Đoạn tóm tắt tổng quan văn phong AI khách quan, trung thực với thông tin khách cung cấp.
13. "bulletPoints": Mảng 3-4 gạch đầu dòng phân tích chi tiết.

Trả về DUY NHẤT một chuỗi JSON hợp lệ theo đúng cấu trúc trên.
`

    try {
      const jsonStr = await this.callGemini(prompt)
      const parsed: AddressVerificationResult = JSON.parse(cleanJsonString(jsonStr))

      // Sanitize province / district fallback
      if (!parsed.province || parsed.province === 'null') {
        const fullAddrLower = `${parsed.district || ''} ${parsed.ward || ''} ${address}`.toLowerCase()
        if (['quảng ngãi', 'sơn hà'].some((k) => fullAddrLower.includes(k))) {
          parsed.province = 'Quảng Ngãi'
        } else if (['tiền giang', 'chợ gạo'].some((k) => fullAddrLower.includes(k))) {
          parsed.province = 'Tiền Giang'
        } else if (['nam định', 'hải hậu'].some((k) => fullAddrLower.includes(k))) {
          parsed.province = 'Nam Định'
        }
      }

      const isOld = parsed.addressType === 'OLD_3_LEVEL' || (parsed.addressType !== 'NEW_2_LEVEL' && Boolean(parsed.district))
      parsed.addressType = isOld ? 'OLD_3_LEVEL' : 'NEW_2_LEVEL'
      if (!isOld) {
        parsed.district = ''
      }

      if (!parsed.spxRecommendation) {
        parsed.spxRecommendation = {
          mode: parsed.addressType,
          modeText: isOld ? 'Địa chỉ CŨ (3 cấp: Tỉnh - Huyện - Xã)' : 'Địa chỉ MỚI (2 cấp: Tỉnh - Xã)',
          levels: isOld
            ? [parsed.province, parsed.district, parsed.suggestedWard || parsed.ward].filter(Boolean)
            : [parsed.province, parsed.ward].filter(Boolean),
          reason: isOld
            ? `${parsed.district || 'Khu vực này'} là cấp Quận/Huyện, trên cổng SPX bắt buộc chọn Địa chỉ CŨ (3 cấp).`
            : 'Địa chỉ áp dụng mô hình 2 cấp.',
        }
      }

      return {
        success: true,
        data: parsed,
      }
    } catch (err: any) {
      this.logger.error(`Error verifying address with Gemini: ${err.message}`)
      return { success: false, error: err.message }
    }
  }

  async parseAddress(
    text: string,
  ): Promise<{ success: boolean; data?: ParsedAddressResult; error?: string }> {
    if (!text || !text.trim()) {
      return { success: false, error: 'Text cannot be empty' }
    }

    const prompt = `
Bạn là trợ lý AI chuyên bóc tách thông tin khách hàng và địa chỉ giao hàng tại Việt Nam (am hiểu bản đồ 63 tỉnh thành, các quận/huyện và cổng vận chuyển SPX).
Nhiệm vụ: Trích xuất thông tin khách hàng và địa chỉ từ văn bản dưới đây.

Văn bản đầu vào:
"""
${text.trim()}
"""

Yêu cầu bóc tách và chuẩn hóa:
1. "customerName": Họ và tên người nhận hàng. Nếu không có họ tên thì để chuỗi rỗng "".
2. "phone": Số điện thoại người nhận (chuẩn hóa 10 chữ số, ví dụ "0908888888", bỏ dấu cách/chấm). Nếu không có thì để "".
3. "province": Tên Tỉnh hoặc Thành phố trực thuộc trung ương (ví dụ "Quảng Ngãi", "Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Đồng Nai"...). Bỏ tiền tố không cần thiết như "TP.", "Tỉnh" nếu có.
4. "district": Tên Quận, Huyện, Thị xã nếu địa chỉ có 3 cấp (ví dụ "Bình Tân", "Cầu Giấy"...). Nếu địa chỉ thuộc mô hình 2 cấp (chỉ có Tỉnh và Xã/Huyện như "Sơn Hà, Quảng Ngãi") thì district có thể để "".
5. "ward": Tên Phường, Xã, Thị trấn THỰC TẾ mà khách hàng cung cấp.
   TUYỆT ĐỐI KHÔNG TỰ BỊA HOẶC TỰ THÊM TÊN XÃ / THỊ TRẤN MÀ KHÁCH KHÔNG VIẾT (ví dụ: TUYỆT ĐỐI KHÔNG tự thêm "Thị trấn Di Lăng" nếu trong chuỗi khách không ghi). Nếu khách ghi "Sơn Hà, Quảng Ngãi" thì ward là "Sơn Hà" (hoặc "Xã Sơn Hà").
6. "detailAddress": Địa chỉ chi tiết số nhà, tên đường, ngõ ngách, tòa nhà (ví dụ "81A Trần Văn Trà", "12 Lê Duẩn"). Tuyệt đối không lặp lại quận, huyện, tỉnh trong detailAddress.
7. "addressType": Phân loại loại hình địa chỉ hành chính:
   - "NEW_2_LEVEL": Địa chỉ MỚI (2 cấp: Tỉnh - Xã) -> Khi địa chỉ chỉ gồm 2 cấp hành chính (ví dụ "Sơn Hà, Quảng Ngãi" -> Tỉnh Quảng Ngãi / Xã Sơn Hà).
   - "OLD_3_LEVEL": Địa chỉ CŨ (3 cấp: Tỉnh - Huyện - Xã) -> Khi địa chỉ có đầy đủ cả 3 cấp Tỉnh, Quận/Huyện và Phường/Xã rõ ràng.

Trả về duy nhất định dạng JSON theo mẫu:
{
  "customerName": "",
  "phone": "",
  "province": "",
  "district": "",
  "ward": "",
  "detailAddress": "",
  "addressType": "OLD_3_LEVEL"
}
`

    try {
      const jsonStr = await this.callGemini(prompt)
      const parsed: ParsedAddressResult = JSON.parse(cleanJsonString(jsonStr))

      if (!parsed.province || parsed.province === 'null') {
        const fullAddrLower = `${parsed.district || ''} ${parsed.ward || ''} ${parsed.detailAddress || ''}`.toLowerCase()
        const hcmDistricts = [
          'bình tân', 'bình thạnh', 'tân bình', 'tân phú', 'gò vấp', 'phú nhuận', 'thủ đức',
          'bình chánh', 'hóc môn', 'củ chi', 'nhà bè', 'cần giờ',
          'quận 1', 'quận 2', 'quận 3', 'quận 4', 'quận 5', 'quận 6', 'quận 7', 'quận 8', 'quận 9', 'quận 10', 'quận 11', 'quận 12',
          'q.1', 'q.2', 'q.3', 'q.4', 'q.5', 'q.6', 'q.7', 'q.8', 'q.9', 'q.10', 'q.11', 'q.12',
          'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12',
        ]
        const hnDistricts = [
          'cầu giấy', 'đống đa', 'ba đình', 'hoàn kiếm', 'hai bà trưng', 'hoàng mai', 'thanh xuân',
          'long biên', 'nam từ liêm', 'bắc từ liêm', 'tây hồ', 'hà đông', 'thanh trì', 'gia lâm', 'đông anh', 'sóc sơn', 'hoài đức',
        ]
        if (hcmDistricts.some((d) => fullAddrLower.includes(d))) {
          parsed.province = 'Hồ Chí Minh'
        } else if (hnDistricts.some((d) => fullAddrLower.includes(d))) {
          parsed.province = 'Hà Nội'
        }
      }

      // TỰ ĐỘNG GỬI VÀO GEMINI KIỂM TRA & BỔ SUNG NẾU THIẾU TỈNH HOẶC QUẬN/HUYỆN
      if (!parsed.province || !parsed.district) {
        try {
          const addrToVerify = [parsed.detailAddress, parsed.ward, parsed.district, parsed.province].filter(Boolean).join(', ') || text
          if (addrToVerify && addrToVerify.length >= 4) {
            this.logger.log(`[Bookstore AI] parseAddress phát hiện thiếu Tỉnh hoặc Huyện ("${addrToVerify}"), tự động gửi Gemini kiểm tra...`)
            const verifyRes = await this.verifyAddress(addrToVerify)
            if (verifyRes.success && verifyRes.data) {
              const vd = verifyRes.data
              if (!parsed.province && vd.province) parsed.province = vd.province
              if (!parsed.district && vd.district) parsed.district = vd.district
              if (!parsed.ward && (vd.ward || vd.suggestedWard)) parsed.ward = vd.ward || vd.suggestedWard || ''
              if (vd.addressType) parsed.addressType = vd.addressType
              parsed.verification = vd
            }
          }
        } catch (e: any) {
          this.logger.warn(`[Bookstore AI] Lỗi kiểm tra bổ sung địa chỉ thiếu trong parseAddress: ${e.message}`)
        }
      }

      const addressType: 'OLD_3_LEVEL' | 'NEW_2_LEVEL' =
        parsed.addressType || (parsed.district ? 'OLD_3_LEVEL' : 'NEW_2_LEVEL')
      const isOld = addressType === 'OLD_3_LEVEL'
      const cascaderLevels: string[] = (
        isOld
          ? [parsed.province, parsed.district, parsed.ward]
          : [parsed.province, parsed.ward]
      ).filter((x): x is string => Boolean(x))
      const cascaderDisplay = isOld
        ? `${parsed.province || ''} / ${parsed.district || ''} / ${parsed.ward || ''}`
        : `${parsed.province || ''} / ${parsed.ward || ''}`

      return {
        success: true,
        data: {
          customerName: parsed.customerName || '',
          phone: parsed.phone || '',
          province: parsed.province || '',
          district: isOld ? parsed.district || '' : '',
          ward: parsed.ward || '',
          detailAddress: parsed.detailAddress || '',
          addressType,
          spxFormat: {
            radio: addressType,
            cascaderLevels,
            cascaderDisplay,
            detailAddress: parsed.detailAddress || '',
          },
        },
      }
    } catch (err: any) {
      this.logger.error(`Error parsing address with Gemini: ${err.message}`)
      return { success: false, error: err.message }
    }
  }

  async parseProducts(
    text: string,
    availableBooks?: Array<{ id: string; title: string }>,
  ): Promise<{ success: boolean; data?: ParsedProductsResult; error?: string }> {
    if (!text || !text.trim()) {
      return { success: false, error: 'Text cannot be empty' }
    }

    const booksContext =
      availableBooks && availableBooks.length > 0
        ? `
Danh sách các sách có trong kho để bạn đối chiếu:
${JSON.stringify(availableBooks.map((b) => ({ id: b.id, title: b.title })))}
`
        : 'Không có danh sách sách kho cụ thể, hãy trích xuất tên sách theo văn bản của khách.'

    const prompt = `
Bạn là trợ lý AI chuyên bóc tách danh sách sách/sản phẩm mà khách hàng muốn đặt mua.
${booksContext}

Văn bản yêu cầu đặt hàng của khách:
"""
${text.trim()}
"""

Yêu cầu:
1. Đọc kỹ văn bản, nhận diện các đầu sách và số lượng khách muốn mua.
2. Với mỗi đầu sách:
   - "bookTitle": Tên sách chính xác (nếu khớp với sách trong kho thì lấy title trong kho, nếu không khớp thì lấy tên sách khách nhắc tới).
   - "bookId": ID của sách trong danh sách kho (nếu khớp được), hoặc null (nếu không tìm thấy).
   - "quantity": Số lượng mua (mặc định là 1 nếu khách không nói rõ, số nguyên >= 1).
   - "originalText": Cụm từ khách dùng để gọi sách đó (ví dụ "2 bản xanh lá").
3. Bỏ qua các từ chào hỏi, từ đệm, giao tiếp (như "chị ơi", "freeship nha", "gửi cho em").
4. "unmatched": Mảng các cụm từ khách nhắc đến nhưng bạn không xác định được đó là sách gì.

Trả về duy nhất định dạng JSON theo mẫu:
{
  "items": [
    {
      "bookId": "string hoặc null",
      "bookTitle": "string",
      "quantity": 1,
      "originalText": "string"
    }
  ],
  "unmatched": []
}
`

    try {
      const jsonStr = await this.callGemini(prompt)
      const parsed: ParsedProductsResult = JSON.parse(jsonStr)
      return {
        success: true,
        data: {
          items: Array.isArray(parsed.items) ? parsed.items : [],
          unmatched: Array.isArray(parsed.unmatched) ? parsed.unmatched : [],
        },
      }
    } catch (err: any) {
      this.logger.error(`Error parsing products with Gemini: ${err.message}`)
      return { success: false, error: err.message }
    }
  }

  async analyzeChat(
    messages: ConversationMessage[],
    availableBooks?: Array<{ id: string | number; title: string; price?: number }>,
    customerNameHint?: string,
    customerPhoneHint?: string,
  ): Promise<{ success: boolean; data?: AnalyzeChatResult; error?: string }> {
    if (!messages || messages.length === 0) {
      return { success: false, error: 'Messages cannot be empty' }
    }

    if ((!availableBooks || availableBooks.length === 0) && this.bookRepository) {
      try {
        const result = await this.bookRepository.findBooks({ size: 100, page: 1 })
        availableBooks = (result.data || []).map((b) => ({
          id: String(b.id),
          title: b.title,
          price: b.sellingPrice,
        }))
      } catch (err: any) {
        this.logger.warn(`Could not load books from repository: ${err.message}`)
      }
    }

    const booksContext =
      availableBooks && availableBooks.length > 0
        ? `
Danh mục sách hiện có trong kho để đối chiếu:
${JSON.stringify(availableBooks)}
`
        : 'Không có danh mục kho cụ thể, hãy trích xuất tên sách theo nội dung khách nói.'

    const customerHintContext = customerNameHint || customerPhoneHint
      ? `
Thông tin tài khoản mạng xã hội của khách hàng:
- Tên tài khoản Zalo / Facebook: "${customerNameHint || ''}"
- Số điện thoại phát hiện: "${customerPhoneHint || ''}"

QUY TẮC BẮT BUỘC VỀ THÔNG TIN KHÁCH HÀNG:
1. "customerName":
   - Nếu trong tin nhắn khách có tự giới thiệu tên người nhận cụ thể thì lấy tên đó.
   - Nếu trong nội dung tin nhắn khách KHÔNG nêu tên người nhận, BẮT BUỘC lấy tên tài khoản Zalo/Facebook: "${customerNameHint || ''}" làm customerName. TUYỆT ĐỐI KHÔNG để null hay rỗng nếu đã có tên tài khoản!
2. "phone":
   - Tìm số điện thoại (10 chữ số) từ nội dung chat, danh thiếp hoặc số đính kèm ${customerPhoneHint ? `(${customerPhoneHint})` : ''}. Điền số điện thoại vào trường "phone".
`
      : ''

    const prompt = `
Bạn là AI chuyên gia phân tích hội thoại bán hàng (Zalo, Facebook Messenger) cho nhà sách.
Nhiệm vụ: Phân tích toàn bộ ngữ cảnh các tin nhắn trao đổi giữa Khách hàng (customer) và Người bán (seller), từ đó nhận diện ý định, bóc tách thông tin đặt hàng, đối chiếu sản phẩm và phát hiện thông tin còn thiếu.

LƯU Ý ĐẶC BIỆT VỀ TIN NHẮN GHIM ([Tin nhắn ghim]):
- Nếu trong lịch sử cuộc trò chuyện có tin nhắn bắt đầu bằng '[Tin nhắn ghim]: ...', đây là thông tin cực kỳ quan trọng do shop hoặc khách ghim lại ở đầu cuộc trò chuyện. Tin nhắn này thường chứa toàn bộ thông tin nhận hàng của khách (Họ tên, Số điện thoại, Địa chỉ chi tiết, Xã/Phường/Thị trấn, Quận/Huyện, Tỉnh/Thành phố).
- BẮT BUỘC ƯU TIÊN trích xuất thông tin giao hàng từ tin nhắn ghim này vào object "customer":
  * "customerName": Tên người nhận (ví dụ "Trần Huyền").
  * "phone": Số điện thoại người nhận 10 chữ số (ví dụ "0388650572").
  * "province": Tỉnh/Thành phố (ví dụ "Nam Định" hoặc "Tỉnh Nam Định").
  * "district": Quận/Huyện/Thị xã (ví dụ "Hải Hậu" hoặc "Huyện Hải Hậu").
  * "ward": Phường/Xã/Thị trấn (ví dụ "Thị trấn Thịnh Long").
  * "detailAddress": Địa chỉ chi tiết (ví dụ "Khu 9 ( Hiệu thuốc đồng y gần trường cấp 1)").
  * "addressType": "OLD_3_LEVEL" (nếu có Quận/Huyện) hoặc "NEW_2_LEVEL".
- ĐỒNG THỜI VẪN PHÂN TÍCH ĐẦY ĐỦ các mặt hàng khách muốn đặt trong các tin nhắn bên dưới (ví dụ: các quyển sách khách yêu cầu mua).

${booksContext}
${customerHintContext}

Lịch sử cuộc trò chuyện (theo thứ tự thời gian):
${messages.map((m) => `[${m.sender === 'customer' ? 'Khách hàng' : m.sender === 'seller' ? 'Người bán' : 'Hệ thống'}]: ${m.text}`).join('\n')}

Yêu cầu phân tích:
1. "intent":
   - "ORDER_CONFIRMATION": Khách đã chốt đơn, cung cấp thông tin nhận hàng hoặc đồng ý chốt.
   - "ORDER_INTENT": Khách muốn mua nhưng chưa chốt hoặc còn thiếu thông tin.
   - "ORDER_MODIFICATION": Khách yêu cầu sửa đổi đơn (thay đổi số lượng, đổi cuốn sách khác, đổi địa chỉ).
   - "ORDER_CANCELLATION": Khách báo hủy đơn.
   - "INQUIRY": Khách chỉ đang hỏi giá, hỏi thông tin sách, kiểm tra còn hàng hay không.
   - "OTHER": Chào hỏi, cảm ơn hoặc nội dung khác.

2. "intentConfidence": Độ tin cậy từ 0.0 đến 1.0.
3. "summary": Tóm tắt ngắn gọn 1 câu về tình trạng cuộc chat.
4. "customer": Trích xuất thông tin khách (customerName, phone, province, district, ward, detailAddress, rawAddress, addressType: "OLD_3_LEVEL" nếu có Quận/Huyện hoặc "NEW_2_LEVEL" nếu chỉ 2 cấp Tỉnh - Xã).
   QUY TẮC CỐT LÕI (TUYỆT ĐỐI TUÂN THỦ):
   - TUYỆT ĐỐI KHÔNG TỰ BỊA THÊM HOẶC TỰ THÊM TÊN XÃ / THỊ TRẤN MÀ KHÁCH KHÔNG VIẾT (ví dụ: KHÔNG được tự điền "Thị trấn Di Lăng" nếu khách chỉ nhắn "Sơn Hà, Quảng Ngãi").
   - TUYỆT ĐỐI KHÔNG ĐIỀN TRÙNG TÊN Ở CẢ "district" VÀ "ward":
     * Nếu khách ghi "xã đức hoà tây ninh" hoặc "đức hoà tây ninh" (chỉ nhắc Đức Hòa 1 lần): gán "ward": "Xã Đức Hòa" (hoặc "Đức Hòa"), "district": "", "province": "Tây Ninh", "addressType": "NEW_2_LEVEL".
     * TUYỆT ĐỐI KHÔNG gán cả district="Đức Hoà" và ward="Đức Hoà" nếu khách không viết cả 2 đơn vị riêng biệt (ví dụ: KHÔNG làm lặp thành "Đức Hòa, Đức Hòa")!
   - Nếu khách chỉ cung cấp 2 cấp "Sơn Hà, Quảng Ngãi", hãy gán "province": "Quảng Ngãi", "ward": "Sơn Hà" (hoặc "Xã Sơn Hà"), "addressType": "NEW_2_LEVEL". Chỉ khi khách có ghi rõ cả Huyện và Xã/Thị trấn thì mới gán OLD_3_LEVEL.
5. "items": Danh sách sách khách đặt mua:
   QUY TẮC ĐỐI CHIẾU SÁCH VỚI KHO (CỰC KỲ QUAN TRỌNG):
   - CHỈ gán "bookId" khi tựa sách khách nói THỰC SỰ KHỚP rõ ràng về câu chữ với tựa sách trong kho (ví dụ: khách nói "Đắc Nhân Tâm" hoặc "dnt" thì khớp với "Đắc Nhân Tâm").
   - TUYỆT ĐỐI KHÔNG TỰ SUY DIỄN MÀU BÌA HAY ĐOÁN MÒ ĐỂ GÁN VÀO SÁCH TRONG KHO:
     * Ví dụ: Khách nói "Xanh lá 95", "Công lược đọc: 79", "Hskk tím : 55" -> TUYỆT ĐỐI KHÔNG ĐƯỢC gán thành "Đắc Nhân Tâm", "Bắt Trẻ Đồng Xanh" hay bất kỳ sách nào khác trong kho!
     * Khi trong kho KHÔNG CÓ sách nào trùng tên, BẮT BUỘC để "bookId": null và lấy "bookTitle" chính xác theo tên khách gọi (ví dụ: "Xanh lá 95", "Công lược đọc", "Hskk tím").
   - Nếu có số tiền/giá ghi sau tên sách (ví dụ: 95 -> 95000, 79 -> 79000, 55 -> 55000), trích xuất vào trường "price". Nếu sách đã khớp kho thì ưu tiên price trong kho.
   - "action": "ADD" (nếu khách chọn mua), "UPDATE" (sửa số lượng), "REMOVE" (khách báo bỏ bớt cuốn này).
6. "unmatchedItems": Các sản phẩm/cụm từ không rõ.
7. "missingFields": Mảng các trường thông tin còn thiếu để tạo đơn hàng ("customerName", "phone", "province", "district", "ward", "detailAddress", "items").
8. "shippingFee": Tiền phí vận chuyển mà khách phải trả nếu có thỏa thuận trong chat (số nguyên VNĐ, ví dụ: "phí ship 10k" -> 10000, "ship 20k" -> 20000, nếu freeship hoặc không nhắc thì để 0).
9. "totalCod": TỔNG TIỀN THU HỘ COD CUỐI CÙNG mà shop thu của khách khi giao hàng (số nguyên VNĐ).
   QUY TẮC TÍNH "totalCod" (CỰC KỲ QUAN TRỌNG):
   - Nếu trong cuộc trò chuyện hoặc tóm tắt có chốt con số tổng tiền cuối cùng bao gồm cả tiền hàng và phí ship (ví dụ: "195k + 10k thành 205k", "chốt 205k", "tổng 205k", "tổng là 205k") -> BẮT BUỘC "totalCod" phải là con số tổng cuối cùng đó (ví dụ 205000)!
   - Nếu không có câu chốt tổng, totalCod = (Tổng giá trị các sản phẩm trong items) + (shippingFee nếu có).
10. "isReadyToCreateOrder": true nếu khách có intent chốt đơn VÀ đã có đủ: ít nhất 1 sách, số điện thoại, và địa chỉ giao hàng hợp lệ. Ngược lại false.
11. "suggestedReply": Câu trả lời mẫu lịch sự, thân thiện để nhân viên shop chỉ cần copy gửi lại khách.

Trả về DUY NHẤT định dạng JSON:
{
  "intent": "ORDER_CONFIRMATION",
  "intentConfidence": 0.95,
  "summary": "...",
  "customer": {
    "customerName": "",
    "phone": "",
    "province": "",
    "district": "",
    "ward": "",
    "detailAddress": "",
    "rawAddress": "",
    "addressType": "OLD_3_LEVEL"
  },
  "items": [
    {
      "bookId": "string hoặc null",
      "bookTitle": "string",
      "quantity": 1,
      "price": 0,
      "action": "ADD",
      "originalText": "string"
    }
  ],
  "unmatchedItems": [],
  "missingFields": [],
  "shippingFee": 0,
  "totalCod": 0,
  "isReadyToCreateOrder": true,
  "suggestedReply": "..."
}
`

    try {
      const jsonStr = await this.callGemini(prompt)
      const parsed: AnalyzeChatResult = JSON.parse(cleanJsonString(jsonStr))

      const customer = parsed.customer || ({} as any)

      // 1. Quét tìm SĐT từ tin nhắn ghim / hint / messages nếu Gemini chưa nhận diện được
      if (!customer.phone || customer.phone === 'null' || customer.phone.includes('Chưa có')) {
        for (const m of messages) {
          if (m.text.includes('[Tin nhắn ghim]')) {
            const found = extractVnPhoneNumber(m.text)
            if (found) {
              customer.phone = found
              break
            }
          }
        }
        if (!customer.phone && customerPhoneHint) {
          customer.phone = extractVnPhoneNumber(customerPhoneHint) || customerPhoneHint
        } else if (!customer.phone) {
          for (const m of messages) {
            const found = extractVnPhoneNumber(m.text)
            if (found) {
              customer.phone = found
              break
            }
          }
        }
      } else {
        const cleaned = extractVnPhoneNumber(customer.phone)
        if (cleaned) {
          customer.phone = cleaned
        }
      }

      // 2. Mặc định tên Zalo nếu khách không nói tên riêng
      if (!customer.customerName || customer.customerName === 'null' || customer.customerName.includes('Chưa có') || customer.customerName === 'Khách hàng') {
        for (const m of messages) {
          if (m.text.includes('[Tin nhắn ghim]')) {
            const mMatch = m.text.replace(/\[Tin nhắn ghim\]:\s*/i, '').trim().match(/^([A-ZÀ-Ỹa-zà-ỹ\s]{2,30}):/)
            if (mMatch && !/tin nhắn|tin ghim|ghi chú|thông báo/i.test(mMatch[1])) {
              customer.customerName = mMatch[1].trim()
              break
            }
          }
        }
        if ((!customer.customerName || customer.customerName === 'Khách hàng') && customerNameHint) {
          customer.customerName = customerNameHint
        } else if (!customer.customerName) {
          for (const m of messages) {
            const cardMatch = m.text.match(/\[Chia sẻ danh thiếp\]:\s*([^\-]+?)\s*-\s*SĐT:/i)
            if (cardMatch) {
              customer.customerName = cardMatch[1].trim()
              break
            }
          }
        }
      }

      // 3. Fallback bóc tách địa chỉ từ tin nhắn ghim nếu Gemini bỏ sót địa chỉ
      if ((!customer.province || !customer.ward || !customer.detailAddress) && messages.some((m) => m.text.includes('[Tin nhắn ghim]'))) {
        const pinMsg = messages.find((m) => m.text.includes('[Tin nhắn ghim]'))
        if (pinMsg) {
          try {
            const rawPin = pinMsg.text.replace(/\[Tin nhắn ghim\]:\s*/i, '').trim()
            const addrResult = await this.parseAddress(rawPin)
            if (addrResult.success && addrResult.data) {
              if (!customer.province) customer.province = addrResult.data.province
              if (!customer.district) customer.district = addrResult.data.district
              if (!customer.ward) customer.ward = addrResult.data.ward
              if (!customer.detailAddress) customer.detailAddress = addrResult.data.detailAddress
              if (!customer.addressType) customer.addressType = addrResult.data.addressType
              if (!customer.phone && addrResult.data.phone) customer.phone = addrResult.data.phone
              if (!customer.customerName && addrResult.data.customerName) customer.customerName = addrResult.data.customerName
            }
          } catch (addrErr) {
            this.logger.warn(`Fallback address parse from pin message failed: ${addrErr}`)
          }
        }
      }

      // 3.5 Tự động suy luận Tỉnh/Thành phố nếu khách chỉ nhắc Quận/Huyện quen thuộc (ví dụ "Bình Tân", "Gò Vấp", "Cầu Giấy"...)
      if (!customer.province || customer.province === 'null' || customer.province.includes('Chưa có')) {
        const fullAddrLower = `${customer.district || ''} ${customer.ward || ''} ${customer.rawAddress || ''} ${customer.detailAddress || ''}`.toLowerCase()
        const hcmDistricts = [
          'bình tân', 'bình thạnh', 'tân bình', 'tân phú', 'gò vấp', 'phú nhuận', 'thủ đức',
          'bình chánh', 'hóc môn', 'củ chi', 'nhà bè', 'cần giờ',
          'quận 1', 'quận 2', 'quận 3', 'quận 4', 'quận 5', 'quận 6', 'quận 7', 'quận 8', 'quận 9', 'quận 10', 'quận 11', 'quận 12',
          'q.1', 'q.2', 'q.3', 'q.4', 'q.5', 'q.6', 'q.7', 'q.8', 'q.9', 'q.10', 'q.11', 'q.12',
          'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12',
        ]
        const hnDistricts = [
          'cầu giấy', 'đống đa', 'ba đình', 'hoàn kiếm', 'hai bà trưng', 'hoàng mai', 'thanh xuân',
          'long biên', 'nam từ liêm', 'bắc từ liêm', 'tây hồ', 'hà đông', 'thanh trì', 'gia lâm', 'đông anh', 'sóc sơn', 'hoài đức',
        ]

        if (hcmDistricts.some((d) => fullAddrLower.includes(d))) {
          customer.province = 'Hồ Chí Minh'
        } else if (hnDistricts.some((d) => fullAddrLower.includes(d))) {
          customer.province = 'Hà Nội'
        }
      }

      // TỰ ĐỘNG GỬI VÀO GEMINI KIỂM TRA & SUY LUẬN BỔ SUNG NẾU THIẾU TỈNH HOẶC QUẬN/HUYỆN
      if (!customer.province || (!customer.district && customer.addressType === 'OLD_3_LEVEL') || !customer.district) {
        const addrToVerify = customer.rawAddress || [customer.detailAddress, customer.ward, customer.district, customer.province].filter(Boolean).join(', ')
        if (addrToVerify && addrToVerify.length >= 4) {
          try {
            this.logger.log(`[Bookstore AI] analyzeChat phát hiện thiếu Tỉnh hoặc Huyện ("${addrToVerify}"), tự động gửi Gemini verifyAddress kiểm tra...`)
            const verifyRes = await this.verifyAddress(addrToVerify)
            if (verifyRes.success && verifyRes.data) {
              const vd = verifyRes.data
              if (!customer.province && vd.province) {
                this.logger.log(`[Bookstore AI] Gemini AI đã suy luận thành công Tỉnh: "${vd.province}"`)
                customer.province = vd.province
              }
              if (!customer.district && vd.district) {
                this.logger.log(`[Bookstore AI] Gemini AI đã suy luận thành công Quận/Huyện: "${vd.district}"`)
                customer.district = vd.district
              }
              if (!customer.ward && (vd.ward || vd.suggestedWard)) {
                customer.ward = vd.ward || vd.suggestedWard || ''
              }
              if (vd.addressType) {
                customer.addressType = vd.addressType
              }
              customer.verification = vd
            }
          } catch (e: any) {
            this.logger.warn(`[Bookstore AI] Lỗi khi tự động gửi Gemini kiểm tra địa chỉ thiếu trong analyzeChat: ${e.message}`)
          }
        }
      }

      // Bóc tách giá từ tên sách nếu item.price chưa có (ví dụ: "combo 195k", "bản màu combo 195k" -> 195000)
      for (const it of parsed.items || []) {
        if (!it.price || it.price <= 0) {
          const m = `${it.bookTitle} ${it.originalText || ''}`.match(/(\d+)\s*(k|nghìn|ngàn)\b/i)
          if (m) {
            it.price = Number(m[1]) * 1000
          }
        }
      }

      // 4. Xử lý chuẩn hóa Tiền thu hộ COD và Phí ship
      let parsedShipping = Number(parsed.shippingFee || 0)
      if (parsedShipping > 0 && parsedShipping < 1000) parsedShipping *= 1000

      let parsedCod = Number(parsed.totalCod || 0)
      if (parsedCod > 0 && parsedCod < 1000) parsedCod *= 1000

      const fullText = `${parsed.summary || ''} ${messages.map((m) => m.text).join(' ')}`

      // Regex 1: "195k + 10k thành 205k", "195k cộng 10k thành 205k"
      const mathMatch = fullText.match(
        /(\d+)\s*k?\s*(?:\+|cộng)\s*(\d+)\s*k?\s*(?:ship|phí)?\s*(?:thành|tổng|=|là)\s*(\d+)\s*(k|nghìn|ngàn)?/i,
      )
      if (mathMatch) {
        let val = Number(mathMatch[3])
        if (mathMatch[4] || val < 1000) val *= 1000
        if (val >= 10000) parsedCod = val
      }

      // Regex 2: "tổng tiền COD là 205k", "tổng COD là 205k", "tổng là 205k", "thành 205k", "chốt 205k"
      if (!parsedCod || parsedCod < 20000) {
        const codRegex =
          /(?:tổng\s*(?:tiền)?\s*(?:cod)?|thành|chốt|thu\s*hộ|cod)\s*(?:là|hết|được)?[:\s]*(\d+)\s*(k|nghìn|ngàn)?/i
        const matchCod = fullText.match(codRegex)
        if (matchCod) {
          let val = Number(matchCod[1])
          if (matchCod[2] || val < 1000) val *= 1000
          if (val >= 10000) {
            parsedCod = val
          }
        }
      }

      // Sanity check: COD cho sách không thể chỉ có <= 30.000đ (chỉ bằng tiền ship)!
      const itemsSum = (parsed.items || []).reduce(
        (sum, it) => sum + (it.price || 0) * (it.quantity || 1),
        0,
      )
      if (parsedCod <= 30000 && itemsSum > 0) {
        parsedCod = itemsSum + parsedShipping
      } else if (parsedCod <= 30000) {
        const priceInText = fullText.match(/(\d{2,3})\s*(k|nghìn|ngàn)/i)
        if (priceInText) {
          const itemVal = Number(priceInText[1]) * 1000
          if (itemVal >= 50000) {
            parsedCod = itemVal + parsedShipping
          }
        }
      }

      if (!parsedCod || parsedCod <= 0) {
        parsedCod = itemsSum + parsedShipping
      }

      parsed.shippingFee = parsedShipping
      parsed.totalCod = parsedCod

      // Khử trùng lặp giữa ward và district nếu có tên giống nhau (ví dụ: ward="Đức Hòa", district="Đức Hòa")
      if (customer.ward && customer.district) {
        const cleanWard = customer.ward
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/^(xã|phường|thị trấn|tt|p|x)\s+/i, '')
          .trim()
        const cleanDist = customer.district
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/^(quận|huyện|thị xã|q|h|tx)\s+/i, '')
          .trim()

        if (cleanWard === cleanDist || cleanWard.includes(cleanDist) || cleanDist.includes(cleanWard)) {
          const rawChat = messages.map((m) => m.text).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          const matches = rawChat.match(new RegExp(cleanWard.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []
          if (matches.length <= 1) {
            if (/^(xã|phường|thị trấn)\b/i.test(customer.ward) || rawChat.includes('xã ' + cleanWard) || rawChat.includes('phường ' + cleanWard)) {
              customer.district = ''
              customer.addressType = 'NEW_2_LEVEL'
            } else {
              customer.ward = ''
            }
          }
        }
      }

      if (!customer.addressType || customer.district) {
        customer.addressType = customer.district ? 'OLD_3_LEVEL' : (customer.addressType || 'NEW_2_LEVEL')
      }

      const isOld = customer.addressType === 'OLD_3_LEVEL'
      const cascaderLevels: string[] = (
        isOld
          ? [customer.province, customer.district, customer.ward]
          : [customer.province, customer.ward]
      ).filter((x): x is string => Boolean(x))
      const cascaderDisplay = isOld
        ? `${customer.province || ''} / ${customer.district || ''} / ${customer.ward || ''}`
        : `${customer.province || ''} / ${customer.ward || ''}`

      customer.spxFormat = {
        radio: customer.addressType,
        cascaderLevels,
        cascaderDisplay,
        detailAddress: customer.detailAddress || '',
      }

      let missing = Array.isArray(parsed.missingFields) ? parsed.missingFields : []
      if (customer.customerName) {
        missing = missing.filter((f) => f !== 'customerName')
      }
      if (customer.phone) {
        missing = missing.filter((f) => f !== 'phone')
      }
      if (customer.province) {
        missing = missing.filter((f) => f !== 'province')
      }
      if (customer.district || customer.addressType === 'NEW_2_LEVEL') {
        missing = missing.filter((f) => f !== 'district')
      }
      if (customer.ward) {
        missing = missing.filter((f) => f !== 'ward')
      }
      if (customer.detailAddress) {
        missing = missing.filter((f) => f !== 'detailAddress')
      }
      if ((parsed.items || []).length > 0) {
        missing = missing.filter((f) => f !== 'items')
      }
      parsed.missingFields = missing
      parsed.isReadyToCreateOrder = missing.length === 0 && (parsed.items || []).length > 0

      return {
        success: true,
        data: {
          intent: parsed.intent || 'OTHER',
          intentConfidence: parsed.intentConfidence || 0.8,
          summary: parsed.summary || '',
          customer,
          items: Array.isArray(parsed.items) ? parsed.items : [],
          unmatchedItems: Array.isArray(parsed.unmatchedItems)
            ? parsed.unmatchedItems
            : [],
          missingFields: missing,
          isReadyToCreateOrder: Boolean(parsed.isReadyToCreateOrder),
          suggestedReply: parsed.suggestedReply || '',
          shippingFee: parsed.shippingFee || 0,
          totalCod: parsed.totalCod || 0,
        },
      }
    } catch (err: any) {
      this.logger.error(`Error analyzing chat with Gemini: ${err.message}`)
      return { success: false, error: err.message }
    }
  }
}
