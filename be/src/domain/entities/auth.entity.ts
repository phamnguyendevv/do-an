import { UserRoleEnum } from './role.entity'
import { UserStatusEnum } from './status.entity'

export interface ILoginResponse {
  idToken: string
  refreshToken: string
}

export interface ICheckExistInput {
  email?: string
  username?: string
  phone?: string
}

export interface ICheckExistResult {
  emailExists: boolean
  usernameExists: boolean
  phoneExists: boolean
}

export interface ILoginInput {
  email: string
  password: string
}

export interface IRegisterInput {
  email: string
  username?: string
  password: string
  confirmPassword?: string
  role?: UserRoleEnum
  status?: UserStatusEnum
  emailVerified?: boolean
  phone?: string
  avatarUrl?: string
  avatarPublicId?: string
  addressProvince?: string
  addressDistrict?: string
  addressWard?: string
  addressDetail?: string
  isProvider?: boolean
}

export interface IVerifyOtpInput {
  email: string
  inputOtp: string
}

export interface IOauthLoginInput {
  email: string
  name: string
}
