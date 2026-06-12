/**
 * LLM service factory.
 *
 * Reads NEXT_PUBLIC_MOCK_MODE and returns either:
 * - MockLLMService  (MOCK_MODE=true)  — zero cost, instant, for UI development
 * - Your real provider (MOCK_MODE=false) — add your implementation in a new file
 *
 * USAGE:
 * ```ts
 * import { llmService } from "@/lib/llm";
 *
 * const response = await llmService.chat({ systemPrompt, messages });
 * ```
 *
 * ADDING A REAL PROVIDER:
 * 1. Create `src/lib/llm/claude.ts` (or `openai.ts`, etc.)
 * 2. Implement the `LLMService` interface from `types.ts`
 * 3. Import it here and return it in the else branch below
 *
 * NOTE: Real LLM calls must be server-side only (Next.js API routes).
 * This factory is safe to import on the client because MockLLMService
 * never makes network calls. Your real provider should only be instantiated
 * inside `src/app/api/` route handlers.
 */

import { MockLLMService } from "./mock";
import type { LLMService } from "./types";

export type { LLMService, LLMResponse, Message } from "./types";

function createLLMService(): LLMService {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === "true") {
    return new MockLLMService();
  }

  // TODO: replace with your real provider
  // import { ClaudeLLMService } from "./claude";
  // return new ClaudeLLMService();

  // Until a real provider is wired in, fall back to mock in all environments
  console.warn(
    "[llm] No real LLM provider configured. Falling back to MockLLMService. " +
      "Create src/lib/llm/claude.ts and wire it in src/lib/llm/index.ts."
  );
  return new MockLLMService();
}

export const llmService: LLMService = createLLMService();
