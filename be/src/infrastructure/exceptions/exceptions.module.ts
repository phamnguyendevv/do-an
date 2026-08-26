import { Module } from '@nestjs/common'

import { EXCEPTIONS } from '@domain/exceptions/exceptions.interface'

import { ExceptionsService } from './exceptions.service'

@Module({
  providers: [
    ExceptionsService,
    {
      provide: EXCEPTIONS,
      useClass: ExceptionsService,
    },
  ],
  exports: [EXCEPTIONS, ExceptionsService],
})
export class ExceptionsModule {}
