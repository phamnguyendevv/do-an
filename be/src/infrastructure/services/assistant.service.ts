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

export interface AssistantReply {
  ok: boolean
  error?: string
  content?: string
  toolCalls?: { id: string; name: string; args: string }[]
}

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name)
  private readonly client: OpenAI
  private readonly model: string

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY')
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not configured')
    }
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    })
    this.model =
      this.configService.get<string>('GROQ_MODEL') || 'llama-3.3-70b-versatile'
  }

  async chat(
    messages: ChatMessage[],
    tools: ToolDefinition[],
  ): Promise<AssistantReply> {
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
                  tool_calls: message.tool_calls.map((call) => ({
                    id: call.id,
                    type: 'function' as const,
                    function: {
                      name: call.function.name,
                      arguments: call.function.arguments,
                    },
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
      if (!reply) throw new Error('Groq không trả về nội dung phản hồi')

      const toolCalls = (reply.tool_calls ?? []).flatMap((call) =>
        call.type === 'function'
          ? [
              {
                id: call.id,
                name: call.function.name,
                args: call.function.arguments,
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
        error: `Lỗi khi gọi Groq: ${errorMessage}`,
      }
    }
  }
}
