// 社員を検索する条件を組み立てる。
import { and, eq, lte, ne, sql } from "drizzle-orm";

// DB操作と、会社・社員のテーブル定義。
import { db } from "@/db";
import { companies, employees } from "@/db/schema";

// 入力されたパスワードを照合する。
import { verifyPassword } from "@/lib/password";

// ログイン成功後に、DB登録とCookie設定を行う。
import { createSession, setSessionCookie } from "@/lib/session";

// 入力チェック後に扱う、ログイン情報の形。
type LoginInput = {
  companyId: string;
  loginId: string;
  password: string;
};

// 外から届いたデータを確認する。入力が不正ならnullを返す。
// unknownは「まだ中身の種類を確認していないデータ」という型。
function parseLoginInput(data: unknown): LoginInput | null {
  // 項目を持つオブジェクトか確認する。nullや配列は受け付けない。
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return null;
  }

  // 必要な3項目が存在するか確認する。
  if (!("companyId" in data) || !("loginId" in data) || !("password" in data)) {
    return null;
  }

  // 3項目とも文字列か確認する。数値のIDなどは受け付けない。
  if (
    typeof data.companyId !== "string" ||
    typeof data.loginId !== "string" ||
    typeof data.password !== "string"
  ) {
    return null;
  }

  // 会社IDは前後の空白を除き、DBの保存形式に合わせて小文字にする。
  const companyId = data.companyId.trim().toLowerCase();

  // 本人IDは前後の空白だけ除く。先頭の0や大文字・小文字は保持する。
  const loginId = data.loginId.trim();

  // パスワードは空白も含めて照合するため、加工しない。
  const password = data.password;

  // 会社IDは、DBの制約と同じ文字・長さに制限する。
  if (!/^[a-z0-9_-]{3,32}$/.test(companyId)) {
    return null;
  }

  // 本人IDは空欄を禁止し、DBの上限である32文字までにする。
  if (loginId.length < 1 || loginId.length > 32) {
    return null;
  }

  // パスワードは空欄を禁止し、入力の上限を1024文字とする。
  if (password.length < 1 || password.length > 1024) {
    return null;
  }

  // チェックを通った3項目をまとめて返す。
  return {
    companyId: companyId,
    loginId: loginId,
    password: password,
  };
}

// ログイン時の照合に使う社員情報。サーバー内だけで扱う。
// passwordHashはパスワード照合用なので、画面へ返さない。
type LoginEmployee = {
  companyId: string;
  employeeId: string;
  fullName: string;
  passwordHash: string | null;
  credentialVersion: number;
  companyStatus: "setting" | "active" | "suspended";
};

// 入力チェック済みの会社ID・本人IDから、利用可能な社員を探す。
// パスワードの照合は、この関数の後で行う。
async function findLoginEmployee(
  input: LoginInput,
): Promise<LoginEmployee | null> {
  const employeeRows = await db
    .select({
      companyId: companies.id,
      employeeId: employees.id,
      fullName: employees.fullName,
      passwordHash: employees.passwordHash,
      credentialVersion: employees.credentialVersion,
      companyStatus: companies.status,
    })
    .from(employees)
    .innerJoin(companies, eq(employees.companyId, companies.id))
    .where(
      and(
        // 画面の会社IDは会社コード。内部UUIDではなく、この列と比較する。
        eq(companies.companyCodeNorm, input.companyId),

        // 同じ会社の中で、本人IDが一致する社員を探す。
        eq(employees.loginIdNorm, input.loginId),

        // 招待中・停止中・退職済みの社員は対象にしない。
        eq(employees.status, "active"),

        // 停止中の会社は対象にしない。
        // 初期設定中の会社で使える操作は、ログイン後のAPI側で制限する。
        ne(companies.status, "suspended"),

        // システム利用開始日を、日本時間の今日が迎えていること。
        lte(
          employees.availableFrom,
          sql`(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo')::date`,
        ),
      ),
    )
    .limit(1);

  // 検索結果の先頭を取り出す。該当なしの場合はundefinedになる。
  const employee = employeeRows[0];

  if (employee === undefined) {
    return null;
  }

  return employee;
}

