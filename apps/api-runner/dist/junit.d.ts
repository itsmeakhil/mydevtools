/** JUnit XML emitter — port of `apps/web/src/lib/runner/junit.ts`. */
import type { RequestRunResult } from "./types.js";
export declare function buildJUnitXml(results: RequestRunResult[], suiteName: string): string;
