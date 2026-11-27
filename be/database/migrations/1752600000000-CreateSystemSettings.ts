import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateSystemSettings1752600000000 implements MigrationInterface {
  name = 'CreateSystemSettings1752600000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "system_settings" (
        "id" varchar(50) PRIMARY KEY,
        "value" jsonb NOT NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "system_settings"')
  }
}