// 社員を検索し、入力されたパスワードが一致するか確認する。
// 成功なら社員情報、失敗ならnullを返す。サーバー内だけで使う。
async function authenticateLogin(
  input: LoginInput,
): Promise<LoginEmployee | null> {
  // 利用可能な社員を探す。
  const employee = await findLoginEmployee(input);

  // 社員が見つからない場合や、パスワード未設定の場合は失敗扱い。
  if (employee === null || employee.passwordHash === null) {
    return null;
  }

  // DBのハッシュと入力されたPWを、Argon2で照合する。

    // 第1引数が保存済みハッシュ、第2引数が入力されたPW。
  const passwordMatches = await verifyPassword(
    employee.passwordHash,
    input.password,
  );

  // 一致しない場合は失敗扱い。
  if (!passwordMatches) {
    return null;
  }

  // 社員とパスワードの両方を確認できたので、社員情報を返す。
  // この情報にはハッシュを含むため、そのまま画面へ返さない。
  return employee;
}

// POST /api/auth/login を受け取り、ログインを行う。
export async function POST(request: Request): Promise<Response> {
  // ログイン結果をブラウザや中継サーバーにキャッシュさせない。
  const responseHeaders = { "Cache-Control": "no-store" };

  // 送信元として許可するサイト。
  // 開発中はlocalhost:3000、本番は環境変数APP_ORIGINで指定する。
  const allowedOrigin =
    process.env.APP_ORIGIN ??
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : undefined);

  if (!allowedOrigin) {
    return Response.json(
      { message: "ログイン設定を確認してください。" },
      { status: 500, headers: responseHeaders },
    );
  }

  // Originは、ブラウザが送る「どのサイトから送信したか」のヘッダー。
  if (request.headers.get("origin") !== allowedOrigin) {
    return Response.json(
      { message: "許可されていない送信元です。" },
      { status: 403, headers: responseHeaders },
    );
  }

  // 画面からはJSON形式で送信する。別形式は受け付けない。
  const contentType = request.headers.get("content-type");

  if (
    contentType?.split(";")[0].trim().toLowerCase() !== "application/json"
  ) {
    return Response.json(
      { message: "JSON形式で送信してください。" },
      { status: 415, headers: responseHeaders },
    );
  }

  // 送られた本文をJSONとして読み取る。
  // 壊れたJSONの場合はcatchへ進む。
  let data: unknown;

  try {
    data = await request.json();
  } catch {
    return Response.json(
      { message: "送信データの形式が正しくありません。" },
      { status: 400, headers: responseHeaders },
    );
  }

  // 会社ID・本人ID・パスワードの入力形式を確認する。
  const input = parseLoginInput(data);

  if (input === null) {
    return Response.json(
      { message: "入力内容を確認してください。" },
      { status: 400, headers: responseHeaders },
    );
  }

  try {
    // 社員の利用状態と、入力されたパスワードを確認する。
    const employee = await authenticateLogin(input);

    if (employee === null) {
      // どの項目が違ったかは返さず、同じメッセージにする。
      return Response.json(
        { message: "会社ID・本人ID・パスワードを確認してください。" },
        { status: 401, headers: responseHeaders },
      );
    }

    // 現在時刻から、有効期限を計算する。
    // Date.now()の単位はミリ秒。1秒は1000ミリ秒。
    const now = Date.now();
    const idleExpiresAt = new Date(now + 60 * 60 * 1000);
    const absoluteExpiresAt = new Date(now + 12 * 60 * 60 * 1000);

    // DBから取得した会社・社員の内部IDでセッションを登録する。
    // 成功すると、Cookieへ保存する元のトークンが返ってくる。
    const token = await createSession(
      employee.companyId,
      employee.employeeId,
      employee.credentialVersion,
      idleExpiresAt,
      absoluteExpiresAt,
    );

    // DB登録が成功した後、ブラウザへCookieの保存を指示する。
    await setSessionCookie(token, absoluteExpiresAt);

    // ハッシュやトークンはJSONへ含めず、成功だけを返す。
    return Response.json(
      { message: "ログインしました。" },
      { status: 200, headers: responseHeaders },
    );
  } catch {
    // DBやパスワード照合でエラーになった場合、成功扱いにしない。
    // パスワードやトークンなどの秘密情報はログへ出さない。
    console.error("ログイン処理でサーバーエラーが発生しました。");

    return Response.json(
      {
        message:
          "ログイン処理に失敗しました。時間をおいて再度お試しください。",
      },
      { status: 500, headers: responseHeaders },
    );
  }
}