import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { Content, GoogleGenerativeAI } from '@google/generative-ai'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  tool_calls?: {
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }[]
}

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, any>
  }
}

export interface AssistantReply {
  ok: boolean
  error?: string
  content?: string
  toolCalls?: { id: string; name: string; args: string }[]
}

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name)
  private readonly genAI: GoogleGenerativeAI
  private readonly model: any

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured')
    }
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
  }

  async chat(
    messages: ChatMessage[],
    tools: ToolDefinition[],
  ): Promise<AssistantReply> {
    try {
      // Convert messages to Gemini format
      const systemMessage =
        messages.find((m) => m.role === 'system')?.content || ''
      const conversationHistory = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : m.role,
          parts: [{ text: m.content }],
        })) as Content[]

      // Build tool list for Gemini
      const toolList = tools.map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
        inputSchema: {
          type: 'OBJECT',
          properties: tool.function.parameters.properties || {},
          required: tool.function.parameters.required || [],
        },
      }))

      // Start chat session
      const chat = this.model.startChat({
        history: conversationHistory.slice(0, -1), // All but last user message
        tools:
          toolList.length > 0
            ? [{ functionDeclarations: toolList }]
            : undefined,
      })

      // Send last user message
      const lastMessage = conversationHistory[conversationHistory.length - 1]
      const response = await chat.sendMessage(lastMessage.parts[0].text)

      const responseText = response.text()

      // Check if there are tool calls
      const toolCalls =
        response.response.functionCalls?.map((call: any, index: number) => ({
          id: `call_${index}_${Date.now()}`,
          name: call.name,
          args: JSON.stringify(call.args || {}),
        })) || []

      return {
        ok: true,
        content: responseText,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      this.logger.error(`Assistant chat error: ${errorMessage}`, error)

      return {
        ok: false,
        error: `Lỗi khi gọi Gemini: ${errorMessage}`,
      }
    }
  }
}
