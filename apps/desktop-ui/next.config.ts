import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import withBundleAnalyzer from '@next/bundle-analyzer';

const withNextIntl = createNextIntlPlugin();

/** Baked into client + server at build time; set APP_BUILD_ID in CI. */
function getAppBuildId(): string {
  return (
    process.env.APP_BUILD_ID ||
    (process.env.NODE_ENV === 'development' ? 'development' : 'local')
  );
}

/**
 * Desktop-only frontend. The packaged app loads a static export (build-tauri.mjs
 * sets TAURI_BUILD=1). In `tauri dev` it runs a normal `next dev` server over
 * http — export mode stays OFF there so request-dynamic APIs (the NEXT_LOCALE
 * cookie read in i18n/request.ts) work.
 */
const isTauriBuild = process.env.TAURI_BUILD === '1';

const nextConfig: NextConfig = {
  ...(isTauriBuild ? { output: 'export' as const } : {}),
  env: {
    NEXT_PUBLIC_APP_BUILD_ID: getAppBuildId(),
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.google.com',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
      },
    ],
  },
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-context-menu',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group',
      '@radix-ui/react-tooltip',
      '@tabler/icons-react',
      'lucide-react',
      'date-fns',
      'lodash',
      'framer-motion',
    ],
  },
};

const analyzer = (withBundleAnalyzer as any)({ enabled: process.env.ANALYZE === 'true' });

export default analyzer(withNextIntl(nextConfig));
