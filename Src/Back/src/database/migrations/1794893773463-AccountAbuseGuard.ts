import { MigrationInterface, QueryRunner } from "typeorm";

export class AccountAbuseGuard1794893773463 implements MigrationInterface {
    name = 'AccountAbuseGuard1794893773463'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "mail_sends" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "kind" character varying(20) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_03e922c5ac395085009160d04f4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b1c221be6856a647bf9532a613" ON "mail_sends" ("user_id", "created_at") `);
        await queryRunner.query(`ALTER TABLE "users" ADD "failed_login_count" smallint NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "locked_until" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "mail_sends" ADD CONSTRAINT "FK_6b780c9adb2b36316aa1b4f8bf4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "mail_sends" DROP CONSTRAINT "FK_6b780c9adb2b36316aa1b4f8bf4"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "locked_until"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "failed_login_count"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b1c221be6856a647bf9532a613"`);
        await queryRunner.query(`DROP TABLE "mail_sends"`);
    }

}
