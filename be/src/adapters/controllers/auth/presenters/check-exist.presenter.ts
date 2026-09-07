import { ApiProperty } from '@nestjs/swagger'

export class CheckExistPresenter {
  @ApiProperty({ required: true, example: false })
  emailExists!: boolean

  @ApiProperty({ required: true, example: false })
  usernameExists!: boolean

  @ApiProperty({ required: true, example: false })
  phoneExists!: boolean

  constructor(presenter: Partial<CheckExistPresenter>) {
    Object.assign(this, presenter)
  }
}
