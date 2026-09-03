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
  createForUser(user?: UserEntity) {
    const { can, cannot, build } = new AbilityBuilder<TAppAbility>(PureAbility)

    if (!user) {
      return build()
    }

    if (user.role === UserRoleEnum.Admin) {
      // Admin has full access to all resources
      can('manage', 'all')
    } else if (user.role === UserRoleEnum.Staff) {
      // Staff has access to operational resources: POS, books, categories, suppliers, orders, inventory, notifications, shipping
      can(['read', 'create', 'update'], 'Book')
      can(['read', 'create', 'update'], 'Category')
      can(['read', 'create', 'update'], 'Supplier')
      can(['read', 'create', 'update'], 'Customer')
      can(['read', 'create', 'update'], 'Promotion')
      can('read', 'ActivityLog')
      can(['read', 'create', 'update', 'delete'], 'BookstoreOrder')
      can(['read', 'create', 'update'], 'ImportReceipt')
      can(['read', 'create', 'update'], 'ExportReceipt')
      can(['read', 'create', 'update'], 'StockMovement')
      can(['read', 'create', 'update'], 'Payment')
      can(['read', 'create', 'update'], 'Shipping')
      can(['read', 'update'], 'Notification')
      can(['read', 'update'], 'User')
      cannot('update', 'User', ['role', 'status'])
      cannot('delete', 'User')
      cannot('search', 'User')
      cannot('create', 'User')
      cannot('delete', 'Book')
      cannot('delete', 'Category')
      cannot('delete', 'Supplier')
      cannot('read', 'Revenue')
    } else if (user.role === UserRoleEnum.Provider) {
      // Provider has access to supplier supplies & import receipts
      can('read', 'Book')
      can(['read', 'update'], 'Supplier')
      can(['read', 'create'], 'ImportReceipt')
      can(['read', 'update'], 'User')
      cannot('update', 'User', ['role', 'status'])
      cannot('delete', 'User')
      can(['read', 'update'], 'Notification')
    } else {
      // Client / Customer
      can('read', 'Book')
      can('read', 'Category')
      can(['read', 'create'], 'BookstoreOrder')
      can(['read', 'update'], 'User')
      cannot('update', 'User', ['role', 'status'])
      cannot('delete', 'User')
      can(['read', 'update'], 'Notification')
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
      fieldMatcher: (fields?: string[]) => (accessibleField: string) =>
        !fields || fields.length === 0 || fields.includes(accessibleField),
    })
  }

  can(
    ability: TAppAbility,
    { action, subject, field }: IPolicyHandler,
  ): boolean {
    return ability.can(action, subject, field)
  }
}
