import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API要求の振り分けは、公開入口のNginxが担当する。
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;