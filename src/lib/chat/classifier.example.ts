/**
 * classifyMessage — EXAMPLE pre-flight classifier pattern.
 *
 * This file is NOT wired into the chat UI or API route by default. It shows
 * how an app can run a cheap, fast model call *before* the main gateway
 * request to extract metadata (intent, language, etc.) and build a dynamic
 * system prompt from the result.
 *
 * See DESIGN.md → "Pre-flight classification" for when and why to use this.
 *
 * To adopt in a real project:
 * 1. Define your own metadata shape (replace {@link MessageMetadata} below).
 * 2. Call `classifyMessage` from your API route or a server action *before*
 *    `llmGateway.chat()`, then pass the reading into your prompt builder.
 * 3. Use a small/cheap model (Haiku, Flash, etc.) — classification should
 *    stay fast and inexpensive.
 * 4. Treat classifier failures as non-fatal: always fall back to defaults
 *    and still run the main call.
 *
 * IMPORTANT: server-only. Never import this from a client component.
 */

/** Generic metadata a classifier might return — replace with your app's shape. */
export interface MessageMetadata {
  /** High-level intent detected in the user's latest message. */
  intent: "question" | "task" | "feedback" | "other";
  /** BCP 47 language code detected in the message (e.g. "en", "it"). */
  language: string;
}

/** Safe fallback when the classifier is skipped or fails. */
export const DEFAULT_MESSAGE_METADATA: MessageMetadata = {
  intent: "other",
  language: "en",
};

interface ClassifierContext {
  /** Optional prior metadata from the previous turn (for delta detection). */
  previous?: MessageMetadata;
}

/**
 * Run a cheap classifier call on the latest user message.
 *
 * Returns structured metadata on success, or {@link DEFAULT_MESSAGE_METADATA}
 * on any failure — the main LLM call should always proceed regardless.
 */
export async function classifyMessage(
  message: string,
  _ctx: ClassifierContext = {},
): Promise<MessageMetadata> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[classifier.example] ANTHROPIC_API_KEY not set — skipping");
    return DEFAULT_MESSAGE_METADATA;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.CLASSIFIER_MODEL ?? "claude-haiku-4-5-20251001",
        max_tokens: 150,
        system: [
          "You classify user messages for a chat app.",
          "Reply with JSON only: { \"intent\": \"question\"|\"task\"|\"feedback\"|\"other\", \"language\": \"<BCP47>\" }",
        ].join(" "),
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!response.ok) {
      console.warn(
        `[classifier.example] API error ${response.status} — using default`,
      );
      return DEFAULT_MESSAGE_METADATA;
    }

    const data = await response.json();
    const raw =
      data.content?.find((b: { type: string }) => b.type === "text")?.text ??
      "";

    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean) as MessageMetadata;

    if (!parsed.intent || !parsed.language) {
      console.warn("[classifier.example] Incomplete JSON — using default");
      return DEFAULT_MESSAGE_METADATA;
    }

    return parsed;
  } catch (err) {
    console.warn("[classifier.example] Failed, using default:", err);
    return DEFAULT_MESSAGE_METADATA;
  }
}

/**
 * Example: build a system prompt from classified metadata.
 * Your app owns prompt content — this is just a minimal illustration.
 */
export function buildSystemPromptFromMetadata(
  basePrompt: string,
  metadata: MessageMetadata,
): string {
  return [
    basePrompt,
    `Detected intent: ${metadata.intent}. Respond in ${metadata.language}.`,
  ].join("\n\n");
}
