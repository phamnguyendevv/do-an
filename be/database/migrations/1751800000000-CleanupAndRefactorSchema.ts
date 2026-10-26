import { MigrationInterface, QueryRunner } from 'typeorm'

export class CleanupAndRefactorSchema1751800000000 implements MigrationInterface {
  name = 'CleanupAndRefactorSchema1751800000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ================================================================
    // 1. DROP các bảng dự án cũ (spa/salon) — không dùng trong nhà sách
    // ================================================================
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_messages" CASCADE`)
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_conversations" CASCADE`)
    await queryRunner.query(`DROP TABLE IF EXISTS "favorite_services" CASCADE`)
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE`)
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews" CASCADE`)
    await queryRunner.query(`DROP TABLE IF EXISTS "appointments" CASCADE`)
    await queryRunner.query(`DROP TABLE IF EXISTS "promotion_usage" CASCADE`)
    await queryRunner.query(`DROP TABLE IF EXISTS "payments" CASCADE`)
    await queryRunner.query(`DROP TABLE IF EXISTS "provider_breaks" CASCADE`)
    await queryRunner.query(`DROP TABLE IF EXISTS "provider_availability" CASCADE`)
    await queryRunner.query(`DROP TABLE IF EXISTS "tasks" CASCADE`)
    await queryRunner.query(`DROP TABLE IF EXISTS "services" CASCADE`)
    await queryRunner.query(`DROP TABLE IF EXISTS "provider_profiles" CASCADE`)

    // ================================================================
    // 2. Sửa export_receipts.order_id: VARCHAR(100) → BIGINT
    //    USING: chuyển string số → bigint, giá trị không hợp lệ → NULL
    // ================================================================
    await queryRunner.query(`
      ALTER TABLE "export_receipts"
      ALTER COLUMN "order_id" TYPE bigint
      USING CASE
        WHEN "order_id" ~ '^[0-9]+$' THEN "order_id"::bigint
        ELSE NULL
      END
    `)

    // ================================================================
    // 3. Thêm books.category_id BIGINT (FK tới categories)
    //    Giữ nguyên cột category string để backward compatibility
    // ================================================================
    await queryRunner.query(`
      ALTER TABLE "books"
      ADD COLUMN IF NOT EXISTS "category_id" bigint
    `)

    // Populate category_id từ categories theo tên category hiện tại
    await queryRunner.query(`
      UPDATE "books" b
      SET "category_id" = c.id
      FROM "categories" c
      WHERE c.name = b.category
        AND c.is_deleted = false
        AND b.category_id IS NULL
    `)

    // Index cho category_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_books_category_id"
      ON "books" ("category_id")
    `)

    // ================================================================
    // 4a. FK: books.category_id → categories(id) ON DELETE SET NULL
    // ================================================================
    await queryRunner.query(`
      ALTER TABLE "books"
      ADD CONSTRAINT "FK_books_category_id"
      FOREIGN KEY ("category_id") REFERENCES "categories"("id")
      ON DELETE SET NULL
    `)

    // ================================================================
    // 4b. FK: bookstore_orders.customer_id → customers(id) ON DELETE SET NULL
    //     Clear orphan records trước khi thêm constraint
    // ================================================================
    await queryRunner.query(`
      UPDATE "bookstore_orders" bo
      SET "customer_id" = NULL
      WHERE "customer_id" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "customers" c WHERE c.id = bo.customer_id
        )
    `)
    await queryRunner.query(`
      ALTER TABLE "bookstore_orders"
      ADD CONSTRAINT "FK_bookstore_orders_customer_id"
      FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
      ON DELETE SET NULL
    `)

    // ================================================================
    // 4c. FK: bookstore_orders.promotion_id → promotions(id) ON DELETE SET NULL
    // ================================================================
    await queryRunner.query(`
      UPDATE "bookstore_orders" bo
      SET "promotion_id" = NULL
      WHERE "promotion_id" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "promotions" p WHERE p.id = bo.promotion_id
        )
    `)
    await queryRunner.query(`
      ALTER TABLE "bookstore_orders"
      ADD CONSTRAINT "FK_bookstore_orders_promotion_id"
      FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id")
      ON DELETE SET NULL
    `)

    // ================================================================
    // 4d. FK: order_histories.order_id → bookstore_orders(id) ON DELETE CASCADE
    //     Xóa orphan histories trước
    // ================================================================
    await queryRunner.query(`
      DELETE FROM "order_histories"
      WHERE NOT EXISTS (
        SELECT 1 FROM "bookstore_orders" bo
        WHERE bo.id = order_histories.order_id
      )
    `)
    await queryRunner.query(`
      ALTER TABLE "order_histories"
      ADD CONSTRAINT "FK_order_histories_order_id"
      FOREIGN KEY ("order_id") REFERENCES "bookstore_orders"("id")
      ON DELETE CASCADE
    `)

    // ================================================================
    // 4e. FK: import_receipts.supplier_id → suppliers(id) ON DELETE SET NULL
    // ================================================================
    await queryRunner.query(`
      UPDATE "import_receipts" ir
      SET "supplier_id" = NULL
      WHERE "supplier_id" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "suppliers" s WHERE s.id = ir.supplier_id
        )
    `)
    await queryRunner.query(`
      ALTER TABLE "import_receipts"
      ADD CONSTRAINT "FK_import_receipts_supplier_id"
      FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id")
      ON DELETE SET NULL
    `)

    // ================================================================
    // 4f. FK: stock_movements.book_id → books(id) ON DELETE RESTRICT
    //     Không cho xóa sách khi còn lịch sử biến động tồn kho
    // ================================================================
    await queryRunner.query(`
      ALTER TABLE "stock_movements"
      ADD CONSTRAINT "FK_stock_movements_book_id"
      FOREIGN KEY ("book_id") REFERENCES "books"("id")
      ON DELETE RESTRICT
    `)

    // ================================================================
    // 4g. FK: activity_logs.actor_id → users(id) ON DELETE SET NULL
    //     Giữ log kể cả khi user bị xóa (audit trail)
    // ================================================================
    await queryRunner.query(`
      UPDATE "activity_logs" al
      SET "actor_id" = NULL
      WHERE "actor_id" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "users" u WHERE u.id = al.actor_id
        )
    `)
    await queryRunner.query(`
      ALTER TABLE "activity_logs"
      ADD CONSTRAINT "FK_activity_logs_actor_id"
      FOREIGN KEY ("actor_id") REFERENCES "users"("id")
      ON DELETE SET NULL
    `)

    // ================================================================
    // 5. Index bổ sung cho bookstore_orders
    // ================================================================
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_bookstore_orders_customer_id"
      ON "bookstore_orders" ("customer_id")
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_bookstore_orders_customer_phone"
      ON "bookstore_orders" ("customer_phone")
    `)

    // ================================================================
    // 6. Composite index cho promotions (tìm nhanh promotion đang hiệu lực)
    // ================================================================
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_promotions_active_dates"
      ON "promotions" ("is_active", "starts_at", "ends_at")
    `)

    // ================================================================
    // 7. Tạo bảng payment_transactions (idempotency cho SePay Webhook)
    // ================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_transactions" (
        "id" BIGSERIAL NOT NULL,
        "reference_code" character varying(255) NOT NULL,
        "gateway" character varying(100),
        "account_number" character varying(100),
        "transfer_amount" numeric(14,2) NOT NULL DEFAULT 0,
        "order_code" character varying(100),
        "order_id" bigint,
        "content" text,
        "status" character varying(50) NOT NULL DEFAULT 'SUCCESS',
        "raw_payload" jsonb,
        "processed_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_transactions_id" PRIMARY KEY ("id")
      )
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_payment_transactions_reference_code"
      ON "payment_transactions" ("reference_code")
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payment_transactions_order_id"
      ON "payment_transactions" ("order_id")
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payment_transactions_created_at"
      ON "payment_transactions" ("created_at")
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ================================================================
    // Rollback — xóa FK constraints, bảng mới và columns mới
    // NOTE: Không recreate các bảng cũ của dự án spa/salon
    // ================================================================

    // 7. DROP payment_transactions
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payment_transactions_created_at"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payment_transactions_order_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payment_transactions_reference_code"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_transactions"`)

    // 6. DROP composite index promotions
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_promotions_active_dates"`)

    // 5. DROP index bookstore_orders
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bookstore_orders_customer_phone"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bookstore_orders_customer_id"`)

    // 4g
    await queryRunner.query(
      `ALTER TABLE "activity_logs" DROP CONSTRAINT IF EXISTS "FK_activity_logs_actor_id"`,
    )
    // 4f
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "FK_stock_movements_book_id"`,
    )
    // 4e
    await queryRunner.query(
      `ALTER TABLE "import_receipts" DROP CONSTRAINT IF EXISTS "FK_import_receipts_supplier_id"`,
    )
    // 4d
    await queryRunner.query(
      `ALTER TABLE "order_histories" DROP CONSTRAINT IF EXISTS "FK_order_histories_order_id"`,
    )
    // 4c
    await queryRunner.query(
      `ALTER TABLE "bookstore_orders" DROP CONSTRAINT IF EXISTS "FK_bookstore_orders_promotion_id"`,
    )
    // 4b
    await queryRunner.query(
      `ALTER TABLE "bookstore_orders" DROP CONSTRAINT IF EXISTS "FK_bookstore_orders_customer_id"`,
    )
    // 4a
    await queryRunner.query(
      `ALTER TABLE "books" DROP CONSTRAINT IF EXISTS "FK_books_category_id"`,
    )

    // 3. DROP books.category_id column + index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_books_category_id"`)
    await queryRunner.query(`ALTER TABLE "books" DROP COLUMN IF EXISTS "category_id"`)

    // 2. Revert export_receipts.order_id back to VARCHAR(100)
    await queryRunner.query(`
      ALTER TABLE "export_receipts"
      ALTER COLUMN "order_id" TYPE character varying(100)
      USING CASE
        WHEN "order_id" IS NOT NULL THEN "order_id"::text
        ELSE NULL
      END
    `)
  }
}
