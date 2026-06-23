/**
 * classifyMessageMetadata — EXAMPLE app-level wrapper around {@link classify}.
 *
 * NOT wired into the chat UI or `/api/llm/chat` by default. Nothing runs until
 * you import and call `classifyMessageMetadata()` from your own route.
 *
 * See DESIGN.md → "Pre-flight classification" for the full pattern.
 *
 * To adopt (e.g. in Sofi or a new project):
 * 1. Copy this file (drop `.example`) or define your own metadata shape.
 * 2. In your API route, call `classifyMessageMetadata(userText)` *before*
 *    `llmGateway.chat()`, then pass the result into your prompt builder.
 * 3. Treat failures as non-fatal — {@link classify} already returns defaults.
 *
 * SERVER-ONLY. Never import from a client component.
 */

import { classify } from "@/lib/classifier/gateway";

/** Generic metadata a classifier might return — replace with your app's shape. */
export interface MessageMetadata {
  intent: "question" | "task" | "feedback" | "other";
  language: string;
}

export const DEFAULT_MESSAGE_METADATA: MessageMetadata = {
  intent: "other",
  language: "en",
};

const CLASSIFIER_SYSTEM_PROMPT = [
  "You classify user messages for a chat app.",
  'Reply with JSON only: { "intent": "question"|"task"|"feedback"|"other", "language": "<BCP47>" }',
].join(" ");

export function isMessageMetadata(value: unknown): value is MessageMetadata {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.language === "string" &&
    (v.intent === "question" ||
      v.intent === "task" ||
      v.intent === "feedback" ||
      v.intent === "other")
  );
}

/**
 * Example: classify the latest user message into {@link MessageMetadata}.
 * Returns {@link DEFAULT_MESSAGE_METADATA} in mock mode or on any failure.
 */
export async function classifyMessageMetadata(
  message: string,
): Promise<MessageMetadata> {
  return classify({
    message,
    systemPrompt: CLASSIFIER_SYSTEM_PROMPT,
    defaultValue: DEFAULT_MESSAGE_METADATA,
    validate: isMessageMetadata,
  });
}

/** Example: build a system prompt from classified metadata. */
export function buildSystemPromptFromMetadata(
  basePrompt: string,
  metadata: MessageMetadata,
): string {
  return [
    basePrompt,
    `Detected intent: ${metadata.intent}. Respond in ${metadata.language}.`,
  ].join("\n\n");
}
