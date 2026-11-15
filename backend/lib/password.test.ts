import { expect, test } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

test("正しいパスワードなら照合に成功する", async () => {
  // テスト用パスワードから、保存用のハッシュを作る。
  const storedHash = await hashPassword("sample-password");

  // 同じパスワードを渡して、実際の照合処理を動かす。
  const result = await verifyPassword(storedHash, "sample-password");

  // 結果がtrueなら合格。それ以外なら不合格。
  expect(result).toBe(true);
});

test("間違ったパスワードならfalseを返す", async () => {
  // 正しいパスワードからハッシュを作る。
  const storedHash = await hashPassword("sample-password");

  // ハッシュを作ったときとは違うパスワードを渡す。
  const result = await verifyPassword(storedHash, "wrong-password");

  // 結果がfalseなら合格。それ以外なら不合格。
  expect(result).toBe(false);
});