import { createId, toLLMMessages } from "./messages";
import type { ChatMessage } from "./types";

describe("createId", () => {
  it("returns a non-empty string", () => {
    expect(createId()).toMatch(/^[a-z0-9]+$/);
  });
});

describe("toLLMMessages", () => {
  it("passes plain text messages through as strings", () => {
    const messages: ChatMessage[] = [
      { id: "1", role: "user", text: "Hello" },
      { id: "2", role: "assistant", text: "Hi" },
    ];
    expect(toLLMMessages(messages)).toEqual([
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi" },
    ]);
  });

  it("converts user messages with images to content blocks", () => {
    const block = {
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: "image/jpeg" as const,
        data: "QUJD",
      },
    };
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        text: "",
        images: [{ block, previewUrl: "data:...", name: "pic.png" }],
      },
    ];
    expect(toLLMMessages(messages)).toEqual([
      { role: "user", content: [block] },
    ]);
  });

  it("puts images before text in multimodal content", () => {
    const block = {
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: "image/jpeg" as const,
        data: "QUJD",
      },
    };
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        text: "What is this?",
        images: [{ block, previewUrl: "data:...", name: "pic.png" }],
      },
    ];
    expect(toLLMMessages(messages)).toEqual([
      {
        role: "user",
        content: [block, { type: "text", text: "What is this?" }],
      },
    ]);
  });
});
