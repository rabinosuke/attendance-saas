import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Reactの画面コードを扱えるようにする。
  plugins: [react()],

  // tsconfig.jsonに書かれた「@/」などの省略パスを使う。
  resolve: {
    tsconfigPaths: true,
  },

  test: {
    // HTMLの要素など、ブラウザに似た仕組みを用意する。
    environment: "jsdom",

    // 各テストの前に読み込む、共通の準備ファイル。
    setupFiles: ["./vitest.setup.ts"],
  },
});