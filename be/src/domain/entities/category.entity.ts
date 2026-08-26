export class CategoryEntity {
  public readonly id!: number
  public name!: string
  public description!: string
  public isDeleted?: boolean
  public readonly createdAt?: Date
  public readonly updatedAt?: Date
}
