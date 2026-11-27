import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { GhnController } from '@adapters/controllers/shipping/ghn.controller'

import { GhnService } from '@infrastructure/services/ghn/ghn.service'

import { SePayModule } from './sepay.module'

@Module({
  imports: [ConfigModule, SePayModule],
  controllers: [GhnController],
  providers: [GhnService],
  exports: [GhnService],
})
export class GhnModule {}
