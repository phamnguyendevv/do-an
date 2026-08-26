import { ApiProperty } from '@nestjs/swagger'

export class CountTasksPresenter {
  @ApiProperty({
    required: true,
    description: 'Number of tasks',
  })
  count: number

  constructor({ count }: CountTasksPresenter) {
    this.count = count
  }
}
