CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"credential_version" bigint NOT NULL,
	"created_at" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP(0) NOT NULL,
	"last_seen_at" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP(0) NOT NULL,
	"idle_expires_at" timestamp(0) with time zone NOT NULL,
	"absolute_expires_at" timestamp(0) with time zone NOT NULL,
	"revoked_at" timestamp(0) with time zone,
	CONSTRAINT "sessions_token_hash_key" UNIQUE("token_hash"),
	CONSTRAINT "sessions_token_hash_format" CHECK ("sessions"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "sessions_credential_version_positive" CHECK ("sessions"."credential_version" >= 1),
	CONSTRAINT "sessions_idle_expiry_after_last_seen" CHECK ("sessions"."idle_expires_at" > "sessions"."last_seen_at"),
	CONSTRAINT "sessions_absolute_expiry_after_creation" CHECK ("sessions"."absolute_expires_at" > "sessions"."created_at"),
	CONSTRAINT "sessions_idle_expiry_within_absolute" CHECK ("sessions"."idle_expires_at" <= "sessions"."absolute_expires_at")
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_company_employee_fk" FOREIGN KEY ("company_id","employee_id") REFERENCES "public"."employees"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_company_employee_idx" ON "sessions" USING btree ("company_id","employee_id");--> statement-breakpoint
CREATE INDEX "sessions_idle_expires_at_idx" ON "sessions" USING btree ("idle_expires_at");