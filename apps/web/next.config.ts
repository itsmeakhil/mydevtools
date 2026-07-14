import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import withBundleAnalyzer from '@next/bundle-analyzer';

const withNextIntl = createNextIntlPlugin();

/** Baked into client + server at build time; set APP_BUILD_ID in CI for non-Vercel deploys. */
function getAppBuildId(): string {
  return (
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.APP_BUILD_ID ||
    (process.env.NODE_ENV === 'development' ? 'development' : 'local')
  );
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_BUILD_ID: getAppBuildId(),
  },
  images: {
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
      '@radix-ui/react-collapsible',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@tabler/icons-react',
      'lucide-react',
      'framer-motion',
    ],
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const analyzer = (withBundleAnalyzer as any)({ enabled: process.env.ANALYZE === 'true' });

export default analyzer(withNextIntl(nextConfig));