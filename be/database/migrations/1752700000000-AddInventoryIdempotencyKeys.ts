import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddInventoryIdempotencyKeys1752700000000
  implements MigrationInterface
{
  name = 'AddInventoryIdempotencyKeys1752700000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "import_receipts"
      ADD COLUMN IF NOT EXISTS "idempotency_key" uuid,
      ADD COLUMN IF NOT EXISTS "request_hash" varchar(64)
    `)
    await queryRunner.query(`
      ALTER TABLE "export_receipts"
      ADD COLUMN IF NOT EXISTS "idempotency_key" uuid,
      ADD COLUMN IF NOT EXISTS "request_hash" varchar(64)
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_import_receipts_idempotency"
      ON "import_receipts" ("created_by_id", "idempotency_key")
      WHERE "idempotency_key" IS NOT NULL
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_export_receipts_idempotency"
      ON "export_receipts" ("created_by_id", "idempotency_key")
      WHERE "idempotency_key" IS NOT NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "UQ_export_receipts_idempotency"',
    )
    await queryRunner.query(
      'DROP INDEX IF EXISTS "UQ_import_receipts_idempotency"',
    )
    await queryRunner.query(`
      ALTER TABLE "export_receipts"
      DROP COLUMN IF EXISTS "request_hash",
      DROP COLUMN IF EXISTS "idempotency_key"
    `)
    await queryRunner.query(`
      ALTER TABLE "import_receipts"
      DROP COLUMN IF EXISTS "request_hash",
      DROP COLUMN IF EXISTS "idempotency_key"
    `)
  }
}
