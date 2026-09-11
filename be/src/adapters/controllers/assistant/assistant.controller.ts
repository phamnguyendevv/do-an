import { Body, Controller, Post } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import {
  AssistantReply,
  AssistantService,
  ChatMessage,
  ToolDefinition,
} from '@infrastructure/services/assistant.service'

@ApiTags('assistant')
@Controller('api/assistant')
export class AssistantController {
  constructor(private assistantService: AssistantService) {}

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
}
