import { Module } from '@nestjs/common'

import { AssistantController } from '../adapters/controllers/assistant/assistant.controller'
import { AssistantService } from '../infrastructure/services/assistant.service'
import { GeminiParserService } from '../infrastructure/services/gemini-parser.service'
import { BooksModule } from './books.module'
import { GhnModule } from './ghn.module'
import { OrdersModule } from './orders.module'
import { SpxModule } from './spx.module'

@Module({
  imports: [BooksModule, OrdersModule, GhnModule, SpxModule],
  controllers: [AssistantController],
  providers: [AssistantService, GeminiParserService],
  exports: [AssistantService, GeminiParserService],
})
export class AssistantModule { }
