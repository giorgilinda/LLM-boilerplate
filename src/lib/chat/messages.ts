import type { LLMMessage } from "@/lib/llm-gateway/types";
import type { ChatMessage } from "./types";

/** Short, collision-unlikely id for keying UI messages. */
export function createId(): string {
  return Math.random().toString(36).slice(2);
}

/**
 * Convert the UI message list into the gateway's `LLMMessage[]` wire format.
 *
 * User messages with attachments become an array of content blocks (images
 * first, then any text); everything else stays a plain string. This mirrors
 * the `MessageContent` union the gateway accepts.
 */
export function toLLMMessages(messages: ChatMessage[]): LLMMessage[] {
  return messages.map((m) => {
    if (m.role === "user" && m.images && m.images.length > 0) {
      return {
        role: "user",
        content: [
          ...m.images.map((img) => img.block),
          ...(m.text ? [{ type: "text" as const, text: m.text }] : []),
        ],
      };
    }
    return { role: m.role, content: m.text };
  });
}
