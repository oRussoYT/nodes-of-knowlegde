import type { NextConfig } from "next";

/**
 * Next.js configuration for Nodes BDFFP.
 *
 * Kept intentionally minimal at this stage of the project. Future
 * configuration (image domains, redirects, i18n routing, etc.) should be
 * added here with a short comment explaining why it was introduced.
 */
// The site's address comes from NEXT_PUBLIC_SITE_URL (.env.production for
// Cloudflare Pages); on Netlify it arrived as URL. Use it as the public site
// URL (email links) unless NEXT_PUBLIC_SITE_URL is set explicitly.
// The public Supabase settings are also written into the build here, so the
// hosted server functions see them even though they only exist at build time.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.URL;
const publicEnv: Record<string, string> = {};
if (siteUrl) publicEnv.NEXT_PUBLIC_SITE_URL = siteUrl;
if (process.env.NEXT_PUBLIC_SUPABASE_URL) publicEnv.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
}

const nextConfig: NextConfig = {
  env: publicEnv,
  // Cloudflare Pages has no image-resizing service; photos are already
  // compressed (public/photos), so images are served as they are.
  images: { unoptimized: true },
};

export default nextConfig;
