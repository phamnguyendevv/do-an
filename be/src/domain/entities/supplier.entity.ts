export class SupplierEntity {
  public readonly id!: number
  public name!: string
  public contactName?: string
  public phone?: string
  public email?: string
  public address?: string
  public note?: string
  public isDeleted!: boolean
  public readonly createdAt?: Date
  public readonly updatedAt?: Date
}
