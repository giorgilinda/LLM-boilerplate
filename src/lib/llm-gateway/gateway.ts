import { llmConfig } from "../../../llm.config";
import type { LLMChatOptions, LLMResponse, LLMProviderAdapter, LLMModelRef } from "./types";
import { ClaudeProviderAdapter } from "./providers/claude";
import { MockProviderAdapter } from "./providers/mock";
import { trimToTokenLimit } from "./trim";
import { getSpentTodayUsd, recordSpend, wouldExceedBudget } from "./budget";

/**
 * The LLM Gateway — the single entry point every API route should use.
 *
 * Responsibilities:
 * - Check the daily budget cap per model as it walks the chain (cheap models
 *   stay available even if an earlier, pricier model would be unaffordable)
 * - Walk the fallback chain (default from llm.config.ts, or per-call override)
 * - Retry each model in the chain per llmConfig.retriesPerModel with backoff
 * - Trim message history to fit the configured token budget
 * - Record actual spend after a successful call
 * - Never throw — always resolve to LLMResponse
 *
 * SERVER-ONLY: this file imports the Claude adapter, which reads
 * ANTHROPIC_API_KEY. Only import this from src/app/api/ route handlers.
 */

function getAdapter(provider: LLMModelRef["provider"]): LLMProviderAdapter {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === "true") {
    return new MockProviderAdapter();
  }

  switch (provider) {
    case "anthropic":
      return new ClaudeProviderAdapter();
    default:
      // Exhaustiveness check — if a new provider is added to LLMModelRef
      // without an adapter here, TypeScript will flag this as unreachable.
      throw new Error(`No adapter configured for provider: ${provider}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attemptWithRetries(
  modelRef: LLMModelRef,
  options: LLMChatOptions,
  retries: number
): Promise<LLMResponse> {
  const adapter = getAdapter(modelRef.provider);
  const trimmedMessages = trimToTokenLimit(options.messages, llmConfig.maxHistoryTokens);

  let lastResponse: LLMResponse | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await adapter.chat({
      model: modelRef.model,
      systemPrompt: options.systemPrompt,
      messages: trimmedMessages,
      maxTokens: options.maxTokens,
    });

    if (response.ok) return response;
    if (!response.error?.retryable) return response; // hard failure, no point retrying

    lastResponse = response;
    if (attempt < retries) {
      await sleep(2 ** attempt * 500); // exponential backoff: 500ms, 1000ms, 2000ms...
    }
  }

  return lastResponse!;
}

export const llmGateway = {
  async chat(options: LLMChatOptions): Promise<LLMResponse> {
    // Walk the fallback chain (per-call override, or the config default).
    // Budget is checked PER MODEL, not as one global gate — this means a
    // cheap model later in the chain still gets a chance even if an
    // expensive one earlier in the chain would have pushed spend over the
    // cap. BUDGET_EXCEEDED is only returned once every model in the chain
    // would exceed the cap.
    const chain = options.fallbackChain ?? llmConfig.fallbackChain;
    let lastResponse: LLMResponse | null = null;

    for (const modelRef of chain) {
      if (wouldExceedBudget(modelRef, llmConfig.budgetCapUsdPerDay)) {
        lastResponse = {
          ok: false,
          error: {
            code: "BUDGET_EXCEEDED",
            message: `Skipping ${modelRef.model}: would exceed daily budget cap of $${llmConfig.budgetCapUsdPerDay} (spent $${getSpentTodayUsd().toFixed(4)} so far today).`,
            retryable: true, // retryable in the sense of "try the next model in the chain"
          },
        };
        continue; // try the next, cheaper model instead of giving up
      }

      const response = await attemptWithRetries(modelRef, options, llmConfig.retriesPerModel);

      if (response.ok) {
        if (response.usage) recordSpend(response.usage.estimatedCostUsd);
        return response;
      }

      lastResponse = response;
      if (!response.error?.retryable) break; // hard failure — don't bother trying the next model
    }

    // Every model in the chain either failed or would exceed budget.
    // Mark the final response as non-retryable since there's nothing left to try.
    if (lastResponse?.error) {
      return { ...lastResponse, error: { ...lastResponse.error, retryable: false } };
    }
    return (
      lastResponse ?? {
        ok: false,
        error: { code: "UNKNOWN", message: "Fallback chain was empty.", retryable: false },
      }
    );
  },
};