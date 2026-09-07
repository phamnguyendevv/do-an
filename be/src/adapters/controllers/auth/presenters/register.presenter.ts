import { ApiProperty } from '@nestjs/swagger'

export class RegisterPresenter {
  @ApiProperty({ required: true })
  message!: string

  constructor(registerPresenter: Partial<RegisterPresenter>) {
    Object.assign(this, registerPresenter)
  }
}
