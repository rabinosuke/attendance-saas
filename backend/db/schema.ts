import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// 会社の利用状態：初期設定中・利用中・停止中。
export const companyStatus = pgEnum("company_status", [
  "setting",
  "active",
  "suspended",
]);

// 社員アカウントの利用状態：招待中・利用中・停止中・退職済み。
export const employeeStatus = pgEnum("employee_status", [
  "invited",
  "active",
  "suspended",
  "retired",
]);

// 会社マスタ。UUIDの発行と更新日時の変更はアプリ側で行う。
// company_code_normのCOLLATE "C"と日本語DBコメントは初回SQLに補完する。
export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey(),
    companyCodeNorm: varchar("company_code_norm", { length: 32 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    status: companyStatus("status").default("setting").notNull(),
    nextLoginSequence: bigint("next_login_sequence", { mode: "number" })
      .default(1)
      .notNull(),
    createdAt: timestamp("created_at", {
      precision: 0,
      withTimezone: true,
      mode: "string",
    })
      .default(sql`CURRENT_TIMESTAMP(0)`)
      .notNull(),
    updatedAt: timestamp("updated_at", {
      precision: 0,
      withTimezone: true,
      mode: "string",
    })
      .default(sql`CURRENT_TIMESTAMP(0)`)
      .notNull(),
  },
  (table) => [
    unique("companies_company_code_norm_key").on(table.companyCodeNorm),
    check(
      "companies_company_code_format",
      sql`${table.companyCodeNorm} ~ '^[a-z0-9_-]{3,32}$'`,
    ),
    check("companies_name_not_blank", sql`btrim(${table.name}) <> ''`),
    check(
      "companies_next_login_sequence_positive",
      sql`${table.nextLoginSequence} >= 1`,
    ),
  ],
);

// 社員マスタ。ログイン情報もこのテーブルで管理する。
export const employees = pgTable(
  "employees",
  {
    // システム内部の社員ID。UUIDは登録処理で発行する。
    id: uuid("id").primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),

    // ログインに使う本人ID。先頭の0を保持するため文字列で保存する。
    loginIdNorm: varchar("login_id_norm", { length: 32 }).notNull(),
    fullName: varchar("full_name", { length: 200 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),

    // 招待中は未設定。設定後はハッシュ値を保存する。
    passwordHash: text("password_hash"),
    status: employeeStatus("status").default("invited").notNull(),

    // 本人IDとは別の補助的な社員番号。必要な会社だけ使用する。
    employeeCode: varchar("employee_code", { length: 64 }),

    // 雇用上の日付と、システムを利用できる日付は分けて管理する。
    joinedOn: date("joined_on", { mode: "string" }),
    leftOn: date("left_on", { mode: "string" }),
    availableFrom: date("available_from", { mode: "string" }).notNull(),

    // パスワード変更などで古いセッションを無効にするための版番号。
    credentialVersion: bigint("credential_version", { mode: "number" })
      .default(1)
      .notNull(),

    // 社員情報の同時更新を検出するための版番号。
    rowVersion: bigint("row_version", { mode: "number" })
      .default(1)
      .notNull(),

    createdAt: timestamp("created_at", {
      precision: 0,
      withTimezone: true,
      mode: "string",
    })
      .default(sql`CURRENT_TIMESTAMP(0)`)
      .notNull(),
    updatedAt: timestamp("updated_at", {
      precision: 0,
      withTimezone: true,
      mode: "string",
    })
      .default(sql`CURRENT_TIMESTAMP(0)`)
      .notNull(),
  },
  (table) => [
    unique("employees_company_id_id_key").on(table.companyId, table.id),
    unique("employees_company_login_id_key").on(
      table.companyId,
      table.loginIdNorm,
    ),
    unique("employees_company_employee_code_key").on(
      table.companyId,
      table.employeeCode,
    ),
    check(
      "employees_login_id_not_blank",
      sql`btrim(${table.loginIdNorm}) <> ''`,
    ),
    check(
      "employees_full_name_not_blank",
      sql`btrim(${table.fullName}) <> ''`,
    ),
    check("employees_email_not_blank", sql`btrim(${table.email}) <> ''`),
    check(
      "employees_employment_dates_order",
      sql`${table.leftOn} >= ${table.joinedOn}`,
    ),
    check(
      "employees_credential_version_positive",
      sql`${table.credentialVersion} >= 1`,
    ),
    check("employees_row_version_positive", sql`${table.rowVersion} >= 1`),
    check(
      "employees_active_requires_password_hash",
      sql`${table.status} <> 'active' OR (${table.passwordHash} IS NOT NULL AND btrim(${table.passwordHash}) <> '')`,
    ),
  ],
);

