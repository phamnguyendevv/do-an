import { Module } from '@nestjs/common'

import { AssistantController } from '../adapters/controllers/assistant/assistant.controller'
import { AssistantService } from '../infrastructure/services/assistant.service'
import { GeminiParserService } from '../infrastructure/services/gemini-parser.service'

@Module({
  controllers: [AssistantController],
  providers: [AssistantService, GeminiParserService],
  exports: [AssistantService, GeminiParserService],
})
export class AssistantModule {}
