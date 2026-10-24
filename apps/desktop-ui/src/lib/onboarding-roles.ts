import type { ElementType } from "react"
import {
  IconBrowser,
  IconServer2,
  IconStack2,
  IconCloudCog,
  IconBug,
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
      "/app/regex-tester",
    ],
    ["/app/markdown-preview-html", "/app/diff-checker"],
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
      "/app/environment-manager",
    ],
    ["/app/sql-formatter", "/app/http-status-codes", "/app/api-keys"],
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
    ],
    ["/app/diff-checker", "/app/http-status-codes"],
  ),
  role(
    "devops",
    "DevOps / SRE",
    "Infra, networking, and deployments",
    IconCloudCog,
    [
      "/app/dns-lookup",
      "/app/ip-subnet-calculator",
      "/app/environment-manager",
      "/app/certificate-pem-decoder",
    ],
    ["/app/yaml-formatter", "/app/api-client"],
  ),
  role(
    "qa",
    "QA / Tester",
    "Testing, validation, and data checks",
    IconBug,
    [
      "/app/api-client",
      "/app/regex-tester",
      "/app/diff-checker",
      "/app/email-validator",
      "/app/json-formatter",
      "/app/http-status-codes",
    ],
    ["/app/user-agent-parser"],
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
      "/app/diff-checker",
    ],
  ),
]
