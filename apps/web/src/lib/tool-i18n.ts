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
  '/app/encryption-playground': 'encryptionPlayground',
  '/app/certificate-pem-decoder': 'certificatePemDecoder',
  '/app/json-formatter': 'jsonFormatter',
  '/app/json-schema-generator': 'jsonSchemaGenerator',
  '/app/sql-formatter': 'sqlFormatter',
  '/app/graphql-formatter': 'graphqlFormatter',
  '/app/yaml-formatter': 'yamlFormatter',
  '/app/diff-checker': 'diffChecker',
  '/app/regex-tester': 'regexTester',
  '/app/api-client': 'apiClient',
  '/app/database-explorer': 'nosqlExplorer',
  '/app/redis-commander': 'redisCommander',
  '/app/snippet-manager': 'snippetManager',
  '/app/markdown-preview-html': 'markdownPreview',
  '/app/format-converter': 'formatConverter',
  '/app/break-room/2048': 'game2048',
  '/app/break-room/sudoku': 'sudoku',
  '/app/json-to-code': 'jsonToCode',
  '/app/beautify-minify': 'beautifyMinify',
  '/app/bcrypt-generator': 'bcryptGenerator',
  '/app/json-diff': 'jsonDiff',
  '/app/jsonpath-playground': 'jsonpathPlayground',
  '/app/webhook-tester': 'webhookTester',
};

export function getToolMessageKey(pathname: string): string | undefined {
  const path = pathname.split('?')[0] ?? pathname;
  return TOOL_PATH_TO_MESSAGE_KEY[path];
}
