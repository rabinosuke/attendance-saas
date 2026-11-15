import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { sendLoginRequest } from "@/lib/api/auth";
import LoginPage from "./page";

// ログイン通信の関数を、テスト用の関数へ置き換える。
// ログイン画面がsendLoginRequestを呼ぶと、こちらが動く。
vi.mock("@/lib/api/auth", () => ({
  // awaitで待つと、下のログイン失敗の結果を受け取れる。
  sendLoginRequest: vi.fn().mockResolvedValue({
    success: false,
    message: "会社ID、本人ID、またはパスワードが正しくありません。",
  }),
}));

// Next.jsの画面移動機能を、このテスト内では仮の機能に置き換える。
// Vitestがログイン画面を読み込む前に、この置き換えを適用する。
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

test("ログインに必要な入力欄とボタンが表示される", () => {
  // 実際のログイン画面を、テスト用の画面に表示する。
  render(<LoginPage />);

  // ラベルの名前から入力欄を探し、存在することを確認する。
  expect(screen.getByLabelText("会社ID")).toBeInTheDocument();
  expect(screen.getByLabelText("本人ID")).toBeInTheDocument();
  expect(screen.getByLabelText("パスワード")).toBeInTheDocument();

  // ログインボタンがあり、押せる状態であることを確認する。
  expect(screen.getByRole("button", { name: "ログイン" })).toBeEnabled();
});

test("ログインに失敗するとエラーメッセージが表示される", async () => {
  // ログイン画面をテスト用の画面に表示する。
  render(<LoginPage />);

  // 会社IDの入力欄へ、テスト用の値を入力する。
  fireEvent.change(screen.getByLabelText("会社ID"), {
    target: { value: "demo-company" },
  });

  // 本人IDを入力する。
  fireEvent.change(screen.getByLabelText("本人ID"), {
    target: { value: "demo-user" },
  });

  // パスワードを入力する。
  fireEvent.change(screen.getByLabelText("パスワード"), {
    target: { value: "wrong-password" },
  });

  // ログインボタンを押す。
  // 画面のhandleSubmitが動き、テスト用の通信関数が呼ばれる。
  fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

  // 失敗結果を受け取って画面が更新されるまで待つ。
  // role="alert"が付いた、エラー表示用のHTML要素を取得する。
  const errorAlert = await screen.findByRole("alert");

  // 通信関数が返したメッセージが、画面に表示されたか確認する。
  expect(errorAlert).toHaveTextContent(
    "会社ID、本人ID、またはパスワードが正しくありません。",
  );

  // 入力した3項目が、通信関数へ正しく渡されたか確認する。
  expect(sendLoginRequest).toHaveBeenCalledWith({
    companyId: "demo-company",
    loginId: "demo-user",
    password: "wrong-password",
  });
});