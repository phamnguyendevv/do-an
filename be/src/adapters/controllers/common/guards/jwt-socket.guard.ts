import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common'

import { Socket } from 'socket.io'

import { IJwtService, JWT_SERVICE } from '@domain/services/jwt.interface'

interface IAuthenticatedSocket extends Socket {
  userId?: number
}

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  constructor(@Inject(JWT_SERVICE) private readonly jwtService: IJwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: IAuthenticatedSocket = context.switchToWs().getClient()
    const token =
      typeof client.handshake.auth?.token === 'string'
        ? client.handshake.auth.token
        : client.handshake.headers?.authorization

    if (!token) return false

    const cleanedToken = token.startsWith('Bearer ') ? token.slice(7) : token
    const payload = await this.jwtService.checkToken(cleanedToken)

    client.userId = payload.id
    return true
  }
}
