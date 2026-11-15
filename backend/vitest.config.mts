import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // tsconfig.jsonの「@/」などの省略パスを使えるようにする。
  plugins: [tsconfigPaths()],

  test: {
    // バックエンドなので、Node.jsの環境でテストを動かす。
    environment: "node",
  },
});