import {
  CheckSquare,
  FileText,
  FolderLock,
  Lock,
  Globe,
  Database,
  LayoutDashboard,
  Braces,
  Key,
  Regex,
  Table2,
  GitCompare,
  GitMerge,
  FileCode2,
  FileCode,
  FileDown,
  HardDrive,
  SplitSquareHorizontal,
  Code2,
  Wand2,
  Waypoints,
  SearchCode,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface RouteConfig {
  title: string
  icon: LucideIcon
  namespace?: string
}

export const routeConfig: Record<string, RouteConfig> = {
  '/dashboard': { title: 'Dashboard', icon: LayoutDashboard },
  '/app/to-do': { title: 'Tasks', icon: CheckSquare },
  '/app/notes': { title: 'Notes', icon: FileText },
  '/app/password-manager': { title: 'Password Manager', icon: Lock },
  '/app/secure-files': { title: 'Files', icon: FolderLock, namespace: 'SecureFiles' },
  '/app/environment-manager': { title: 'Environment Manager', icon: FileCode2, namespace: 'EnvironmentManager' },
  '/app/api-keys': { title: 'API Keys', icon: Key },
  '/app/json-formatter': { title: 'JSON Formatter', icon: Braces, namespace: 'JsonFormatter' },
  '/app/json-schema-generator': { title: 'JSON Schema Generator', icon: Braces, namespace: 'JsonSchemaGenerator' },
  '/app/api-client': { title: 'API Client', icon: Globe },
  '/app/data-explorer': { title: 'Data Explorer', icon: Database },
  '/app/email-validator': { title: 'Email Validator', icon: Globe },
  '/app/markdown-preview-html': { title: 'Markdown Preview', icon: FileDown, namespace: 'MarkdownPreview' },
  '/app/format-converter': { title: 'Format Converter', icon: FileCode, namespace: 'FormatConverter' },
  '/app/regex-tester': { title: 'Regex Tester', icon: Regex, namespace: 'RegexTester' },
  '/app/sql-formatter': { title: 'SQL Formatter', icon: Table2, namespace: 'SqlFormatter' },
  '/app/graphql-formatter': { title: 'GraphQL Formatter', icon: GitMerge, namespace: 'GraphqlFormatter' },
  '/app/yaml-formatter': { title: 'YAML Formatter', icon: FileCode2, namespace: 'YamlFormatter' },
  '/app/diff-checker': { title: 'Diff checker', icon: GitCompare, namespace: 'DiffChecker' },
  '/app/snippet-manager': { title: 'Code Snippets', icon: FileCode, namespace: 'SnippetManager' },
  '/app/s3-drive': { title: 'S3 Drive', icon: HardDrive },
  '/app/json-to-code': { title: 'JSON to Code', icon: Code2, namespace: 'JsonToCode' },
  '/app/json-visualizer': { title: 'JSON Visualizer', icon: Waypoints, namespace: 'JsonVisualizer' },
  '/app/beautify-minify': { title: 'Beautify & Minify', icon: Wand2, namespace: 'BeautifyMinify' },
  '/app/json-diff': { title: "JSON Diff", icon: GitCompare, namespace: 'JsonDiff' },
  '/app/jsonpath-playground': { title: "JSONPath Playground", icon: SearchCode, namespace: 'JsonpathPlayground' },
}

export const TAB_ENABLED_PREFIX = '/app/'

export function isTabRoute(path: string): boolean {
  return path.startsWith(TAB_ENABLED_PREFIX)
}

export function getRouteConfig(path: string): RouteConfig | undefined {
  // exact match first
  if (routeConfig[path]) return routeConfig[path]
  // prefix match for sub-routes
  const match = Object.entries(routeConfig).find(([route]) =>
    path === route || path.startsWith(route + '/')
  )
  return match?.[1]
}
