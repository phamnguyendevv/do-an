import { MigrationInterface, QueryRunner } from 'typeorm'

export class $MIGRATIONNAME1751653519236 implements MigrationInterface {
  name = ' $MIGRATIONNAME1751653519236'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "provider_profiles" ("id" BIGSERIAL NOT NULL, "user_id" integer NOT NULL, "business_name" character varying(255) NOT NULL, "business_description" text, "bank_account_info" jsonb, "commission_rate" numeric(5,2) NOT NULL DEFAULT '10', "is_verified" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_provider_profiles_id" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "services" ("id" BIGSERIAL NOT NULL, "provider_id" integer NOT NULL, "category_id" integer NOT NULL, "name" character varying(255) NOT NULL, "description" text, "price" numeric(10,2) NOT NULL, "duration" integer NOT NULL, "images" jsonb, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_services_id" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "users" ("id" BIGSERIAL NOT NULL, "username" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "password" text NOT NULL, "role" smallint NOT NULL DEFAULT '3', "status" smallint NOT NULL DEFAULT '1', "email_verified" character varying(255) NOT NULL, "last_login" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_users_id" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email") `,
    )
    await queryRunner.query(
      `CREATE TABLE "provider_availability" ("id" BIGSERIAL NOT NULL, "provider_id" integer NOT NULL, "day_of_week" smallint NOT NULL, "start_time" TIME NOT NULL, "end_time" TIME NOT NULL, "is_available" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_a34052ac81ca624ace364023c32" UNIQUE ("provider_id", "day_of_week"), CONSTRAINT "PK_provider_availability_id" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "tasks" ("id" BIGSERIAL NOT NULL, "user_id" bigint NOT NULL, "title" character varying(255) NOT NULL, "description" text, "status" smallint NOT NULL DEFAULT '3', "due_date" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_tasks_id" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_tasks_user_id" ON "tasks" ("user_id") `,
    )
    await queryRunner.query(
      `CREATE TABLE "promotion_usage" ("id" BIGSERIAL NOT NULL, "promotion_id" integer NOT NULL, "appointment_id" integer NOT NULL, "client_id" integer NOT NULL, "discount_amount" numeric(10,2) NOT NULL, "used_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_promotion_usage_id" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "provider_breaks" ("id" BIGSERIAL NOT NULL, "provider_id" integer NOT NULL, "break_date" date NOT NULL, "start_time" TIME NOT NULL, "end_time" TIME NOT NULL, "reason" character varying(255), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_provider_breaks_id" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "reviews" ("id" BIGSERIAL NOT NULL, "appointment_id" integer NOT NULL, "client_id" integer NOT NULL, "provider_id" integer NOT NULL, "service_id" integer NOT NULL, "rating" integer NOT NULL, "comment" text, "is_public" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_reviews_id" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "promotions" ("id" BIGSERIAL NOT NULL, "provider_id" integer NOT NULL, "code" character varying(50) NOT NULL, "name" character varying(255) NOT NULL, "description" text, "discount_type" smallint NOT NULL, "discount_value" numeric(10,2) NOT NULL, "min_amount" numeric(10,2) NOT NULL DEFAULT '0', "max_discount" numeric(10,2), "usage_limit" integer, "used_count" integer NOT NULL DEFAULT '0', "start_date" date NOT NULL, "end_date" date NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8ab10e580f70c3d2e2e4b31ebf2" UNIQUE ("code"), CONSTRAINT "PK_promotions_id" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."chat_messages_message_type_enum" AS ENUM('1', '2', '3')`,
    )
    await queryRunner.query(
      `CREATE TABLE "chat_messages" ("id" BIGSERIAL NOT NULL, "conversation_id" integer NOT NULL, "sender_id" integer NOT NULL, "message" text NOT NULL, "message_type" "public"."chat_messages_message_type_enum" NOT NULL DEFAULT '1', "attachment_url" character varying(500), "is_read" boolean NOT NULL DEFAULT false, "read_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_chat_messages_id" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" BIGSERIAL NOT NULL, "user_id" integer NOT NULL, "type" smallint NOT NULL, "title" character varying(255) NOT NULL, "message" text NOT NULL, "data" jsonb, "is_read" boolean NOT NULL DEFAULT false, "read_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "favorite_services" ("id" BIGSERIAL NOT NULL, "client_id" integer NOT NULL, "service_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_091c48d4500e806b3537637d0d3" UNIQUE ("client_id", "service_id"), CONSTRAINT "PK_favorite_services_id" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "chat_conversations" ("id" BIGSERIAL NOT NULL, "client_id" integer NOT NULL, "provider_id" integer NOT NULL, "last_message_at" TIMESTAMP NOT NULL DEFAULT now(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_5a53534307edbdb0c7b0e18bb15" UNIQUE ("client_id", "provider_id"), CONSTRAINT "PK_chat_conversations_id" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "payments" ("id" BIGSERIAL NOT NULL, "appointment_id" integer NOT NULL, "stripe_payment_id" character varying(255), "stripe_session_id" character varying(255), "amount" numeric(10,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'USD', "status" smallint NOT NULL DEFAULT '1', "payment_method" smallint NOT NULL DEFAULT '1', "payment_date" TIMESTAMP, "refund_amount" numeric(10,2) NOT NULL DEFAULT '0', "refund_date" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_payments_id" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "categories" ("id" BIGSERIAL NOT NULL, "name" character varying(255) NOT NULL, "description" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_categories_id" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."appointments_status_enum" AS ENUM('1', '2', '3', '4', '5')`,
    )
    await queryRunner.query(
      `CREATE TABLE "appointments" ("id" BIGSERIAL NOT NULL, "client_id" integer NOT NULL, "provider_id" integer NOT NULL, "service_id" integer NOT NULL, "appointment_date" date NOT NULL, "appointment_time" TIME NOT NULL, "duration" integer NOT NULL, "status" "public"."appointments_status_enum" NOT NULL DEFAULT '1', "notes" text, "cancellation_reason" text, "total_amount" numeric(10,2) NOT NULL, "commission_amount" numeric(10,2) NOT NULL, "provider_amount" numeric(10,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_appointments_id" PRIMARY KEY ("id"))`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "appointments"`)
    await queryRunner.query(`DROP TYPE "public"."appointments_status_enum"`)
    await queryRunner.query(`DROP TABLE "categories"`)
    await queryRunner.query(`DROP TABLE "payments"`)
    await queryRunner.query(`DROP TABLE "chat_conversations"`)
    await queryRunner.query(`DROP TABLE "favorite_services"`)
    await queryRunner.query(`DROP TABLE "notifications"`)
    await queryRunner.query(`DROP TABLE "chat_messages"`)
    await queryRunner.query(
      `DROP TYPE "public"."chat_messages_message_type_enum"`,
    )
    await queryRunner.query(`DROP TABLE "promotions"`)
    await queryRunner.query(`DROP TABLE "reviews"`)
    await queryRunner.query(`DROP TABLE "provider_breaks"`)
    await queryRunner.query(`DROP TABLE "promotion_usage"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_tasks_user_id"`)
    await queryRunner.query(`DROP TABLE "tasks"`)
    await queryRunner.query(`DROP TABLE "provider_availability"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_users_email"`)
    await queryRunner.query(`DROP TABLE "users"`)
    await queryRunner.query(`DROP TABLE "services"`)
    await queryRunner.query(`DROP TABLE "provider_profiles"`)
  }
}
