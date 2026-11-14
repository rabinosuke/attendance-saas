import * as argon2 from "argon2";

// パスワード設定時に、DBへ保存するハッシュ値を作る。
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
  });
}

// ログイン時に、保存済みハッシュと入力されたパスワードを照合する。
export async function verifyPassword(
  storedHash: string,
  inputPassword: string,
): Promise<boolean> {
  return argon2.verify(storedHash, inputPassword);
}