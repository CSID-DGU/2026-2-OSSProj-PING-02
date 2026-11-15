import { MigrationInterface, QueryRunner } from "typeorm";

export class EmailVerificationAndSessions1794632494868 implements MigrationInterface {
    name = 'EmailVerificationAndSessions1794632494868'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "email_verifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "code_hash" character(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "attempts" smallint NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c1ea2921e767f83cd44c0af203f" PRIMARY KEY ("id"))`);
        // 기존 행은 각자 한 세션으로 본다(session_id = id). 그 뒤 NOT NULL 로 바꾼다.
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD "session_id" uuid`);
        await queryRunner.query(`UPDATE "refresh_tokens" SET "session_id" = "id" WHERE "session_id" IS NULL`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ALTER COLUMN "session_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD "email_verified_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`CREATE INDEX "IDX_3bf308fa93da3966f9e76fcfba" ON "refresh_tokens" ("session_id") `);
        await queryRunner.query(`ALTER TABLE "email_verifications" ADD CONSTRAINT "FK_c4f1838323ae1dff5aa00148915" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "email_verifications" DROP CONSTRAINT "FK_c4f1838323ae1dff5aa00148915"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3bf308fa93da3966f9e76fcfba"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email_verified_at"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP COLUMN "session_id"`);
        await queryRunner.query(`DROP TABLE "email_verifications"`);
    }

}
