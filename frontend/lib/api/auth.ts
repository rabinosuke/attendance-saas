// 画面からログイン通信の関数へ渡す、入力データの形。
export type LoginRequest = {
  // 画面に入力した会社コード。
  companyId: string;

  // 本人ID。先頭の0も保持するため文字列にする。
  loginId: string;

  // 入力されたパスワード。
  password: string;
};

// 通信関数が、結果をまとめて画面へ返すときの形。
export type LoginResult = {
  // ログイン成功ならtrue、失敗ならfalse。
  success: boolean;

  // APIから受け取った、成功・失敗のメッセージ。
  message: string;
};

// 入力値をログインAPIへ送信し、結果を画面へ返す。
// 通信エラーや応答形式の異常は、呼び出し元のcatchへ伝える。
export async function sendLoginRequest(
  input: LoginRequest,
): Promise<LoginResult> {
  // 開発中はrewrites、本番ではNginxがbackendへ転送する。
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },

    // 同じサイトとの通信で、Cookieを送受信する。
    credentials: "same-origin",

    // 画面から受け取った入力値を、JSON文字列へ変換する。
    body: JSON.stringify(input),
  });

  // APIの応答本文を読み取る。中身の種類は、この後で確認する。
  const data: unknown = await response.json();

  // 応答が、文字列のmessageを持つオブジェクトか確認する。
  if (
    typeof data !== "object" ||
    data === null ||
    !("message" in data) ||
    typeof data.message !== "string"
  ) {
    // 扱えない形式だったら、画面側のcatchへエラーを伝える。
    throw new Error("ログインAPIの応答形式が正しくありません。");
  }

  // 通信結果を、先ほど定義したLoginResultの形にまとめて返す。
  // response.okは、HTTPステータスが200〜299ならtrueになる。
  return {
    success: response.ok,
    message: data.message,
  };
}