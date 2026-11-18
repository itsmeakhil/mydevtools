/**
 * Postman/Bruno-style dynamic variables: `{{$guid}}`, `{{$timestamp}}`, … A
 * fresh value per occurrence, per send. User variables of the same name win.
 */

const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]
const int = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1))
const alnum = (n: number) =>
    Array.from({ length: n }, () => pick([..."abcdefghijklmnopqrstuvwxyz0123456789"])).join("")

const FIRST = ["Ada", "Alan", "Grace", "Linus", "Margaret", "Dennis", "Barbara", "Ken", "Radia", "Tim"] as const
const LAST = ["Lovelace", "Turing", "Hopper", "Torvalds", "Hamilton", "Ritchie", "Liskov", "Thompson", "Perlman", "Berners-Lee"] as const
const WORDS = ["alpha", "bravo", "cobalt", "delta", "ember", "falcon", "granite", "harbor", "indigo", "juniper"] as const
const CITIES = ["Lisbon", "Osaka", "Nairobi", "Toronto", "Oslo", "Lima", "Hanoi", "Dublin"] as const
const COUNTRIES = ["Portugal", "Japan", "Kenya", "Canada", "Norway", "Peru", "Vietnam", "Ireland"] as const
const COLORS = ["red", "green", "blue", "orange", "purple", "teal", "yellow", "black"] as const

const uuid = () => crypto.randomUUID()

export const DYNAMIC_VARS: Record<string, () => string> = {
    $guid: uuid,
    $randomUUID: uuid,
    $timestamp: () => String(Math.floor(Date.now() / 1000)),
    $isoTimestamp: () => new Date().toISOString(),
    $randomInt: () => String(int(0, 1000)),
    $randomBoolean: () => String(Math.random() < 0.5),
    $randomAlphaNumeric: () => alnum(1),
    $randomFirstName: () => pick(FIRST),
    $randomLastName: () => pick(LAST),
    $randomFullName: () => `${pick(FIRST)} ${pick(LAST)}`,
    $randomUserName: () => `${pick(FIRST).toLowerCase()}${int(1, 999)}`,
    $randomEmail: () => `${pick(FIRST).toLowerCase()}.${pick(LAST).toLowerCase()}@example.com`,
    $randomPhoneNumber: () => `${int(200, 999)}-${int(200, 999)}-${int(1000, 9999)}`,
    $randomCity: () => pick(CITIES),
    $randomCountry: () => pick(COUNTRIES),
    $randomColor: () => pick(COLORS),
    $randomHexColor: () => `#${int(0, 0xffffff).toString(16).padStart(6, "0")}`,
    $randomIP: () => `${int(1, 254)}.${int(0, 255)}.${int(0, 255)}.${int(1, 254)}`,
    $randomDomainName: () => `${pick(WORDS)}-${alnum(4)}.example.com`,
    $randomUrl: () => `https://${pick(WORDS)}-${alnum(4)}.example.com`,
    $randomWord: () => pick(WORDS),
    $randomPrice: () => (int(100, 100000) / 100).toFixed(2),
}

/** Value for a `$name` key, or undefined when it isn't a dynamic variable. */
export function resolveDynamicVar(key: string): string | undefined {
    return Object.hasOwn(DYNAMIC_VARS, key) ? DYNAMIC_VARS[key]() : undefined
}

export type VariableStatus = "resolved" | "dynamic" | "response" | "secret" | "missing"

/**
 * How `{{key}}` will resolve at send time, judged from the editor (scripts can
 * still set variables at runtime, so "missing" is a warning, not an error).
 */
export function classifyVariable(key: string, env: Record<string, string>): { status: VariableStatus; value?: string } {
    if (Object.hasOwn(env, key)) return { status: "resolved", value: env[key] }
    if (Object.hasOwn(DYNAMIC_VARS, key)) return { status: "dynamic" }
    if (key.startsWith("response.")) return { status: "response" }
    if (key.startsWith("vault.") || key.startsWith("env.")) return { status: "secret" }
    return { status: "missing" }
}
