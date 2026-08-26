import { ApiProperty } from '@nestjs/swagger'

export class CategoriesPresenter {
  @ApiProperty()
  id!: number

  @ApiProperty()
  name!: string

  @ApiProperty()
  description!: string

  constructor({ id, name, description }: CategoriesPresenter) {
    this.id = id
    this.name = name
    this.description = description
  }
}

export class Pagination {
  @ApiProperty({ example: 100 })
  total!: number

  @ApiProperty({ example: 2 })
  page!: number

  @ApiProperty({ example: 10 })
  size!: number
}

export class GetListCategoriesPresenter {
  @ApiProperty({ type: [CategoriesPresenter] })
  data!: CategoriesPresenter[]

  @ApiProperty()
  pagination!: Pagination

  constructor(data: CategoriesPresenter[], pagination: Pagination) {
    this.data = data.map((item) => new CategoriesPresenter(item))
    this.pagination = pagination
  }
}
