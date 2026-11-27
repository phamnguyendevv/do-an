import { MigrationInterface, QueryRunner } from 'typeorm'

export class UseTimezoneAwareNotificationDates1752500000000
  implements MigrationInterface
{
  name = 'UseTimezoneAwareNotificationDates1752500000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('notifications'))) return
    await queryRunner.query(`SELECT pg_advisory_xact_lock(1752500000000)`)
    const columns: Array<{ data_type: string }> = await queryRunner.query(
      `SELECT data_type FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'created_at'`,
    )
    if (columns[0]?.data_type === 'timestamp with time zone') return
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE current_setting('TIMEZONE')`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('notifications'))) return
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "created_at" TYPE timestamp USING "created_at" AT TIME ZONE current_setting('TIMEZONE')`,
    )
  }
}
