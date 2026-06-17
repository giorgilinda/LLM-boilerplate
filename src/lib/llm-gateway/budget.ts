/**
 * Daily budget tracker.
 *
 * v1 is intentionally simple: in-memory, resets on server restart, single
 * global cap (no per-purpose breakdown). See DESIGN.md — a persistent
 * log/dashboard is deferred until this boilerplate proves it gets reused
 * across multiple real projects.
 *
 * This is good enough to catch a runaway loop during development, which is
 * the actual problem this was built to solve. It is NOT a billing-accurate
 * ledger — don't rely on it for that.
 *
 * IMPORTANT: the cap is checked PER MODEL in the fallback chain, not as one
 * gate before the whole chain. This means an expensive model being
 * unaffordable does NOT immediately fail the call — the gateway tries
 * cheaper models in the chain first. See gateway.ts. BUDGET_EXCEEDED is
 * only returned once every model in the chain would exceed the cap.
 */

import type { LLMModelRef } from "./types";

// Same pricing data used by the Claude adapter for actual cost calculation.
// Duplicated here (rather than imported from claude.ts) so this file has no
// dependency on any specific provider — adding a new provider just means
// adding its pricing here too. See HOW_TO_USE.md "Adding a new provider".
const PRICING_PER_MILLION_TOKENS: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
};

// Conservative assumption used only for the BEFORE-the-call estimate below.
// We don't know real token counts until after the call returns, so this
// estimates "worst case if the response is fairly long" to stay safely
// under the cap rather than risk going over it.
const ASSUMED_OUTPUT_TOKENS_FOR_ESTIMATE = 1000;

let spentTodayUsd = 0;
let lastResetDate = new Date().toDateString();

function resetIfNewDay(): void {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    spentTodayUsd = 0;
    lastResetDate = today;
  }
}

export function getSpentTodayUsd(): number {
  resetIfNewDay();
  return spentTodayUsd;
}

export function recordSpend(usd: number): void {
  resetIfNewDay();
  spentTodayUsd += usd;
}

/**
 * Estimate the cost of a prospective call to `modelRef` and check whether
 * making it would push today's total spend over `capUsdPerDay`.
 *
 * Used by the gateway BEFORE attempting each model in the fallback chain,
 * so a model with no pricing entry (e.g. "mock", or a newly added provider
 * you haven't priced yet) is treated as free — add it to
 * PRICING_PER_MILLION_TOKENS above once you know its real pricing.
 */
export function wouldExceedBudget(modelRef: LLMModelRef, capUsdPerDay: number): boolean {
  resetIfNewDay();

  const pricing = PRICING_PER_MILLION_TOKENS[modelRef.model];
  if (!pricing) return false; // unpriced model (e.g. mock) — never blocked by budget

  // Rough estimate: assume a typical-size input (we don't have the real
  // message list here) plus the conservative output assumption above.
  // This is intentionally approximate — it only needs to be good enough
  // to order "try the cheap model before giving up", not billing-accurate.
  const estimatedInputTokens = 500;
  const estimatedCost =
    (estimatedInputTokens / 1_000_000) * pricing.input +
    (ASSUMED_OUTPUT_TOKENS_FOR_ESTIMATE / 1_000_000) * pricing.output;

  return spentTodayUsd + estimatedCost > capUsdPerDay;
}

/** Exposed for tests only — do not use in product code. */
export function _resetBudgetForTests(): void {
  spentTodayUsd = 0;
  lastResetDate = new Date().toDateString();
}