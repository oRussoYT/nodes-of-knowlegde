// OpenNext adapter configuration for Cloudflare Workers. Default (no shared
// cache bucket): every page here is rendered per request or is static, so no
// incremental cache store is needed yet.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});
