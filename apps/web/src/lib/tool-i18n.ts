/**
 * Maps /app/* paths to Navigation + Dashboard.tools message keys (same key in both).
 */
export const TOOL_PATH_TO_MESSAGE_KEY: Record<string, string> = {
  '/app/to-do': 'toDo',
  '/app/notes': 'notes',
  '/app/password-manager': 'passwordManager',
  '/app/environment-manager': 'environmentManager',
  '/app/bookmarks': 'bookmarks',
  '/app/email-validator': 'emailValidator',
  '/app/jwt-decoder': 'jwtDecoder',
  '/app/json-formatter': 'jsonFormatter',
  '/app/json-schema-generator': 'jsonSchemaGenerator',
  '/app/sql-formatter': 'sqlFormatter',
  '/app/diff-checker': 'diffChecker',
  '/app/regex-tester': 'regexTester',
  '/app/timestamp-converter': 'timestampConverter',
  '/app/cron-builder': 'cronBuilder',
  '/app/base64': 'base64Encoder',
  '/app/url-encode': 'urlEncoder',
  '/app/uuid-generator': 'uuidGenerator',
  '/app/qr-code-generator': 'qrCodeGenerator',
  '/app/ip-subnet-calculator': 'ipSubnetCalculator',
  '/app/hash-generator': 'hashGenerator',
  '/app/hmac-generator': 'hmacGenerator',
  '/app/lorem-ipsum': 'loremIpsum',
  '/app/color-picker': 'colorPicker',
  '/app/api-client': 'apiClient',
  '/app/nosql-explorer': 'nosqlExplorer',
  '/app/image-to-base64': 'imageToBase64',
  '/app/css-gradient-builder': 'cssGradientBuilder',
  '/app/gitignore-generator': 'gitignoreGenerator',
  '/app/csv-excel-json': 'csvExcelJson',
  '/app/snippet-manager': 'snippetManager',
};

export function getToolMessageKey(pathname: string): string | undefined {
  const path = pathname.split('?')[0] ?? pathname;
  return TOOL_PATH_TO_MESSAGE_KEY[path];
}
