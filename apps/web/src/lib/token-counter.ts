/**
 * Pure logic for the LLM Token Counter tool.
 * Tokenizer functions are injected so this module stays dependency-free
 * and trivially testable with fake encoders.
 */

export type EncodeFn = (text: string) => number[]
export type DecodeFn = (tokens: number[]) => string

/** Count tokens with an injected encoder. Empty text is always 0. */
export function countTokensWith(encodeFn: EncodeFn, text: string): number {
  if (!text) return 0
  return encodeFn(text).length
}

/**
 * Rough Claude token estimate: ~3.6 characters per token for typical
 * English/code content. Clearly an approximation — badge it as such in the UI.
 */
export function approxClaudeTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / 3.6)
}

export function countWords(text: string): number {
  const matches = text.trim().match(/\S+/g)
  return matches ? matches.length : 0
}

/* --------------------------------- Pricing -------------------------------- */

export interface ModelPricing {
  /** $ per million input tokens */
  input: number
  /** $ per million output tokens */
  output: number
}

export interface ModelPrice extends ModelPricing {
  id: string
  label: string
}

/**
 * Editable defaults — verify current pricing before relying on these numbers.
 * $ per MTok (million tokens).
 */
export const MODEL_PRICES: ModelPrice[] = [
  { id: 'claude-fable-5', label: 'Claude Fable 5', input: 10, output: 50 },
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8', input: 5, output: 25 },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', input: 3, output: 15 },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', input: 1, output: 5 },
  { id: 'gpt-4o', label: 'GPT-4o', input: 2.5, output: 10 },
  { id: 'gpt-4o-mini', label: 'GPT-4o mini', input: 0.15, output: 0.6 },
  { id: 'custom', label: 'Custom', input: 1, output: 2 },
]

export interface CostResult {
  inputCost: number
  outputCost: number
  total: number
  per1000Calls: number
}

/** Cost in dollars for one call (and per 1000 calls). Prices are $/MTok. */
export function calcCost(inputTokens: number, outputTokens: number, pricing: ModelPricing): CostResult {
  const inputCost = (Math.max(0, inputTokens) / 1_000_000) * pricing.input
  const outputCost = (Math.max(0, outputTokens) / 1_000_000) * pricing.output
  const total = inputCost + outputCost
  return { inputCost, outputCost, total, per1000Calls: total * 1000 }
}

/* ------------------------------ Visualization ----------------------------- */

export interface TokenChunkResult {
  /** Decoded text of each token, in order (capped at `limit`). */
  chunks: string[]
  truncated: boolean
  totalTokens: number
}

/**
 * Decode each token id individually into its text chunk, capped at `limit`
 * tokens for rendering performance.
 */
export function chunkTokens(decodeFn: DecodeFn, tokens: number[], limit = 2000): TokenChunkResult {
  const capped = tokens.length > limit
  const slice = capped ? tokens.slice(0, limit) : tokens
  const chunks = slice.map((t) => decodeFn([t]))
  return { chunks, truncated: capped, totalTokens: tokens.length }
}
