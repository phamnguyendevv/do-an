import { Injectable } from '@nestjs/common'

import * as bcrypt from 'bcryptjs'

import { IBcryptService } from '@domain/services/bcrypt.interface'

@Injectable()
export class BcryptService implements IBcryptService {
  rounds: number = 10

  async hash(hashString: string) {
    return await bcrypt.hash(hashString, this.rounds)
  }

  async compare(password: string, hashPassword: string) {
    return await bcrypt.compare(password, hashPassword)
  }
}
