import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'

import { UserStatusEnum } from '@domain/entities/status.entity'
import { UserEntity } from '@domain/entities/user.entity'

import { ExceptionsService } from '@infrastructure/exceptions/exceptions.service'

@Injectable()
export class ActiveUserGuard implements CanActivate {
  constructor(private readonly exceptionService: ExceptionsService) {}
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<{ user: UserEntity }>()

    if (user.status !== UserStatusEnum.Active) {
      this.exceptionService.forbiddenException({
        type: 'ForbiddenException',
        message: 'User not active',
      })
    }
    return true
  }
}
