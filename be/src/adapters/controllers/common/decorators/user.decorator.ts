import { ExecutionContext, createParamDecorator } from '@nestjs/common'

import { UserEntity } from '@domain/entities/user.entity'

export const USER_FACTORY_DATA = (
  data: keyof UserEntity | undefined,
  ctx: ExecutionContext,
): UserEntity | UserEntity[keyof UserEntity] => {
  const request = ctx.switchToHttp().getRequest<{ user: UserEntity }>()
  const user = request.user

  return data ? user?.[data] : user
}

/**
 * Custom decorator to retrieve the user object from the request.
 * @param data - Optional property of the user object to retrieve.
 * @param ctx - The execution context of the request.
 * @returns The user object or a specific property of the user object.
 */
export const User = createParamDecorator(USER_FACTORY_DATA)
