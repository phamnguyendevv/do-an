export class BookEntity {
  public readonly id!: number
  public title!: string
  public author!: string
  public category!: string
  public purchasePrice!: number
  public sellingPrice!: number
  public stock!: number
  public minStock!: number
  public status!: string
  public readonly createdAt?: Date
  public readonly updatedAt?: Date
}
