import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1794579453508 implements MigrationInterface {
    name = 'InitialSchema1794579453508'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "auth_providers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "provider" character varying(20) NOT NULL, "provider_user_id" character varying(100) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_23ce9b23329d07057ec8ece6f26" UNIQUE ("provider", "provider_user_id"), CONSTRAINT "PK_cb277e892a115855fc95c373422" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token_hash" character varying(128) NOT NULL, "device_id" character varying(100), "issued_at" TIMESTAMP WITH TIME ZONE NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "replaced_by" uuid, CONSTRAINT "UQ_a7838d2ba25be1342091b6695f1" UNIQUE ("token_hash"), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ba3bd69c8ad1e799c0256e9e50" ON "refresh_tokens" ("expires_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_f952ac8e66871f2aaf49e0639e" ON "refresh_tokens" ("user_id", "device_id") `);
        await queryRunner.query(`CREATE TABLE "terms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying(20) NOT NULL, "version" character varying(20) NOT NULL, "required" boolean NOT NULL, "title" character varying(100) NOT NULL, "url" character varying(500) NOT NULL, "effective_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_fec97e3c1900fc4e8d427e1fd2b" UNIQUE ("type", "version"), CONSTRAINT "PK_33b6fe77d6ace7ff43cc8a65958" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "terms_agreements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "terms_id" uuid NOT NULL, "agreed" boolean NOT NULL, "agreed_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "UQ_7ebe89fb13bb831acfc95589377" UNIQUE ("user_id", "terms_id"), CONSTRAINT "PK_75ccbbfe9ceb34f05dc0df9cc83" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255), "password_hash" character varying(255), "name" character varying(50) NOT NULL, "birthdate" date NOT NULL, "gender" character varying(10) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "model_releases" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying(10) NOT NULL, "task" character varying(30), "version" character varying(20) NOT NULL, "filename" character varying(200) NOT NULL, "size_bytes" bigint NOT NULL, "sha256" character(64) NOT NULL, "base_model_sha256" character(64), "quantization" character varying(20) NOT NULL, "min_app_version" character varying(20) NOT NULL, "storage_key" character varying(300) NOT NULL, "rollout_percent" smallint NOT NULL DEFAULT '100', "status" character varying(20) NOT NULL DEFAULT 'DRAFT', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_91d75c2394a49d3b3a213fb4d5b" UNIQUE ("storage_key"), CONSTRAINT "PK_6631637124e2db7f71a94420d7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5a3742dd394d5c9967de1a2afe" ON "model_releases" ("status", "type", "created_at") `);
        await queryRunner.query(`CREATE TABLE "app_versions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "platform" character varying(10) NOT NULL, "latest_version" character varying(20) NOT NULL, "min_supported_version" character varying(20) NOT NULL, "store_url" character varying(500) NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_764a2ab4e49ad36d1f9eca9cc9f" UNIQUE ("platform"), CONSTRAINT "PK_8d36b0dcf0c026c7aad923c80fd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "auth_providers" ADD CONSTRAINT "FK_262996fd08ab5a69e85b53d0055" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_444f2e9fbaaba23a2bfb7efd8d7" FOREIGN KEY ("replaced_by") REFERENCES "refresh_tokens"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "terms_agreements" ADD CONSTRAINT "FK_3522a3bdfc9a9886bf5abaa8a0e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "terms_agreements" ADD CONSTRAINT "FK_550254fdd15b1af21a7b70ad347" FOREIGN KEY ("terms_id") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "terms_agreements" DROP CONSTRAINT "FK_550254fdd15b1af21a7b70ad347"`);
        await queryRunner.query(`ALTER TABLE "terms_agreements" DROP CONSTRAINT "FK_3522a3bdfc9a9886bf5abaa8a0e"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_444f2e9fbaaba23a2bfb7efd8d7"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`);
        await queryRunner.query(`ALTER TABLE "auth_providers" DROP CONSTRAINT "FK_262996fd08ab5a69e85b53d0055"`);
        await queryRunner.query(`DROP TABLE "app_versions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5a3742dd394d5c9967de1a2afe"`);
        await queryRunner.query(`DROP TABLE "model_releases"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "terms_agreements"`);
        await queryRunner.query(`DROP TABLE "terms"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f952ac8e66871f2aaf49e0639e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ba3bd69c8ad1e799c0256e9e50"`);
        await queryRunner.query(`DROP TABLE "refresh_tokens"`);
        await queryRunner.query(`DROP TABLE "auth_providers"`);
    }

}
