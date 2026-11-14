// Node.js標準の暗号処理。
import { createHash, randomBytes, randomUUID } from "node:crypto";

// Next.jsのCookie操作。
import { cookies } from "next/headers";

// Drizzleの検索条件を組み立てる関数。
import { and, eq, gt, isNull, lte, ne, sql } from "drizzle-orm";

// DB操作用の共通オブジェクト。
import { db } from "../db";

// 照合に使う会社・社員・セッションのテーブル定義。
import { companies, employees, sessions } from "../db/schema";

// 保存・読み取り・削除で共通して使うCookie名。
const sessionCookieName = "attendance_session";


// Cookieに保存する、セッション識別用のトークンを作る。
export function createSessionToken(): string {
  // 32バイト（256ビット）のランダムなデータを作る。
  const randomData = randomBytes(32);

  // ランダムなデータを、Cookieに保存できる文字列へ変換する。
  // base64urlは、データを文字列で表現する形式の名前。
  return randomData.toString("base64url");
}

// トークンから、DBへの保存・照合に使うハッシュ文字列を作る。
export function hashSessionToken(token: string): string {
  // SHA-256という方式でハッシュを作るためのオブジェクトを用意する。
  const hash = createHash("sha256");

  // ハッシュに変換したいトークンを渡す。
  // utf8は、入力した文字列をデータとして読み取るときの文字コード。
  hash.update(token, "utf8");

  // 計算結果を、64文字の16進数の文字列として返す。
  return hash.digest("hex");
}

// ログインに成功した社員のセッションを、DBへ1件登録する。
// 会社・社員の利用状態とパスワードは、呼び出し元で確認してから使う。
// ID・版番号はDBの社員情報から、有効期限はサーバー側で決めて渡す。
export async function createSession(
  companyId: string,
  employeeId: string,
  credentialVersion: number,
  idleExpiresAt: Date,
  absoluteExpiresAt: Date,
): Promise<string> {
  // ブラウザのCookieへ渡す、ランダムなトークンを作る。
  const token = createSessionToken();

  // DBには元のトークンを保存せず、ハッシュを保存する。
  const tokenHash = hashSessionToken(token);

  // sessionsテーブルへ1行登録する。awaitで登録完了を待つ。
  await db.insert(sessions).values({
    // DBレコード用のID。Cookieに渡すトークンとは別の値。
    id: randomUUID(),

    // ログインした社員の会社ID・社員ID・認証情報の版番号。
    companyId: companyId,
    employeeId: employeeId,
    credentialVersion: credentialVersion,

    // Cookieから受け取るトークンを、後で照合するためのハッシュ。
    tokenHash: tokenHash,

    // Date型の日時を、DB定義に合わせてUTCの文字列へ変換する。
    idleExpiresAt: idleExpiresAt.toISOString(),
    absoluteExpiresAt: absoluteExpiresAt.toISOString(),

    // createdAt・lastSeenAtは、テーブル定義の初期値を使う。
    // revokedAtは未指定なのでNULLとなり、明示的な無効化なしで始まる。
  });

  // 登録に成功したら、Cookie用の元のトークンを呼び出し元へ返す。
  // DB登録に失敗するとここには進まず、エラーが呼び出し元へ伝わる。
  return token;
}

// ログインAPIから、DBへのセッション登録が成功した後に呼ぶ。
// HTTP応答にCookieの保存指示を付け、ブラウザにトークンを保存させる。
export async function setSessionCookie(
  token: string,
  absoluteExpiresAt: Date,
): Promise<void> {
  // 今回のHTTPリクエスト・応答に対応する、
  // Cookieの操作用オブジェクトを取得する。
  const cookieStore = await cookies();

  // Cookieの名前・保存する値・各種設定を指定する。
  cookieStore.set(sessionCookieName, token, {
    // ページ内のJavaScriptから、このCookieを読み取れなくする。
    httpOnly: true,

    // 本番ではHTTPS接続だけで送信する。
    // 開発中はhttp://localhostを使うため、falseにする。
    secure: process.env.NODE_ENV === "production",

    // 別サイトからのリクエストで、Cookieを送る条件を制限する。
    sameSite: "lax",

    // このホストの、すべてのURLパスで使う。
    path: "/",

    // ブラウザがCookieを保持する期限。
    // DBへ登録したセッションの絶対期限と同じ日時を渡す。
    expires: absoluteExpiresAt,
  });
}


