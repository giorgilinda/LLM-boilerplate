/**
 * Pre-flight classifier configuration.
 *
 * Committed to git — structural decisions only. Secrets and per-environment
 * overrides (API keys, mock mode) live in `.env.local`. See `env.example`.
 *
 * NAMESPACING RULE (see DESIGN.md): additive to the base nextjs-boilerplate.
 */

export type ClassifierProviderName = "anthropic";

export interface ClassifierModelRef {
  provider: ClassifierProviderName;
  model: string;
}

export interface ClassifierConfig {
  /** Provider + model for classification calls. Keep this cheap (Haiku, Flash, etc.). */
  model: ClassifierModelRef;

  /** Max tokens for the classifier response. JSON metadata should stay small. */
  maxTokens: number;
}

export const classifierConfig: ClassifierConfig = {
  model: {
    provider: "anthropic",
    model: process.env.CLASSIFIER_MODEL ?? "claude-haiku-4-5-20251001",
  },
  maxTokens: 150,
};
