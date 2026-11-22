import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// 開発中に接続プールを保存する共有場所。
const globalForDb = globalThis as unknown as {
  attendancePool?: Pool;
};

// 保存済みなら再利用し、なければ新しく作る。
// 接続先などはComposeの環境変数から読み取る。
const pool =
  globalForDb.attendancePool ??
  new Pool({
    max: 5,
    connectionTimeoutMillis: 5000,
    ssl: false, // ローカルDocker環境用
  });

// 新しいプールにエラー処理を登録する。
if (!globalForDb.attendancePool) {
  pool.on("error", (error) => {
    console.error("待機中のDB接続エラー:", error.message);
  });
}

// 開発中の再読み込みでもプールを再利用する。
if (process.env.NODE_ENV !== "production") {
  globalForDb.attendancePool = pool;
}

// APIなどから使うDB操作用オブジェクト。
export const db = drizzle({
  client: pool,
  schema,
});