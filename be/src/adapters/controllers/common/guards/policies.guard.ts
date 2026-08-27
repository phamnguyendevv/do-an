import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { UserEntity } from '@domain/entities/user.entity'
import {
  ABILITY_FACTORY,
  IAbilityFactory,
  IPolicyHandler,
} from '@domain/services/ability.interface'

import { CHECK_POLICIES_KEY } from '../decorators/check-policies.decorator'

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,

    @Inject(ABILITY_FACTORY)
    private readonly caslAbilityFactory: IAbilityFactory,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const policyHandlers =
      this.reflector.get<IPolicyHandler[]>(
        CHECK_POLICIES_KEY,
        context.getHandler(),
      ) || []

    if (policyHandlers.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest<{ user?: UserEntity }>()
    const user = request.user
    if (!user) {
      throw new ForbiddenException('Không tìm thấy thông tin xác thực người dùng')
    }

    const ability = this.caslAbilityFactory.createForUser(user)

    const hasPermission = policyHandlers.every((handler) => {
      return this.caslAbilityFactory.can(ability, handler)
    })

    if (!hasPermission) {
      throw new ForbiddenException('Bạn không có quyền thực hiện hành động này')
    }

    return true
  }
}
