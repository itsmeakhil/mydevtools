/**
 * Maps /app/* paths to Navigation + Dashboard.tools message keys (same key in both).
 */
export const TOOL_PATH_TO_MESSAGE_KEY: Record<string, string> = {
  '/app/to-do': 'toDo',
  '/app/notes': 'notes',
  '/app/password-manager': 'passwordManager',
  '/app/bookmarks': 'bookmarks',
  '/app/email-validator': 'emailValidator',
  '/app/jwt-decoder': 'jwtDecoder',
  '/app/json-formatter': 'jsonFormatter',
  '/app/sql-formatter': 'sqlFormatter',
  '/app/diff-checker': 'diffChecker',
  '/app/regex-tester': 'regexTester',
  '/app/timestamp-converter': 'timestampConverter',
  '/app/cron-builder': 'cronBuilder',
  '/app/base64': 'base64Encoder',
  '/app/url-encode': 'urlEncoder',
  '/app/uuid-generator': 'uuidGenerator',
  '/app/lorem-ipsum': 'loremIpsum',
  '/app/color-picker': 'colorPicker',
  '/app/api-client': 'apiClient',
  '/app/nosql-explorer': 'nosqlExplorer',
};

export function getToolMessageKey(pathname: string): string | undefined {
  const path = pathname.split('?')[0] ?? pathname;
  return TOOL_PATH_TO_MESSAGE_KEY[path];
}
