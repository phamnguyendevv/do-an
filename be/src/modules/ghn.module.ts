import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { GhnController } from '@adapters/controllers/shipping/ghn.controller'

import { GhnService } from '@infrastructure/services/ghn/ghn.service'

@Module({
  imports: [ConfigModule],
  controllers: [GhnController],
  providers: [GhnService],
  exports: [GhnService],
})
export class GhnModule {}
