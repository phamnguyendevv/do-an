import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export interface ParsedAddressResult {
  customerName: string
  phone: string
  province: string
  district: string
  ward: string
  detailAddress: string
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

@Injectable()
export class GeminiParserService {
  private readonly logger = new Logger(GeminiParserService.name)
  private readonly apiKey: string
  private readonly modelName: string

  constructor(private configService: ConfigService) {
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

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`

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
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      this.logger.error(`Gemini API error: ${response.status} - ${errText}`)
      throw new Error(`Gemini API returned status ${response.status}: ${errText}`)
    }

    const data = await response.json()
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!content) {
      throw new Error('Empty response from Gemini API')
    }

    return content
  }

  async parseAddress(
    text: string,
  ): Promise<{ success: boolean; data?: ParsedAddressResult; error?: string }> {
    if (!text || !text.trim()) {
      return { success: false, error: 'Text cannot be empty' }
    }

    const prompt = `
Bạn là trợ lý AI chuyên bóc tách thông tin khách hàng và địa chỉ giao hàng tại Việt Nam.
Nhiệm vụ: Trích xuất thông tin khách hàng và địa chỉ từ văn bản dưới đây.

Văn bản đầu vào:
"""
${text.trim()}
"""

Yêu cầu bóc tách và chuẩn hóa:
1. "customerName": Họ và tên người nhận hàng. Nếu không có họ tên thì để chuỗi rỗng "".
2. "phone": Số điện thoại người nhận (chuẩn hóa 10 chữ số, ví dụ "0908888888", bỏ dấu cách/chấm). Nếu không có thì để "".
3. "province": Tên Tỉnh hoặc Thành phố trực thuộc trung ương (ví dụ "Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Đồng Nai"...). Bỏ tiền tố không cần thiết như "TP.", "Tỉnh" nếu có.
4. "district": Tên Quận, Huyện, Thị xã, hoặc Thành phố trực thuộc tỉnh (ví dụ "Quận 1", "Cầu Giấy", "Biên Hòa", "Thủ Đức"...).
5. "ward": Tên Phường, Xã, Thị trấn (ví dụ "Phường Bến Nghé", "Dịch Vọng", "Tân Định"...).
6. "detailAddress": Địa chỉ chi tiết số nhà, tên đường, ngõ ngách, tòa nhà (ví dụ "12 Lê Duẩn", "Tòa S2.01 Vinhomes Grand Park"). Tuyệt đối không lặp lại quận, huyện, tỉnh trong detailAddress.

Trả về duy nhất định dạng JSON theo mẫu:
{
  "customerName": "",
  "phone": "",
  "province": "",
  "district": "",
  "ward": "",
  "detailAddress": ""
}
`

    try {
      const jsonStr = await this.callGemini(prompt)
      const parsed: ParsedAddressResult = JSON.parse(jsonStr)
      return {
        success: true,
        data: {
          customerName: parsed.customerName || '',
          phone: parsed.phone || '',
          province: parsed.province || '',
          district: parsed.district || '',
          ward: parsed.ward || '',
          detailAddress: parsed.detailAddress || '',
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
}
