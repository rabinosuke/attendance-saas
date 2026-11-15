// 「画面に存在する」「ボタンが無効」などの判定をexpectへ追加する。
import "@testing-library/jest-dom/vitest";

// テストで表示したReactの画面を片付ける関数。
import { cleanup } from "@testing-library/react";

// テスト1件の終了後に行う処理を登録する関数。
import { afterEach } from "vitest";

// 毎回画面を片付けて、次のテストに前の画面が残らないようにする。
afterEach(() => {
  cleanup();
});