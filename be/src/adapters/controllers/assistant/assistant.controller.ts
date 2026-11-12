import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  VERSION_NEUTRAL,
} from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { CreateBookstoreOrderDto } from '@adapters/controllers/orders/dto/create-order.dto'

import {
  BOOKSTORE_ORDER_REPOSITORY,
  IBookstoreOrderRepositoryInterface,
} from '@domain/repositories/bookstore-order.repository.interface'
import { CreateBookstoreOrderUseCase } from '@use-cases/orders/create-order.use-case'

import {
  AssistantReply,
  AssistantService,
  ChatMessage,
  ToolDefinition,
} from '@infrastructure/services/assistant.service'
import {
  AddressVerificationResult,
  AnalyzeChatResult,
  ConversationMessage,
  GeminiParserService,
  ParsedAddressResult,
  ParsedProductsResult,
} from '@infrastructure/services/gemini-parser.service'
import { GhnService } from '@infrastructure/services/ghn/ghn.service'

@ApiTags('assistant')
@Controller({
  path: ['assistant', 'api/assistant'],
  version: [VERSION_NEUTRAL, '1'],
})
export class AssistantController {
  constructor(
    private assistantService: AssistantService,
    private geminiParserService: GeminiParserService,
    private createOrderUseCase: CreateBookstoreOrderUseCase,
    @Inject(BOOKSTORE_ORDER_REPOSITORY)
    private orderRepository: IBookstoreOrderRepositoryInterface,
    private ghnService: GhnService,
  ) {}

  @Get('provinces')
  @ApiOperation({ summary: 'Lấy danh sách 63 Tỉnh/Thành phố của Việt Nam (kèm bí danh TPHCM, HN...)' })
  async getProvinces() {
    return await this.ghnService.getProvinces()
  }

  @Get('districts/:provinceId')
  @ApiOperation({ summary: 'Lấy danh mục Quận/Huyện theo ID Tỉnh/Thành' })
  async getDistricts(@Param('provinceId', ParseIntPipe) provinceId: number) {
    return await this.ghnService.getDistricts(provinceId)
  }

  @Get('wards/:districtId')
  @ApiOperation({ summary: 'Lấy danh mục Phường/Xã theo ID Quận/Huyện' })
  async getWards(@Param('districtId', ParseIntPipe) districtId: number) {
    return await this.ghnService.getWards(districtId)
  }

  @Post('chat')
  @ApiOperation({ summary: 'Chat with Gemini AI Assistant with tools support' })
  @ApiResponse({
    status: 200,
    description: 'Assistant response with optional tool calls',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 500, description: 'Server error' })
  async chat(
    @Body() body: { messages: ChatMessage[]; tools?: ToolDefinition[] },
  ): Promise<AssistantReply> {
    return await this.assistantService.chat(body.messages, body.tools || [])
  }

  @Post('verify-address')
  @ApiOperation({
    summary:
      'Verify address with Gemini AI: detect street, administrative history, mergers, and recommend SPX mode (OLD_3_LEVEL vs NEW_2_LEVEL)',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed address verification, AI overview, and SPX recommendation',
  })
  async verifyAddress(
    @Body() body: { address: string },
  ): Promise<{ success: boolean; data?: AddressVerificationResult; error?: string }> {
    return await this.geminiParserService.verifyAddress(body.address)
  }

  @Post('parse-address')
  @ApiOperation({ summary: 'Parse customer and shipping address using Gemini AI' })
  @ApiResponse({
    status: 200,
    description: 'Parsed customer name, phone, and Vietnamese address hierarchy',
  })
  async parseAddress(
    @Body() body: { text: string },
  ): Promise<{ success: boolean; data?: ParsedAddressResult; error?: string }> {
    return await this.geminiParserService.parseAddress(body.text)
  }

  @Post('parse-products')
  @ApiOperation({ summary: 'Parse product/book list using Gemini AI' })
  @ApiResponse({
    status: 200,
    description: 'Parsed books and quantities matched against inventory',
  })
  async parseProducts(
    @Body() body: { text: string; books?: Array<{ id: string; title: string }> },
  ): Promise<{ success: boolean; data?: ParsedProductsResult; error?: string }> {
    return await this.geminiParserService.parseProducts(body.text, body.books)
  }

  @Post('analyze-chat')
  @ApiOperation({
    summary:
      'Analyze multi-turn chat conversation (Zalo/FB) to detect intent, extract customer details, books, and order readiness',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed analysis of conversation intent and order draft',
  })
  async analyzeChat(
    @Body()
    body: {
      messages: ConversationMessage[]
      books?: Array<{ id: string | number; title: string; price?: number }>
      customerName?: string
      customerPhone?: string
    },
  ): Promise<{ success: boolean; data?: AnalyzeChatResult; error?: string }> {
    return await this.geminiParserService.analyzeChat(
      body.messages,
      body.books,
      body.customerName,
      body.customerPhone,
    )
  }

  @Post('create-order')
  @ApiOperation({
    summary:
      'Create bookstore order from Chrome Extension and sync to database and management web',
  })
  @ApiResponse({
    status: 200,
    description: 'Order created and synced to bookstore orders database',
  })
  async createOrderFromExtension(
    @Body() dto: CreateBookstoreOrderDto,
  ) {
    const order = await this.createOrderUseCase.execute({
      ...dto,
      actor: 'Extension / Zalo AI Assistant',
      actorRole: 'Extension',
    })
    return {
      success: true,
      data: order,
    }
  }

  @Post('update-tracking')
  @ApiOperation({
    summary:
      'Update shipping tracking code for an existing order from extension',
  })
  @ApiResponse({
    status: 200,
    description: 'Order tracking code updated successfully',
  })
  async updateTrackingFromExtension(
    @Body()
    body: {
      orderCode: string
      trackingCode: string
      shippingMethod?: string
    },
  ) {
    if (!body.orderCode || !body.trackingCode) {
      return { success: false, error: 'Thiếu orderCode hoặc trackingCode' }
    }
    const order = await this.orderRepository.findOrderByCode(body.orderCode)
    if (!order) {
      return { success: false, error: `Không tìm thấy đơn hàng mã ${body.orderCode}` }
    }
    await this.orderRepository.updateOrder(
      { id: order.id },
      {
        trackingCode: body.trackingCode,
        ...(body.shippingMethod ? { shippingMethod: body.shippingMethod } : {}),
      },
    )
    return {
      success: true,
      orderCode: body.orderCode,
      trackingCode: body.trackingCode,
    }
  }
}
