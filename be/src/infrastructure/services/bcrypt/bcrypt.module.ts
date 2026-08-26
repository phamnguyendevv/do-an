import { Module } from '@nestjs/common'

import { BCRYPT_SERVICE } from '@domain/services/bcrypt.interface'

import { BcryptService } from './bcrypt.service'

@Module({
  providers: [
    {
      provide: BCRYPT_SERVICE,
      useClass: BcryptService,
    },
  ],
  exports: [BCRYPT_SERVICE],
})
export class BcryptModule {}
