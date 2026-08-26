export interface IJwtServicePayload {
  id: number
}

export const JWT_SERVICE = 'JWT_SERVICE_INTERFACE'
export interface IJwtService {
  checkToken(token: string): Promise<IJwtServicePayload>
  createToken(
    payload: IJwtServicePayload,
    type: 'access' | 'refresh',
  ): Promise<string>
}
