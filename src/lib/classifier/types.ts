/**
 * Core types for the pre-flight classifier.
 *
 * Mirrors the LLM gateway pattern: provider adapters + a single
 * {@link classify} entry point. SERVER-ONLY — never import from client code.
 */

import type { ClassifierModelRef } from "../../../classifier.config";

export type { ClassifierModelRef };

export interface ClassifyRequest {
  model: ClassifierModelRef;
  message: string;
  systemPrompt: string;
  maxTokens: number;
}

export interface ClassifyResult {
  ok: boolean;
  /** Raw text from the model (expected to contain JSON). */
  text?: string;
  error?: { message: string };
}

export interface ClassifierAdapter {
  /** True when the provider has the credentials it needs to call the API. */
  isConfigured(): boolean;
  classify(request: ClassifyRequest): Promise<ClassifyResult>;
}

export interface ClassifyOptions<T> {
  /** Latest user message to classify. */
  message: string;
  /** Classifier system prompt — app-owned; defines the JSON schema you expect. */
  systemPrompt: string;
  /** Returned when mock mode is on, the provider is unconfigured, or anything fails. */
  defaultValue: T;
  /** Type guard — reject parsed JSON that doesn't match your app's shape. */
  validate: (value: unknown) => value is T;
  /** Override {@link classifierConfig.maxTokens} for this call. */
  maxTokens?: number;
}
