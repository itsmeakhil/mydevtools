/**
 * Lean Postman v2.1 → Collection converter for the CLI.
 * Mirrors `apps/web/src/lib/import/postman.ts` but bound to the smaller
 * CLI type surface (no OAuth2, no graphql body parsing — those map to text).
 */
import type { Collection } from "./types.js";
export declare function importPostmanCollection(raw: string | object): Collection;
/**
 * Parse a Postman Environment export (v2 schema) into a flat `key → value` map.
 * Disabled vars are skipped.
 */
export declare function parsePostmanEnvironment(raw: string | object): Record<string, string>;
