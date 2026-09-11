import { Module } from '@nestjs/common'

import { AssistantController } from '../adapters/controllers/assistant/assistant.controller'
import { AssistantService } from '../infrastructure/services/assistant.service'

@Module({
  controllers: [AssistantController],
  providers: [AssistantService],
  exports: [AssistantService],
})
export class AssistantModule {}
