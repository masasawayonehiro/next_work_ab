import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Cloudflare Pages（*.pages.dev）向けに、静的 HTML として書き出す。
  // 検索・モーダル・お気に入りはクライアント JS（public/assets）で動くため、SSR は不要。
  output: "export",
  // 静的エクスポートでは next/image の最適化サーバーが使えない
  images: { unoptimized: true },
  // cacheComponents は静的エクスポート／OpenNext の制約と合わないため使わない
  cacheComponents: false,
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

// `next dev` 中も Cloudflare のバインディングを使えるようにする（将来の D1 接続用）
initOpenNextCloudflareForDev();
