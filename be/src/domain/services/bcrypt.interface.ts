export const BCRYPT_SERVICE = 'BCRYPT_SERVICE_INTERFACE'
export interface IBcryptService {
  hash(hashString: string): Promise<string>
  compare(password: string, hashPassword: string): Promise<boolean>
}
