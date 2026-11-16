import { MigrationInterface, QueryRunner } from "typeorm";

export class UsernameAndPasswordReset1794823009289 implements MigrationInterface {
    name = 'UsernameAndPasswordReset1794823009289'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 기존 회원에게는 id 앞 12자리로 만든 임시 아이디('u' + 16진수)를 준다. 규칙(소문자로 시작, 4~20자)을 지킨다.
        // 새 아이디를 정하려는 사용자는 아이디 찾기 메일로 이 값을 확인한다.
        await queryRunner.query(`ALTER TABLE "users" ADD "username" character varying(20)`);
        await queryRunner.query(`UPDATE "users" SET "username" = 'u' || substr(replace("id"::text, '-', ''), 1, 12) WHERE "username" IS NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username")`);
        await queryRunner.query(`ALTER TABLE "email_verifications" ADD "purpose" character varying(20) NOT NULL DEFAULT 'EMAIL_VERIFY'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "email_verifications" DROP COLUMN "purpose"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "username"`);
    }

}