// ログイン状態の記録。新しくログインしたときに1件作成する。
// 同じ社員でも、別のブラウザでログインした場合は別の行を作る。
// ページを開くたびに行を追加するのではなく、有効な間は同じ行を使う。
export const sessions = pgTable(
  "sessions",
  {
    // このログイン記録自体のID。登録処理でUUIDを発行する。
    id: uuid("id").primaryKey(),

    // どの会社の、どの社員のログインかを保存する。
    // 会社と社員の組み合わせは、下の複合外部キーで確認する。
    companyId: uuid("company_id").notNull(),
    employeeId: uuid("employee_id").notNull(),

    // Cookieに渡すランダムな文字列をSHA-256でハッシュ化した値。
    // 元の文字列はDBに保存せず、Cookieから受け取った値を
    // 同じ方法でハッシュ化して照合する。64文字の16進数で保存する。
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),

    // ログイン時点の社員マスタのcredentialVersionをコピーする。
    // 後で社員側の値が変わっていたら、そのログインを無効と判定する。
    // 値の比較は、後で作るセッション確認処理で行う。
    credentialVersion: bigint("credential_version", {
      mode: "number",
    }).notNull(),

    // このログイン記録を作った日時。省略時はDBの現在時刻を使う。
    createdAt: timestamp("created_at", {
      precision: 0,
      withTimezone: true,
      mode: "string",
    })
      .default(sql`CURRENT_TIMESTAMP(0)`)
      .notNull(),

    // 最後に有効なアクセスを確認した日時。初期値は登録時の日時。
    // アクセス時の更新はAPI側で行う。DBが自動更新する列ではない。
    lastSeenAt: timestamp("last_seen_at", {
      precision: 0,
      withTimezone: true,
      mode: "string",
    })
      .default(sql`CURRENT_TIMESTAMP(0)`)
      .notNull(),

    // 無操作による有効期限。アクセス時にAPI側で延長する。
    // ただし絶対期限を超えて延長しない。具体的な時間は後で設定する。
    idleExpiresAt: timestamp("idle_expires_at", {
      precision: 0,
      withTimezone: true,
      mode: "string",
    }).notNull(),

    // ログイン時に決める最終期限。利用を続けても延長しない。
    absoluteExpiresAt: timestamp("absolute_expires_at", {
      precision: 0,
      withTimezone: true,
      mode: "string",
    }).notNull(),

    // ログアウトなどで明示的に無効にした日時。
    // NULLは「明示的な無効化なし」。期限内であることまでは保証しない。
    revokedAt: timestamp("revoked_at", {
      precision: 0,
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    // 同じ識別情報が複数のログイン記録に重複しないようにする。
    // この一意制約によって、照合時に使う索引も作成される。
    unique("sessions_token_hash_key").on(table.tokenHash),

    // 社員マスタに存在する「会社ID・社員ID」の組み合わせだけ許可する。
    // 他社の社員IDを、誤った会社IDと組み合わせて登録するのを防ぐ。
    foreignKey({
      name: "sessions_company_employee_fk",
      columns: [table.companyId, table.employeeId],
      foreignColumns: [employees.companyId, employees.id],
    }).onDelete("restrict"),

    // ある社員のログイン記録をまとめて探すときに使う索引。
    // 社員ごとに複数行を許可するので、ここは一意制約にしない。
    index("sessions_company_employee_idx").on(
      table.companyId,
      table.employeeId,
    ),

    // 期限切れの行を探して削除する処理に備えた索引。
    // 索引を作るだけでは削除されない。定期削除の処理は別途作る。
    index("sessions_idle_expires_at_idx").on(table.idleExpiresAt),

    // SHA-256のハッシュを、小文字の16進数64文字で保存させる。
    check(
      "sessions_token_hash_format",
      sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`,
    ),

    // 社員マスタと同じく、版番号は1以上とする。
    check(
      "sessions_credential_version_positive",
      sql`${table.credentialVersion} >= 1`,
    ),

    // 無操作期限が、最終アクセス日時より後になるようにする。
    check(
      "sessions_idle_expiry_after_last_seen",
      sql`${table.idleExpiresAt} > ${table.lastSeenAt}`,
    ),

    // 絶対期限が、ログイン記録の作成日時より後になるようにする。
    check(
      "sessions_absolute_expiry_after_creation",
      sql`${table.absoluteExpiresAt} > ${table.createdAt}`,
    ),

    // 無操作期限を延長しても、絶対期限を超えられないようにする。
    check(
      "sessions_idle_expiry_within_absolute",
      sql`${table.idleExpiresAt} <= ${table.absoluteExpiresAt}`,
    ),
  ],
);
