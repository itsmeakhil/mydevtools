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

// Tools removed from the app (2026-10). Their pages are indexed — 301 to /download, never 404.
const REMOVED_TOOL_SLUGS = [
  'color-picker', 'contrast-checker', 'css-gradient-builder', 'image-compressor', 'svg-optimizer',
  'code-screenshot', 'css-generators', 'exif-viewer', 'favicon-generator', 'keycode-inspector',
  'uuid-generator', 'ssh-key-generator', 'secret-api-key-generator', 'qr-code-generator',
  'gitignore-generator', 'docker-compose-generator', 'lorem-ipsum', 'mock-data-generator',
  'cron-builder', 'hash-generator', 'hmac-generator', 'totp-generator', 'markdown-table-generator',
  'base64', 'url-encode', 'url-parser', 'number-base-converter', 'timestamp-converter',
  'unit-converter', 'csv-excel-json', 'image-to-base64', 'string-case-converter',
  'line-sort-dedupe', 'string-inspector', 'escape-encode', 'chmod-calculator',
  'timezone-converter', 'token-counter',
];
const REMOVED_BLOG_SLUGS = [
  'base64-encoding-explained', 'uuid-guide-generate-and-understand', 'cron-expression-syntax-guide',
  'unix-timestamp-to-date-converter', 'docker-compose-guide-with-examples',
  'totp-two-factor-authentication-explained', 'mock-data-generation-guide',
  'hmac-explained-api-authentication', 'gitignore-guide-with-examples',
  'hash-generator-md5-sha256-online', 'url-parser-extract-components',
  'convert-csv-excel-to-json-online', 'convert-image-to-base64-data-uri', 'generate-ssh-keys-online',
  'number-base-converter-binary-hex', 'generate-qr-codes-online',
  'url-encoder-decoder-percent-encoding', 'generate-random-api-keys-secrets-online',
  'lorem-ipsum-placeholder-text-generator', 'color-picker-converter-hex-rgb-hsl',
  'wcag-contrast-checker-accessibility-colors', 'image-compressor-online-reduce-file-size',
  'css-gradient-builder-linear-radial-online', 'unit-converter-scientific-engineering-units',
  'svg-optimizer-minify-compress-svgo-online',
];
const REMOVED_COMPARE_SLUGS = [
  'uuid-generator-online', 'base64-encoder-decoder-online', 'hash-generator-online',
  'qr-code-generator-online',
];

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_BUILD_ID: getAppBuildId(),
  },
  async redirects() {
    return [
      ...REMOVED_TOOL_SLUGS.map((s) => `/tools/${s}`),
      ...REMOVED_BLOG_SLUGS.map((s) => `/blog/${s}`),
      ...REMOVED_COMPARE_SLUGS.map((s) => `/compare/${s}`),
    ].map((source) => ({ source, destination: '/download', permanent: true }));
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