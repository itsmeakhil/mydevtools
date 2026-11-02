/**
 * Maps /app/* paths to Navigation + Dashboard.tools message keys (same key in both).
 */
export const TOOL_PATH_TO_MESSAGE_KEY: Record<string, string> = {
  '/app/to-do': 'toDo',
  '/app/notes': 'notes',
  '/app/password-manager': 'passwordManager',
  '/app/secure-files': 'secureFiles',
  '/app/environment-manager': 'environmentManager',
  '/app/email-validator': 'emailValidator',
  '/app/json-formatter': 'jsonFormatter',
  '/app/api-client': 'apiClient',
  '/app/data-explorer': 'dataExplorer',
  '/app/snippet-manager': 'snippetManager',
};

export function getToolMessageKey(pathname: string): string | undefined {
  const path = pathname.split('?')[0] ?? pathname;
  return TOOL_PATH_TO_MESSAGE_KEY[path];
}
