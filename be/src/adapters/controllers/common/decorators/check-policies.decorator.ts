import { SetMetadata } from '@nestjs/common'

import { IPolicyHandler } from '@domain/services/ability.interface'

export const CHECK_POLICIES_KEY = 'CHECK_POLICIES_KEY'
export const CheckPolicies = (...handlers: IPolicyHandler[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers)
