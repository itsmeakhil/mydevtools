import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Defaults only. No incremental cache is configured because this is the
 * marketing and auth site — its pages are static or SEO output, so there is no
 * ISR state worth persisting to R2 or KV. Add `incrementalCache` here if a page
 * ever needs revalidation that survives a deploy.
 */
export default defineCloudflareConfig();
