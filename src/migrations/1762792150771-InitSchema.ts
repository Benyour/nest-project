import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1762792150771 implements MigrationInterface {
    name = 'InitSchema1762792150771'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(128) NOT NULL, "password" character varying(255) NOT NULL, "name" character varying(64) NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'active', "avatar_url" character varying(255), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_users_email" ON "users" ("email") `);
        await queryRunner.query(`CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(64) NOT NULL, "icon" character varying(64), "sort_order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "parentId" uuid, CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "locations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(64) NOT NULL, "description" character varying(128), "sort_order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "parentId" uuid, CONSTRAINT "PK_7cc1c9e3853b94816c094825e74" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(128) NOT NULL, "code" character varying(64), "brand" character varying(64), "specification" character varying(128), "unit" character varying(16) NOT NULL, "shelf_life_days" integer, "imageUrl" character varying(255), "remarks" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "categoryId" uuid NOT NULL, "defaultLocationId" uuid, CONSTRAINT "UQ_1b0a705ce0dc5430c020a0ec31f" UNIQUE ("code"), CONSTRAINT "PK_ba5885359424c15ca6b9e79bcf6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_items_name" ON "items" ("name") `);
        await queryRunner.query(`CREATE TABLE "usage_record_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quantity" numeric(18,2) NOT NULL, "remarks" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "recordId" uuid NOT NULL, "itemId" uuid NOT NULL, "locationId" uuid NOT NULL, CONSTRAINT "PK_0dca803e32ece244d38f4b454ec" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "usage_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "usage_date" date NOT NULL, "type" character varying(16) NOT NULL DEFAULT 'daily', "status" character varying(16) NOT NULL DEFAULT 'draft', "remarks" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "createdById" uuid NOT NULL, CONSTRAINT "PK_e511cf9f7dc53851569f87467a5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "purchase_record_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quantity" numeric(18,2) NOT NULL, "unit_price" numeric(18,2), "total_price" numeric(18,2), "expiry_date" date, "remarks" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "recordId" uuid NOT NULL, "itemId" uuid NOT NULL, "locationId" uuid NOT NULL, CONSTRAINT "PK_a5fe2f1c78fb44fa8b8e195900e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "purchase_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(32) NOT NULL, "purchase_date" date NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'draft', "store_name" character varying(128), "store_type" character varying(16), "remarks" character varying(255), "total_amount" numeric(18,2) NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "createdById" uuid NOT NULL, CONSTRAINT "UQ_753d8b9129e2484cecdd7bf6243" UNIQUE ("code"), CONSTRAINT "PK_400ded2dbed2bc4ba1f60a202b8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "stock" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quantity" numeric(18,2) NOT NULL DEFAULT '0', "min_quantity" numeric(18,2) NOT NULL DEFAULT '0', "latest_purchase_price" numeric(18,2), "latest_purchase_date" date, "expiry_date" date, "memo" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "itemId" uuid NOT NULL, "locationId" uuid NOT NULL, CONSTRAINT "uq_stock_item_location" UNIQUE ("itemId", "locationId"), CONSTRAINT "PK_092bc1fc7d860426a1dec5aa8e9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_stock_item" ON "stock" ("itemId") `);
        await queryRunner.query(`CREATE INDEX "idx_stock_location" ON "stock" ("locationId") `);
        await queryRunner.query(`CREATE TABLE "stock_adjustments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying(32) NOT NULL, "quantity_before" numeric(18,2) NOT NULL, "quantity_after" numeric(18,2) NOT NULL, "delta" numeric(18,2) NOT NULL, "reason" character varying(64), "remarks" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "stockId" uuid NOT NULL, "created_by" uuid, CONSTRAINT "PK_7dc03d92f242dd489d33b80d063" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_9a6f051e66982b5f0318981bcaa" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "locations" ADD CONSTRAINT "FK_9f238930bae84c7eafad3785d7b" FOREIGN KEY ("parentId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "items" ADD CONSTRAINT "FK_788929ed61ab78bb914f0d1931b" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "items" ADD CONSTRAINT "FK_b5370c1c1b56e3f3ef84038096e" FOREIGN KEY ("defaultLocationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "usage_record_items" ADD CONSTRAINT "FK_a2cdc33b35cd547c081d2263924" FOREIGN KEY ("recordId") REFERENCES "usage_records"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "usage_record_items" ADD CONSTRAINT "FK_2126dea8728dd5d85bd373849f4" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "usage_record_items" ADD CONSTRAINT "FK_d44fa391b893e0137ae88354288" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "usage_records" ADD CONSTRAINT "FK_f7243be3cb838b13d4f2a63dc9a" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "purchase_record_items" ADD CONSTRAINT "FK_1ec83e287b7c5b5c31bdf2ad4fc" FOREIGN KEY ("recordId") REFERENCES "purchase_records"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "purchase_record_items" ADD CONSTRAINT "FK_1ec58e124d6fbf4a98295c98557" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "purchase_record_items" ADD CONSTRAINT "FK_70fe48786dcb4a8035e857e5942" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "purchase_records" ADD CONSTRAINT "FK_0e255e9890f49fcf4d673545c0a" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stock" ADD CONSTRAINT "FK_623dbc561abc7fade5a85931712" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stock" ADD CONSTRAINT "FK_9092d6a8d81644af4a17c5ee9fc" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stock_adjustments" ADD CONSTRAINT "FK_cf5fdde818126d81389ed52bb50" FOREIGN KEY ("stockId") REFERENCES "stock"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stock_adjustments" ADD CONSTRAINT "FK_ffcab531cd75f7559af2f209038" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "stock_adjustments" DROP CONSTRAINT "FK_ffcab531cd75f7559af2f209038"`);
        await queryRunner.query(`ALTER TABLE "stock_adjustments" DROP CONSTRAINT "FK_cf5fdde818126d81389ed52bb50"`);
        await queryRunner.query(`ALTER TABLE "stock" DROP CONSTRAINT "FK_9092d6a8d81644af4a17c5ee9fc"`);
        await queryRunner.query(`ALTER TABLE "stock" DROP CONSTRAINT "FK_623dbc561abc7fade5a85931712"`);
        await queryRunner.query(`ALTER TABLE "purchase_records" DROP CONSTRAINT "FK_0e255e9890f49fcf4d673545c0a"`);
        await queryRunner.query(`ALTER TABLE "purchase_record_items" DROP CONSTRAINT "FK_70fe48786dcb4a8035e857e5942"`);
        await queryRunner.query(`ALTER TABLE "purchase_record_items" DROP CONSTRAINT "FK_1ec58e124d6fbf4a98295c98557"`);
        await queryRunner.query(`ALTER TABLE "purchase_record_items" DROP CONSTRAINT "FK_1ec83e287b7c5b5c31bdf2ad4fc"`);
        await queryRunner.query(`ALTER TABLE "usage_records" DROP CONSTRAINT "FK_f7243be3cb838b13d4f2a63dc9a"`);
        await queryRunner.query(`ALTER TABLE "usage_record_items" DROP CONSTRAINT "FK_d44fa391b893e0137ae88354288"`);
        await queryRunner.query(`ALTER TABLE "usage_record_items" DROP CONSTRAINT "FK_2126dea8728dd5d85bd373849f4"`);
        await queryRunner.query(`ALTER TABLE "usage_record_items" DROP CONSTRAINT "FK_a2cdc33b35cd547c081d2263924"`);
        await queryRunner.query(`ALTER TABLE "items" DROP CONSTRAINT "FK_b5370c1c1b56e3f3ef84038096e"`);
        await queryRunner.query(`ALTER TABLE "items" DROP CONSTRAINT "FK_788929ed61ab78bb914f0d1931b"`);
        await queryRunner.query(`ALTER TABLE "locations" DROP CONSTRAINT "FK_9f238930bae84c7eafad3785d7b"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_9a6f051e66982b5f0318981bcaa"`);
        await queryRunner.query(`DROP TABLE "stock_adjustments"`);
        await queryRunner.query(`DROP INDEX "public"."idx_stock_location"`);
        await queryRunner.query(`DROP INDEX "public"."idx_stock_item"`);
        await queryRunner.query(`DROP TABLE "stock"`);
        await queryRunner.query(`DROP TABLE "purchase_records"`);
        await queryRunner.query(`DROP TABLE "purchase_record_items"`);
        await queryRunner.query(`DROP TABLE "usage_records"`);
        await queryRunner.query(`DROP TABLE "usage_record_items"`);
        await queryRunner.query(`DROP INDEX "public"."idx_items_name"`);
        await queryRunner.query(`DROP TABLE "items"`);
        await queryRunner.query(`DROP TABLE "locations"`);
        await queryRunner.query(`DROP TABLE "categories"`);
        await queryRunner.query(`DROP INDEX "public"."idx_users_email"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
