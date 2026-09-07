import { CookieOptions } from 'express'

export const getCookieOptions = (nodeEnv: string): CookieOptions => {
  const isProduction = nodeEnv === 'production'
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
  }
}
