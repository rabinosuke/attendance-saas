import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import LoginPage from "./page";

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