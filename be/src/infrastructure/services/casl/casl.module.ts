import { Module } from '@nestjs/common'

import { ABILITY_FACTORY } from '@domain/services/ability.interface'

import { CaslAbilityFactory } from './casl-ability.factory'

@Module({
  providers: [
    {
      provide: ABILITY_FACTORY,
      useClass: CaslAbilityFactory,
    },
  ],
  exports: [ABILITY_FACTORY],
})
export class CaslModule {}