// ブラウザがHTTPリクエストに付けて送ったCookieから、
// ログイン用のトークンを取り出す。
// Cookieがない場合や、形式が不正な場合はnullを返す。
export async function readSessionToken(): Promise<string | null> {
  // 今回送られてきたCookieを扱うオブジェクトを取得する。
  const cookieStore = await cookies();

  // 保存時と同じ名前で、ログイン用Cookieを探す。
  const sessionCookie = cookieStore.get(sessionCookieName);

  // 見つからない場合、get()の結果はundefinedになる。
  // この関数からは「利用できるトークンなし」を表すnullを返す。
  if (sessionCookie === undefined) {
    return null;
  }

  // Cookieのオブジェクトから、保存されている文字列を取り出す。
  const token = sessionCookie.value;

  // 発行時の「32バイトをbase64urlで表した43文字」に合うか確認する。
  // 使用できる文字は、英大文字・英小文字・数字・_・-。
  // test()は一致ならtrueを返し、!で反転して不一致の場合に入る。
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return null;
  }

  // 形式が正しいトークンを、呼び出し元へ返す。
  return token;
}

// ログイン状態の確認に成功したとき、呼び出し元へ返す情報の型。
// パスワードやトークンのハッシュは含めない。
export type CurrentSession = {
  sessionId: string;
  companyId: string;
  employeeId: string;
  fullName: string;
  companyStatus: "setting" | "active" | "suspended";
};

// CookieとDBを照合し、現在のログイン情報を取得する。
// 未ログイン・期限切れ・無効化済みなどの場合はnullを返す。
// 部署や操作の権限確認、無操作期限の延長は別の処理で行う。
export async function getCurrentSession(): Promise<CurrentSession | null> {
  // 既存の関数で、Cookieから形式の正しいトークンを取り出す。
  const token = await readSessionToken();

  // トークンがなければ、DBへ問い合わせずに終了する。
  if (token === null) {
    return null;
  }

  // DBにはハッシュを保存しているため、受け取った値もハッシュ化する。
  const tokenHash = hashSessionToken(token);

  // 必要な項目だけを選び、セッション・社員・会社を照合する。
  const sessionRows = await db
    .select({
      sessionId: sessions.id,
      companyId: sessions.companyId,
      employeeId: sessions.employeeId,
      fullName: employees.fullName,
      companyStatus: companies.status,
    })
    .from(sessions)
    .innerJoin(
      employees,
      // 会社IDと社員IDの両方が一致する社員だけを結び付ける。
      and(
        eq(sessions.companyId, employees.companyId),
        eq(sessions.employeeId, employees.id),
      ),
    )
    .innerJoin(companies, eq(sessions.companyId, companies.id))
    .where(
      and(
        // Cookieから計算したハッシュが一致すること。
        eq(sessions.tokenHash, tokenHash),

        // ログアウトなどで明示的に無効化されていないこと。
        isNull(sessions.revokedAt),

        // 現在時刻はDB側の時刻を使う。期限ちょうども期限切れとする。
        gt(sessions.idleExpiresAt, sql`CURRENT_TIMESTAMP`),
        gt(sessions.absoluteExpiresAt, sql`CURRENT_TIMESTAMP`),

        // 社員が利用中で、認証情報の版番号もログイン時と同じこと。
        eq(employees.status, "active"),
        eq(sessions.credentialVersion, employees.credentialVersion),

        // 会社が停止中なら、このログインを利用させない。
        // 初期設定中の会社は本人確認を認め、使える操作はAPI側で制限する。
        ne(companies.status, "suspended"),

        // 社員のシステム利用開始日を、日本時間の今日が迎えていること。
        lte(
          employees.availableFrom,
          sql`(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo')::date`,
        ),
      ),
    )
    // トークンのハッシュは一意なので、取得するのは最大1件。
    .limit(1);

  // SELECTの結果は配列で返るため、最初の1件を取り出す。
  const currentSession = sessionRows[0];

  // 条件に合う記録がなかった場合は、未ログイン扱いとする。
  if (currentSession === undefined) {
    return null;
  }

  return currentSession;
}

// 今使っているブラウザのログイン状態を終了する。
// Cookieを変更するため、ログアウトAPIから呼ぶ。
export async function logoutCurrentSession(): Promise<void> {
  // 今回のブラウザが送ってきたトークンを取得する。
  const token = await readSessionToken();

  // トークンがある場合だけ、対応するDBの記録を無効化する。
  if (token !== null) {
    const tokenHash = hashSessionToken(token);

    // 行を削除するのではなく、無効化した日時を記録する。
    // このハッシュの記録だけを対象にするので、他のブラウザは維持される。
    await db
      .update(sessions)
      .set({
        revokedAt: sql`CURRENT_TIMESTAMP(0)`,
      })
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),

          // 既に無効なら、その日時を上書きしない。
          isNull(sessions.revokedAt),
        ),
      );
  }

  // DBの処理が成功した後、ブラウザへCookieの削除を指示する。
  // DBに該当行がない場合や、不正なCookieの場合もCookieは削除する。
  // DB処理が失敗した場合はここへ進まず、呼び出し元へエラーを伝える。
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
}