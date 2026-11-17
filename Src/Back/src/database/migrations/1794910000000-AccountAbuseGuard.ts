import { MigrationInterface, QueryRunner } from "typeorm";

export class AccountAbuseGuard1794910000000 implements MigrationInterface {
    name = 'AccountAbuseGuard1794910000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 로그인 실패 잠금
        await queryRunner.query(`ALTER TABLE "users" ADD "failed_login_count" smallint NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "locked_until" TIMESTAMP WITH TIME ZONE`);
        // 이메일 주소별 메일 발송 제한(주소는 해시로만 저장)
        await queryRunner.query(`CREATE TABLE "mail_sends" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character(64) NOT NULL, "kind" character varying(20) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_03e922c5ac395085009160d04f4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_630a0cf901ee08b75db623a00f" ON "mail_sends" ("key", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_206edce3c9fefab40248ec65cc" ON "mail_sends" ("created_at") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_206edce3c9fefab40248ec65cc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_630a0cf901ee08b75db623a00f"`);
        await queryRunner.query(`DROP TABLE "mail_sends"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "locked_until"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "failed_login_count"`);
    }

}
