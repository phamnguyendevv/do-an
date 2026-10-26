import { MigrationInterface, QueryRunner } from 'typeorm'

export class EnhanceDatabaseRelationsPhase1175190000000
  implements MigrationInterface
{
  name = 'EnhanceDatabaseRelationsPhase1175190000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ================================================================
    // 1. DROP các bảng rác cũ còn sót lại từ dự án spa/salon
    // ================================================================
    await queryRunner.query(`DROP TABLE IF EXISTS "invoices" CASCADE`)
    await queryRunner.query(`DROP TABLE IF EXISTS "orders" CASCADE`)
    await queryRunner.query(`DROP TYPE IF EXISTS "invoices_status_enum" CASCADE`)

    // ================================================================
    // 2. FK: export_receipts.order_id -> bookstore_orders(id)
    // ================================================================
    await queryRunner.query(`
      UPDATE "export_receipts" er
      SET "order_id" = NULL
      WHERE "order_id" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "bookstore_orders" bo WHERE bo.id = er.order_id
        )
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_export_receipts_order_id"
      ON "export_receipts" ("order_id")
    `)
    await queryRunner.query(`
      ALTER TABLE "export_receipts"
      ADD CONSTRAINT "FK_export_receipts_order_id"
      FOREIGN KEY ("order_id") REFERENCES "bookstore_orders"("id")
      ON DELETE SET NULL
    `)

    // ================================================================
    // 3. FK: payment_transactions.order_id -> bookstore_orders(id)
    // ================================================================
    await queryRunner.query(`
      UPDATE "payment_transactions" pt
      SET "order_id" = NULL
      WHERE "order_id" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "bookstore_orders" bo WHERE bo.id = pt.order_id
        )
    `)
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
      ADD CONSTRAINT "FK_payment_transactions_order_id"
      FOREIGN KEY ("order_id") REFERENCES "bookstore_orders"("id")
      ON DELETE SET NULL
    `)

    // ================================================================
    // 4. import_receipts: thêm created_by_id BIGINT và FK -> users(id)
    // ================================================================
    await queryRunner.query(`
      ALTER TABLE "import_receipts"
      ADD COLUMN IF NOT EXISTS "created_by_id" bigint
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_import_receipts_created_by_id"
      ON "import_receipts" ("created_by_id")
    `)
    await queryRunner.query(`
      ALTER TABLE "import_receipts"
      ADD CONSTRAINT "FK_import_receipts_created_by_id"
      FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL
    `)

    // ================================================================
    // 5. export_receipts: thêm created_by_id BIGINT và FK -> users(id)
    // ================================================================
    await queryRunner.query(`
      ALTER TABLE "export_receipts"
      ADD COLUMN IF NOT EXISTS "created_by_id" bigint
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_export_receipts_created_by_id"
      ON "export_receipts" ("created_by_id")
    `)
    await queryRunner.query(`
      ALTER TABLE "export_receipts"
      ADD CONSTRAINT "FK_export_receipts_created_by_id"
      FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL
    `)

    // ================================================================
    // 6. stock_movements: thêm created_by_id BIGINT và FK -> users(id)
    // ================================================================
    await queryRunner.query(`
      ALTER TABLE "stock_movements"
      ADD COLUMN IF NOT EXISTS "created_by_id" bigint
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_stock_movements_created_by_id"
      ON "stock_movements" ("created_by_id")
    `)
    await queryRunner.query(`
      ALTER TABLE "stock_movements"
      ADD CONSTRAINT "FK_stock_movements_created_by_id"
      FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL
    `)

    // ================================================================
    // 7. stock_audits: thêm audited_by_id BIGINT và FK -> users(id)
    // ================================================================
    await queryRunner.query(`
      ALTER TABLE "stock_audits"
      ADD COLUMN IF NOT EXISTS "audited_by_id" bigint
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_stock_audits_audited_by_id"
      ON "stock_audits" ("audited_by_id")
    `)
    await queryRunner.query(`
      ALTER TABLE "stock_audits"
      ADD CONSTRAINT "FK_stock_audits_audited_by_id"
      FOREIGN KEY ("audited_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL
    `)

    // ================================================================
    // 8. activity_logs: FK actor_id -> users(id)
    // ================================================================
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_activity_logs_actor_id' AND table_name = 'activity_logs'
        ) THEN
          ALTER TABLE "activity_logs"
          ADD CONSTRAINT "FK_activity_logs_actor_id"
          FOREIGN KEY ("actor_id") REFERENCES "users"("id")
          ON DELETE SET NULL;
        END IF;
      END $$;
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 7. Revert stock_audits.audited_by_id
    await queryRunner.query(
      `ALTER TABLE "stock_audits" DROP CONSTRAINT IF EXISTS "FK_stock_audits_audited_by_id"`,
    )
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_stock_audits_audited_by_id"`,
    )
    await queryRunner.query(
      `ALTER TABLE "stock_audits" DROP COLUMN IF EXISTS "audited_by_id"`,
    )

    // 6. Revert stock_movements.created_by_id
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "FK_stock_movements_created_by_id"`,
    )
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_stock_movements_created_by_id"`,
    )
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP COLUMN IF EXISTS "created_by_id"`,
    )

    // 5. Revert export_receipts.created_by_id
    await queryRunner.query(
      `ALTER TABLE "export_receipts" DROP CONSTRAINT IF EXISTS "FK_export_receipts_created_by_id"`,
    )
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_export_receipts_created_by_id"`,
    )
    await queryRunner.query(
      `ALTER TABLE "export_receipts" DROP COLUMN IF EXISTS "created_by_id"`,
    )

    // 4. Revert import_receipts.created_by_id
    await queryRunner.query(
      `ALTER TABLE "import_receipts" DROP CONSTRAINT IF EXISTS "FK_import_receipts_created_by_id"`,
    )
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_import_receipts_created_by_id"`,
    )
    await queryRunner.query(
      `ALTER TABLE "import_receipts" DROP COLUMN IF EXISTS "created_by_id"`,
    )

    // 3. Revert payment_transactions.order_id FK
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" DROP CONSTRAINT IF EXISTS "FK_payment_transactions_order_id"`,
    )

    // 2. Revert export_receipts.order_id FK
    await queryRunner.query(
      `ALTER TABLE "export_receipts" DROP CONSTRAINT IF EXISTS "FK_export_receipts_order_id"`,
    )
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_export_receipts_order_id"`,
    )
  }
}
