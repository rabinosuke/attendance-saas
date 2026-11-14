CREATE TYPE "public"."employee_status" AS ENUM('invited', 'active', 'suspended', 'retired');--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"login_id_norm" varchar(32) NOT NULL,
	"full_name" varchar(200) NOT NULL,
	"email" varchar(254) NOT NULL,
	"password_hash" text,
	"status" "employee_status" DEFAULT 'invited' NOT NULL,
	"employee_code" varchar(64),
	"joined_on" date,
	"left_on" date,
	"available_from" date NOT NULL,
	"credential_version" bigint DEFAULT 1 NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"created_at" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP(0) NOT NULL,
	"updated_at" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP(0) NOT NULL,
	CONSTRAINT "employees_company_id_id_key" UNIQUE("company_id","id"),
	CONSTRAINT "employees_company_login_id_key" UNIQUE("company_id","login_id_norm"),
	CONSTRAINT "employees_company_employee_code_key" UNIQUE("company_id","employee_code"),
	CONSTRAINT "employees_login_id_not_blank" CHECK (btrim("employees"."login_id_norm") <> ''),
	CONSTRAINT "employees_full_name_not_blank" CHECK (btrim("employees"."full_name") <> ''),
	CONSTRAINT "employees_email_not_blank" CHECK (btrim("employees"."email") <> ''),
	CONSTRAINT "employees_employment_dates_order" CHECK ("employees"."left_on" >= "employees"."joined_on"),
	CONSTRAINT "employees_credential_version_positive" CHECK ("employees"."credential_version" >= 1),
	CONSTRAINT "employees_row_version_positive" CHECK ("employees"."row_version" >= 1),
	CONSTRAINT "employees_active_requires_password_hash" CHECK ("employees"."status" <> 'active' OR ("employees"."password_hash" IS NOT NULL AND btrim("employees"."password_hash") <> ''))
);
--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;