import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateNotifications1752300000000 implements MigrationInterface {
  name = 'CreateNotifications1752300000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "notifications" ("id" varchar(64) NOT NULL, "actor_id" bigint NOT NULL, "title" varchar(160) NOT NULL, "description" text NOT NULL, "module" varchar(80) NOT NULL, "tone" varchar(16) NOT NULL DEFAULT 'info', "read" boolean NOT NULL DEFAULT false, "route" varchar(255), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_actor_created_at" ON "notifications" ("actor_id", "created_at")`,
    )
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_actor_read" ON "notifications" ("actor_id", "read")`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notifications_actor_read"`,
    )
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notifications_actor_created_at"`,
    )
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`)
  }
}
