import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'

import {
  ConversationMessage,
  GeminiParserService,
} from '@infrastructure/services/gemini-parser.service'

describe('GeminiParserService', () => {
  let service: GeminiParserService

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'GEMINI_API_KEY') return 'test-key'
      if (key === 'GEMINI_MODEL') return 'gemini-3.5-flash-lite'
      return null
    }),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiParserService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile()

    service = module.get<GeminiParserService>(GeminiParserService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should analyze chat and parse intent and order details', async () => {
    const mockApiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  intent: 'ORDER_CONFIRMATION',
                  intentConfidence: 0.95,
                  summary: 'Khách chốt đặt 1 cuốn HSK 5',
                  customer: {
                    customerName: 'Nguyễn Văn A',
                    phone: '0912345678',
                    province: 'Hồ Chí Minh',
                    district: 'Quận 1',
                    ward: 'Bến Nghé',
                    detailAddress: '12 Lê Duẩn',
                    rawAddress: '12 Lê Duẩn, Bến Nghé, Quận 1',
                  },
                  items: [
                    {
                      bookId: 'b1',
                      bookTitle: 'Bộ Đề HSK 5',
                      quantity: 1,
                      price: 150000,
                      action: 'ADD',
                      originalText: '1 cuốn HSK 5',
                    },
                  ],
                  unmatchedItems: [],
                  missingFields: [],
                  isReadyToCreateOrder: true,
                  suggestedReply: 'Dạ shop đã xác nhận đơn hàng ạ.',
                }),
              },
            ],
          },
        },
      ],
    }

    const globalFetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    } as any)

    const messages: ConversationMessage[] = [
      { sender: 'customer', text: 'Ship cho mình 1 cuốn HSK 5 nhé' },
      { sender: 'customer', text: 'Mình tên Nguyễn Văn A, SĐT 0912345678, số 12 Lê Duẩn, Bến Nghé, Q1, HCM' },
    ]

    const result = await service.analyzeChat(messages, [
      { id: 'b1', title: 'Bộ Đề HSK 5', price: 150000 },
    ])

    expect(result.success).toBe(true)
    expect(result.data?.intent).toBe('ORDER_CONFIRMATION')
    expect(result.data?.customer.customerName).toBe('Nguyễn Văn A')
    expect(result.data?.customer.phone).toBe('0912345678')
    expect(result.data?.items).toHaveLength(1)
    expect(result.data?.items[0].bookId).toBe('b1')
    expect(result.data?.isReadyToCreateOrder).toBe(true)

    globalFetchSpy.mockRestore()
  })
})
