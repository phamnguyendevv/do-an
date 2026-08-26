import { TAction, TSubject } from '@domain/entities/permission.entity'
import { UserEntity } from '@domain/entities/user.entity'

export interface IPolicyHandler {
  action: TAction
  subject: TSubject
  field?: string
}

export const ABILITY_FACTORY = 'ABILITY_FACTORY_INTERFACE'
export interface IAbilityFactory {
  createForUser(user: UserEntity): unknown
  can(ability: unknown, policyHandler: IPolicyHandler): boolean
}
