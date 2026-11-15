import { MigrationInterface, QueryRunner } from 'typeorm'

export class AllowPerUserNotifications1752400000000
  implements MigrationInterface
{
  name = 'AllowPerUserNotifications1752400000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('notifications'))) return
    await queryRunner.query(`SELECT pg_advisory_xact_lock(1752400000000)`)
    const primaryKeys: Array<{ conname: string; definition: string }> =
      await queryRunner.query(
        `SELECT conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid = 'notifications'::regclass AND contype = 'p'`,
      )
    if (
      primaryKeys.some(({ definition }) =>
        definition.includes('("id", "actor_id")'),
      )
    ) {
      return
    }
    for (const { conname } of primaryKeys) {
      await queryRunner.query(
        `ALTER TABLE "notifications" DROP CONSTRAINT "${conname.replace(/"/g, '""')}"`,
      )
    }
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "PK_notifications_id_actor_id" PRIMARY KEY ("id", "actor_id")`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('notifications'))) return
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "PK_notifications_id_actor_id"`,
    )
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id")`,
    )
  }
}
