import { Injectable } from '@nestjs/common'

import { AbilityBuilder, PureAbility } from '@casl/ability'

import { TAction, TSubject } from '@domain/entities/permission.entity'
import { UserRoleEnum } from '@domain/entities/role.entity'
import { UserEntity } from '@domain/entities/user.entity'
import {
  IAbilityFactory,
  IPolicyHandler,
} from '@domain/services/ability.interface'

type TAppAbility = PureAbility<[TAction, TSubject]>

@Injectable()
export class CaslAbilityFactory implements IAbilityFactory {
  createForUser(user: UserEntity) {
    const { can, cannot, build } = new AbilityBuilder<TAppAbility>(PureAbility)

    if (user.role === UserRoleEnum.Admin) {
      // Admin can manage all resources
      can('manage', 'all')
      can('search', 'User')
      cannot('delete', 'Service')
    } else if (user.role === UserRoleEnum.Provider) {
      can(['read', 'create', 'update'], 'User', { id: user.id })
      cannot('update', 'User', ['role', 'status'])
      can('read', 'Category')
      can('manage', 'Appointment', { providerId: user.id })
      can('manage', 'Service', { providerId: user.id })
      can('manage', 'Payment')
      can('manage', 'Promotion', { providerId: user.id })
      can('manage', 'Notification', { userId: user.id })
      can('manage', 'Review')
    } else if (user.role === UserRoleEnum.Client) {
      can(['read', 'create', 'update'], 'User', { id: user.id })
      cannot('update', 'User', ['role', 'status'])
      can('manage', 'Appointment', { clientId: user.id })
      can('manage', 'Notification', { userId: user.id })
      can('read', 'Category', { userId: user.id })
      can('read', 'Service', { providerId: user.id })
      can('read', 'Promotion', { userId: user.id })
      can('manage', 'Review', { clientId: user.id })
      can('manage', 'Payment')
      can(['read', 'create', 'delete'], 'ServiceFavorite', {
        clientId: user.id,
      })
    }

    return build({
      conditionsMatcher: (conditions: unknown) => {
        return (object: Record<string, unknown>) => {
          if (
            typeof conditions !== 'object' ||
            conditions === null ||
            Array.isArray(conditions)
          ) {
            return false
          }

          const conds = conditions as Record<string, unknown>

          for (const [key, value] of Object.entries(conds)) {
            if (object[key] !== value) {
              return false
            }
          }
          return true
        }
      },
      fieldMatcher: (fields: string[]) => (accessibleField: string) =>
        fields.includes(accessibleField),
    })
  }

  can(
    ability: TAppAbility,
    { action, subject, field }: IPolicyHandler,
  ): boolean {
    return ability.can(action, subject, field)
  }
}
