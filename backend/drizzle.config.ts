import { defineConfig } from "drizzle-kit";

const {
  PGHOST,
  PGPORT,
  PGDATABASE,
  PGUSER,
  PGPASSWORD,
} = process.env;

if (!PGHOST || !PGPORT || !PGDATABASE || !PGUSER || !PGPASSWORD) {
  throw new Error(
    "DB接続設定が不足しています。Docker Compose経由で実行してください。"
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  schemaFilter: ["public"],
  dbCredentials: {
    host: PGHOST,
    port: Number(PGPORT),
    database: PGDATABASE,
    user: PGUSER,
    password: PGPASSWORD,
    ssl: false,
  },
});