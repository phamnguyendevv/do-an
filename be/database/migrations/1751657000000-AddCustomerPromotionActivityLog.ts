import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCustomerPromotionActivityLog1751657000000 implements MigrationInterface {
  name = 'AddCustomerPromotionActivityLog1751657000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bookstore_orders" ADD COLUMN IF NOT EXISTS "customer_id" bigint`)
    await queryRunner.query(`ALTER TABLE "bookstore_orders" ADD COLUMN IF NOT EXISTS "promotion_id" bigint`)
    await queryRunner.query(`ALTER TABLE "bookstore_orders" ADD COLUMN IF NOT EXISTS "promotion_code" varchar(50)`)
    await queryRunner.query(`CREATE TABLE "customers" ("id" BIGSERIAL NOT NULL, "name" varchar(255) NOT NULL, "phone" varchar(50) NOT NULL, "email" varchar(255), "address" text, "note" text, "total_orders" integer NOT NULL DEFAULT 0, "total_spent" numeric(14,2) NOT NULL DEFAULT 0, "last_order_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_customers_id" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_customers_phone" ON "customers" ("phone")`)
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "promotions" ("id" BIGSERIAL NOT NULL, "code" varchar(50) NOT NULL, "name" varchar(255) NOT NULL, "discount_type" varchar(20) NOT NULL, "discount_value" numeric(14,2) NOT NULL, "min_order_value" numeric(14,2) NOT NULL DEFAULT 0, "max_discount" numeric(14,2), "usage_limit" integer, "used_count" integer NOT NULL DEFAULT 0, "starts_at" TIMESTAMP NOT NULL, "ends_at" TIMESTAMP NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "note" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_promotions_id" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_promotions_code" ON "promotions" ("code")`)
    await queryRunner.query(`CREATE TABLE "activity_logs" ("id" BIGSERIAL NOT NULL, "actor_id" bigint, "actor_name" varchar(255) NOT NULL, "actor_role" varchar(50), "action" varchar(50) NOT NULL, "resource_type" varchar(100) NOT NULL, "resource_id" varchar(100), "description" text, "metadata" jsonb, "ip_address" varchar(64), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_activity_logs_id" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE INDEX "IDX_activity_logs_created_at" ON "activity_logs" ("created_at")`)
    await queryRunner.query(`CREATE INDEX "IDX_activity_logs_actor_id" ON "activity_logs" ("actor_id")`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_activity_logs_actor_id"`)
    await queryRunner.query(`DROP INDEX "IDX_activity_logs_created_at"`)
    await queryRunner.query(`DROP TABLE "activity_logs"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_promotions_code"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "promotions"`)
    await queryRunner.query(`DROP INDEX "IDX_customers_phone"`)
    await queryRunner.query(`DROP TABLE "customers"`)
  }
}
