import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import OpenAI from 'openai'

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

export interface ToolCallItem {
  id: string
  name: string
  args: string
  extra_content?: Record<string, any>
}

export interface AssistantReply {
  ok: boolean
  error?: string
  content?: string
  toolCalls?: ToolCallItem[]
}

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name)
  private readonly client: OpenAI | null
  private readonly model: string

  constructor(private configService: ConfigService) {
    const geminiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY
    const groqKey =
      this.configService.get<string>('GROQ_API_KEY') || process.env.GROQ_API_KEY

    if (geminiKey) {
      this.client = new OpenAI({
        apiKey: geminiKey,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      })
      this.model =
        this.configService.get<string>('GEMINI_MODEL') ||
        process.env.GEMINI_MODEL ||
        'gemini-3.5-flash-lite'
      this.logger.log(`AI Assistant initialized with Gemini (model: ${this.model})`)
    } else if (groqKey) {
      this.client = new OpenAI({
        apiKey: groqKey,
        baseURL: 'https://api.groq.com/openai/v1',
      })
      this.model =
        this.configService.get<string>('GROQ_MODEL') ||
        process.env.GROQ_MODEL ||
        'openai/gpt-oss-120b'
      this.logger.log(`AI Assistant initialized with Groq fallback (model: ${this.model})`)
    } else {
      this.logger.warn(
        'GEMINI_API_KEY is not configured, AI assistant is disabled. Backend will still start.',
      )
      this.client = null
      this.model = ''
    }
  }

  async chat(
    messages: ChatMessage[],
    tools: ToolDefinition[],
  ): Promise<AssistantReply> {
    if (!this.client) {
      return {
        ok: false,
        error: 'AI assistant chưa được cấu hình (thiếu GEMINI_API_KEY)',
      }
    }
    try {
      const openAiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
        []
      const systemMessage = messages.find(
        (message) => message.role === 'system',
      )?.content
      if (systemMessage)
        openAiMessages.push({ role: 'system', content: systemMessage })

      for (const message of messages) {
        if (message.role === 'system') continue
        if (message.role === 'assistant') {
          openAiMessages.push({
            role: 'assistant',
            content: message.content || null,
            ...(message.tool_calls?.length
              ? {
                  tool_calls: message.tool_calls.map((call: any) => ({
                    id: call.id,
                    type: 'function' as const,
                    function: {
                      name: call.function.name,
                      arguments: call.function.arguments,
                    },
                    ...(call.extra_content
                      ? { extra_content: call.extra_content }
                      : {}),
                  })),
                }
              : {}),
          })
        } else if (message.role === 'tool') {
          if (!message.tool_call_id) continue
          openAiMessages.push({
            role: 'tool',
            tool_call_id: message.tool_call_id,
            content: message.content,
          })
        } else {
          openAiMessages.push({ role: 'user', content: message.content })
        }
      }

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: openAiMessages,
        ...(tools.length
          ? {
              tools: tools.map((tool) => ({
                type: 'function' as const,
                function: {
                  name: tool.function.name,
                  description: tool.function.description,
                  parameters: tool.function.parameters,
                },
              })),
              tool_choice: 'auto' as const,
            }
          : {}),
      })

      const reply = response.choices[0]?.message
      if (!reply) throw new Error('AI không trả về nội dung phản hồi')

      const toolCalls = (reply.tool_calls ?? []).flatMap((call: any) =>
        call.type === 'function'
          ? [
              {
                id: call.id,
                name: call.function.name,
                args: call.function.arguments,
                ...(call.extra_content ? { extra_content: call.extra_content } : {}),
              },
            ]
          : [],
      )

      return {
        ok: true,
        content: reply.content ?? '',
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      this.logger.error(`Assistant chat error: ${errorMessage}`, error)

      return {
        ok: false,
        error: `Lỗi khi gọi AI Gemini: ${errorMessage}`,
      }
    }
  }
}
