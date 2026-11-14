-- Drizzle定義から生成。照合順序と日本語DBコメントを適用前に補完。
CREATE TYPE "public"."company_status" AS ENUM('setting', 'active', 'suspended');--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_code_norm" varchar(32) COLLATE "C" NOT NULL,
	"name" varchar(200) NOT NULL,
	"status" "company_status" DEFAULT 'setting' NOT NULL,
	"next_login_sequence" bigint DEFAULT 1 NOT NULL,
	"created_at" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP(0) NOT NULL,
	"updated_at" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP(0) NOT NULL,
	CONSTRAINT "companies_company_code_norm_key" UNIQUE("company_code_norm"),
	CONSTRAINT "companies_company_code_format" CHECK ("companies"."company_code_norm" ~ '^[a-z0-9_-]{3,32}$'),
	CONSTRAINT "companies_name_not_blank" CHECK (btrim("companies"."name") <> ''),
	CONSTRAINT "companies_next_login_sequence_positive" CHECK ("companies"."next_login_sequence" >= 1)
);

--> statement-breakpoint
COMMENT ON TABLE "public"."companies" IS '会社マスタ';

--> statement-breakpoint
COMMENT ON COLUMN "public"."companies"."id" IS '会社内部ID。アプリ側で生成するUUID';

--> statement-breakpoint
COMMENT ON COLUMN "public"."companies"."company_code_norm" IS 'ログイン用会社ID。小文字化済み・全体で一意';

--> statement-breakpoint
COMMENT ON COLUMN "public"."companies"."name" IS '会社名。同名の会社を許可';

--> statement-breakpoint
COMMENT ON COLUMN "public"."companies"."status" IS 'setting=初期設定中、active=利用中、suspended=停止中';

--> statement-breakpoint
COMMENT ON COLUMN "public"."companies"."next_login_sequence" IS '本人IDが空欄の場合に使う、次の自動採番値';

--> statement-breakpoint
COMMENT ON COLUMN "public"."companies"."created_at" IS '作成日時';

--> statement-breakpoint
COMMENT ON COLUMN "public"."companies"."updated_at" IS '更新日時。アプリ側で明示的に更新する';
