import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // /api/で始まる通信を、API用のbackendへ転送する。
  async rewrites() {
    return [
      {
        // frontendが受け取るURL。:path*は後ろに続くパス全体。
        source: "/api/:path*",

        // backendはComposeのサービス名。3000は内部の待受ポート。
        destination: "http://backend:3000/api/:path*",
      },
    ];
  },
  
  /* config options here */
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
