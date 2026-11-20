// OpenNext（Next.js を Cloudflare Workers で動かすアダプタ）の設定
// データはデプロイ時にしか変わらないので、事前に作ったページを静的アセットから返す（R2などは不要）
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
