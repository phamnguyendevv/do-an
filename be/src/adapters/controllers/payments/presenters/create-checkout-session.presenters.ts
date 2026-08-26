import { ApiProperty } from '@nestjs/swagger'

export class CreateCheckoutSessionPresenter {
  @ApiProperty()
  sessionId!: string

  @ApiProperty()
  sessionUrl!: string

  constructor({
    sessionId,
    sessionUrl,
  }: {
    sessionId: string
    sessionUrl: string
  }) {
    this.sessionId = sessionId
    this.sessionUrl = sessionUrl
  }
}
