import { classifierConfig } from "../../../classifier.config";
import type { ClassifierProviderName } from "../../../classifier.config";
import { parseJsonFromModelText } from "./parse";
import { AnthropicClassifierAdapter } from "./providers/anthropic";
import type { ClassifierAdapter, ClassifyOptions } from "./types";

/**
 * Pre-flight classifier gateway — single entry point for classification calls.
 *
 * OPT-IN ONLY: this module does nothing until you explicitly call {@link classify}
 * from your own API route or server action. The default `/api/llm/chat` route and
 * the chat UI never import or invoke this.
 *
 * Behavior:
 * - `NEXT_PUBLIC_MOCK_MODE === "true"` → return defaultValue (no API call)
 * - Provider not configured → return defaultValue
 * - API/parse/validation failure → return defaultValue (non-fatal)
 *
 * SERVER-ONLY: imports provider adapters that read API keys.
 */

function getClassifierAdapter(
  provider: ClassifierProviderName,
): ClassifierAdapter {
  switch (provider) {
    case "anthropic":
      return new AnthropicClassifierAdapter();
    default:
      throw new Error(`No classifier adapter configured for provider: ${provider}`);
  }
}

export async function classify<T>(options: ClassifyOptions<T>): Promise<T> {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === "true") {
    return options.defaultValue;
  }

  const adapter = getClassifierAdapter(classifierConfig.model.provider);
  if (!adapter.isConfigured()) {
    return options.defaultValue;
  }

  try {
    const result = await adapter.classify({
      model: classifierConfig.model,
      message: options.message,
      systemPrompt: options.systemPrompt,
      maxTokens: options.maxTokens ?? classifierConfig.maxTokens,
    });

    if (!result.ok || !result.text) {
      return options.defaultValue;
    }

    const parsed = parseJsonFromModelText(result.text);
    if (parsed === null || !options.validate(parsed)) {
      return options.defaultValue;
    }

    return parsed;
  } catch {
    return options.defaultValue;
  }
}
