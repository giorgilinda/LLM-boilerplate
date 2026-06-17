/**
 * LLM Gateway configuration.
 *
 * This file is committed to git — it holds structural/behavioral decisions,
 * not secrets. Secrets and per-environment values (API keys, mock mode,
 * model overrides) live in `.env.local` instead. See `env.example`.
 *
 * NAMESPACING RULE (see DESIGN.md): this file is additive to the base
 * `nextjs-boilerplate`. It does not exist there, so it can never conflict
 * on `git merge upstream/main`.
 */

export type LLMProviderName = "anthropic";

export interface LLMModelRef {
  provider: LLMProviderName;
  model: string;
}

export interface LLMConfig {
  /**
   * Ordered list of {provider, model} attempts. The gateway tries each in
   * order until one succeeds or the list is exhausted.
   *
   * Override per-call by passing a `fallbackChain` option to `gateway.chat()`.
   */
  fallbackChain: LLMModelRef[];

  /**
   * Hard cap on total estimated spend (USD) per day, across all calls.
   * Once exceeded, the gateway stops making calls and returns a typed
   * BUDGET_EXCEEDED error instead — it never throws.
   *
   * v1 is a single global cap. Per-purpose budgets are deferred (see DESIGN.md).
   */
  budgetCapUsdPerDay: number;

  /**
   * Max tokens to keep when trimming message history before sending to the
   * provider. Used by `trimToTokenLimit()`. Leaves headroom for the model's
   * own context window and the response.
   */
  maxHistoryTokens: number;

  /**
   * Retry attempts per model in the fallback chain before moving to the
   * next one. Uses exponential backoff between attempts.
   */
  retriesPerModel: number;
}

export const llmConfig: LLMConfig = {
  fallbackChain: [
    { provider: "anthropic", model: "claude-sonnet-4-6" },
    { provider: "anthropic", model: "claude-haiku-4-5-20251001" },
  ],
  budgetCapUsdPerDay: 3,
  maxHistoryTokens: 8000,
  retriesPerModel: 2,
};
