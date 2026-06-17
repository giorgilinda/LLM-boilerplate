import type { LLMMessage } from "./types";

/**
 * Generic message-history trimmer — provider-agnostic.
 *
 * Keeps the most recent messages that fit within `maxTokens`, dropping the
 * oldest first. This is the one piece of "prompt logic" the boilerplate
 * owns (see DESIGN.md "Prompt utilities") — everything else about prompt
 * construction and content is app-level.
 *
 * Uses a rough token estimate (chars / 4) rather than a real tokenizer to
 * avoid pulling in a heavy dependency. Good enough for a safety margin —
 * this is a trim function, not a billing calculation.
 */

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function trimToTokenLimit(
  messages: LLMMessage[],
  maxTokens: number
): LLMMessage[] {
  if (messages.length === 0) return messages;

  const kept: LLMMessage[] = [];
  let totalTokens = 0;

  // Walk from most recent to oldest, keep what fits
  for (let i = messages.length - 1; i >= 0; i--) {
    const messageTokens = estimateTokens(messages[i].content);
    if (totalTokens + messageTokens > maxTokens && kept.length > 0) {
      // Stop once adding this message would exceed the limit —
      // but always keep at least the most recent message, even if it
      // alone exceeds maxTokens (truncating it is the caller's call, not ours).
      break;
    }
    kept.unshift(messages[i]);
    totalTokens += messageTokens;
  }

  return kept;
}