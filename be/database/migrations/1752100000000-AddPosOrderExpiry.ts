import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddPosOrderExpiry1752100000000 implements MigrationInterface {
  name = 'AddPosOrderExpiry1752100000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bookstore_orders"
      ADD COLUMN "expires_at" TIMESTAMPTZ NULL
    `)
    await queryRunner.query(`
      CREATE INDEX "IDX_bookstore_orders_expires_at"
      ON "bookstore_orders" ("expires_at")
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_bookstore_orders_expires_at"`)
    await queryRunner.query(
      `ALTER TABLE "bookstore_orders" DROP COLUMN "expires_at"`,
    )
  }
}
