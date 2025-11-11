import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTags1762823939674 implements MigrationInterface {
  name = 'AddTags1762823939674';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tags" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(64) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e7dc17249a1148a1970748eda99" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_tags_name" ON "tags" ("name") `,
    );
    await queryRunner.query(
      `CREATE TABLE "item_tags" ("item_id" uuid NOT NULL, "tag_id" uuid NOT NULL, CONSTRAINT "PK_c77c2056c78ecfeecd875046803" PRIMARY KEY ("item_id", "tag_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d1bba39d4371f56d3e5e4ee9b8" ON "item_tags" ("item_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_986c538d3231d4fc0c2bdfc15a" ON "item_tags" ("tag_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "item_tags" ADD CONSTRAINT "FK_d1bba39d4371f56d3e5e4ee9b80" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_tags" ADD CONSTRAINT "FK_986c538d3231d4fc0c2bdfc15ae" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "item_tags" DROP CONSTRAINT "FK_986c538d3231d4fc0c2bdfc15ae"`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_tags" DROP CONSTRAINT "FK_d1bba39d4371f56d3e5e4ee9b80"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_986c538d3231d4fc0c2bdfc15a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d1bba39d4371f56d3e5e4ee9b8"`,
    );
    await queryRunner.query(`DROP TABLE "item_tags"`);
    await queryRunner.query(`DROP INDEX "public"."uq_tags_name"`);
    await queryRunner.query(`DROP TABLE "tags"`);
  }
}
