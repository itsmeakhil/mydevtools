import type { ElementType } from "react"
import {
  IconBrowser,
  IconServer2,
  IconStack2,
  IconCloudCog,
  IconBug,
  IconBrush,
  IconCompass,
} from "@tabler/icons-react"

/**
 * Onboarding role presets. Each role curates:
 *  - `pins`: ~8 core tools pinned to the dashboard/sidebar (the daily drivers)
 *  - `tools`: the broader enabled set shown in the sidebar (pins + likely-useful)
 * Users can adjust the selection on the next step; this is a starting point,
 * not a restriction.
 */

// Everyone gets the productivity basics — they're the platform's sticky core.
export const BASICS = ["/app/bookmarks", "/app/notes", "/app/to-do", "/app/snippet-manager"]

export interface OnboardingRole {
  id: string
  label: string
  description: string
  Icon: ElementType
  pins: string[]
  tools: string[]
}

function role(
  id: string,
  label: string,
  description: string,
  Icon: ElementType,
  pins: string[],
  extras: string[] = [],
): OnboardingRole {
  return { id, label, description, Icon, pins, tools: [...new Set([...BASICS, ...pins, ...extras])] }
}

export const ONBOARDING_ROLES: OnboardingRole[] = [
  role(
    "frontend",
    "Frontend developer",
    "UI, styling, and browser-side work",
    IconBrowser,
    [
      "/app/json-formatter",
      "/app/api-client",
      "/app/color-picker",
      "/app/contrast-checker",
      "/app/css-gradient-builder",
      "/app/svg-optimizer",
      "/app/regex-tester",
      "/app/image-compressor",
    ],
    ["/app/lorem-ipsum", "/app/markdown-preview-html", "/app/base64", "/app/diff-checker", "/app/image-to-base64"],
  ),
  role(
    "backend",
    "Backend developer",
    "APIs, databases, and server-side logic",
    IconServer2,
    [
      "/app/api-client",
      "/app/data-explorer",
      "/app/jwt-decoder",
      "/app/cron-builder",
      "/app/environment-manager",
      "/app/uuid-generator",
    ],
    ["/app/sql-formatter", "/app/mock-data-generator", "/app/hash-generator", "/app/http-status-codes", "/app/api-keys"],
  ),
  role(
    "fullstack",
    "Full-stack developer",
    "A bit of everything, end to end",
    IconStack2,
    [
      "/app/api-client",
      "/app/json-formatter",
      "/app/data-explorer",
      "/app/jwt-decoder",
      "/app/environment-manager",
      "/app/regex-tester",
      "/app/docker-compose-generator",
      "/app/uuid-generator",
    ],
    ["/app/diff-checker", "/app/http-status-codes", "/app/color-picker"],
  ),
  role(
    "devops",
    "DevOps / SRE",
    "Infra, networking, and deployments",
    IconCloudCog,
    [
      "/app/docker-compose-generator",
      "/app/cron-builder",
      "/app/dns-lookup",
      "/app/ip-subnet-calculator",
      "/app/ssh-key-generator",
      "/app/gitignore-generator",
      "/app/environment-manager",
      "/app/certificate-pem-decoder",
    ],
    ["/app/hash-generator", "/app/yaml-formatter", "/app/api-client", "/app/timestamp-converter"],
  ),
  role(
    "qa",
    "QA / Tester",
    "Testing, validation, and data checks",
    IconBug,
    [
      "/app/api-client",
      "/app/mock-data-generator",
      "/app/regex-tester",
      "/app/diff-checker",
      "/app/email-validator",
      "/app/json-formatter",
      "/app/csv-excel-json",
      "/app/http-status-codes",
    ],
    ["/app/uuid-generator", "/app/user-agent-parser", "/app/url-parser", "/app/timestamp-converter"],
  ),
  role(
    "designer",
    "Designer",
    "Color, imagery, and visual assets",
    IconBrush,
    [
      "/app/color-picker",
      "/app/contrast-checker",
      "/app/css-gradient-builder",
      "/app/image-compressor",
      "/app/svg-optimizer",
      "/app/lorem-ipsum",
      "/app/qr-code-generator",
      "/app/image-to-base64",
    ],
    ["/app/markdown-preview-html", "/app/unit-converter"],
  ),
  role(
    "exploring",
    "Just exploring",
    "Show me a bit of everything",
    IconCompass,
    [],
    [
      "/app/json-formatter",
      "/app/api-client",
      "/app/regex-tester",
      "/app/uuid-generator",
      "/app/color-picker",
      "/app/base64",
      "/app/diff-checker",
      "/app/qr-code-generator",
    ],
  ),
]
