import { ApiProperty } from '@nestjs/swagger'

import { GetMePresenter } from './get-me.presenter'

export class TokenPresenter {
  @ApiProperty({ required: true })
  accessToken!: string

  @ApiProperty({ required: true })
  refreshToken!: string

  constructor(loginPresenter: TokenPresenter) {
    Object.assign(this, loginPresenter)
  }
}

export class LoginPresenter {
  @ApiProperty({ type: [GetMePresenter] })
  data!: GetMePresenter

  @ApiProperty()
  token!: TokenPresenter

  constructor(data: GetMePresenter, token: TokenPresenter) {
    this.data = data
    this.token = token
  }
}
