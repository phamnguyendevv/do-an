import { Body, Controller, Post } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import {
  AssistantReply,
  AssistantService,
  ChatMessage,
  ToolDefinition,
} from '@infrastructure/services/assistant.service'
import {
  GeminiParserService,
  ParsedAddressResult,
  ParsedProductsResult,
} from '@infrastructure/services/gemini-parser.service'

@ApiTags('assistant')
@Controller('api/assistant')
export class AssistantController {
  constructor(
    private assistantService: AssistantService,
    private geminiParserService: GeminiParserService,
  ) {}

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
}
