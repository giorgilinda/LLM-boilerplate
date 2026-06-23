/**
 * @jest-environment node
 */
import { classify } from "@/lib/classifier/gateway";
import { AnthropicClassifierAdapter } from "@/lib/classifier/providers/anthropic";

interface SampleMetadata {
  intent: string;
  language: string;
}

const DEFAULT: SampleMetadata = { intent: "other", language: "en" };

function isSampleMetadata(value: unknown): value is SampleMetadata {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.intent === "string" && typeof v.language === "string";
}

const classifyOptions = {
  message: "What is 2+2?",
  systemPrompt: "Return JSON: { intent, language }",
  defaultValue: DEFAULT,
  validate: isSampleMetadata,
};

describe("classify()", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns defaultValue in mock mode without calling the provider", async () => {
    process.env.NEXT_PUBLIC_MOCK_MODE = "true";
    process.env.ANTHROPIC_API_KEY = "test-key";

    const spy = jest.spyOn(AnthropicClassifierAdapter.prototype, "classify");

    const result = await classify(classifyOptions);

    expect(result).toEqual(DEFAULT);
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns defaultValue when the provider is not configured", async () => {
    delete process.env.NEXT_PUBLIC_MOCK_MODE;
    delete process.env.ANTHROPIC_API_KEY;

    global.fetch = jest.fn() as jest.Mock;

    const result = await classify(classifyOptions);

    expect(result).toEqual(DEFAULT);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns parsed metadata on a successful provider response", async () => {
    delete process.env.NEXT_PUBLIC_MOCK_MODE;
    process.env.ANTHROPIC_API_KEY = "test-key";

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          {
            type: "text",
            text: '```json\n{"intent":"question","language":"it"}\n```',
          },
        ],
      }),
    }) as jest.Mock;

    const result = await classify(classifyOptions);

    expect(result).toEqual({ intent: "question", language: "it" });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("returns defaultValue when the provider returns an HTTP error", async () => {
    delete process.env.NEXT_PUBLIC_MOCK_MODE;
    process.env.ANTHROPIC_API_KEY = "test-key";

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }) as jest.Mock;

    const result = await classify(classifyOptions);

    expect(result).toEqual(DEFAULT);
  });

  it("returns defaultValue when JSON parsing fails", async () => {
    delete process.env.NEXT_PUBLIC_MOCK_MODE;
    process.env.ANTHROPIC_API_KEY = "test-key";

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "not json at all" }],
      }),
    }) as jest.Mock;

    const result = await classify(classifyOptions);

    expect(result).toEqual(DEFAULT);
  });

  it("returns defaultValue when validation fails", async () => {
    delete process.env.NEXT_PUBLIC_MOCK_MODE;
    process.env.ANTHROPIC_API_KEY = "test-key";

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: '{"foo":"bar"}' }],
      }),
    }) as jest.Mock;

    const result = await classify(classifyOptions);

    expect(result).toEqual(DEFAULT);
  });
});
