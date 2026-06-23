import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Home from "@/app/page";
import { prepareImage, isImageFile } from "@/utils";
import type { LLMResponse } from "@/lib/llm-gateway/types";

/**
 * Integration tests for the chat example page.
 *
 * The LLM hook and the (browser-only) image helper are mocked so the tests
 * focus on the page's behavior: building the gateway request, rendering the
 * conversation, image attachments, error/retry + reset, and per-response
 * actions (copy, feedback, regenerate).
 */

const mockSend = jest.fn<Promise<LLMResponse>, [unknown]>();
const mockState: { isLoading: boolean; error: string | null } = {
  isLoading: false,
  error: null,
};

jest.mock("@/hooks/useLLM", () => ({
  useLLM: () => ({
    send: mockSend,
    response: null,
    isLoading: mockState.isLoading,
    error: mockState.error,
  }),
}));

jest.mock("@/utils", () => ({
  prepareImage: jest.fn(),
  isImageFile: jest.fn(),
}));

const mockPrepareImage = prepareImage as jest.Mock;
const mockIsImageFile = isImageFile as jest.Mock;

function typeMessage(value: string): void {
  const textarea = screen.getByPlaceholderText("Send a message…");
  fireEvent.change(textarea, { target: { value } });
}

/** Send a user message and wait for the assistant reply to appear. */
async function sendMessage(
  userText: string,
  assistantReply: string,
): Promise<void> {
  typeMessage(userText);
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  await screen.findByText(assistantReply);
}

beforeEach(() => {
  mockSend.mockReset();
  mockState.isLoading = false;
  mockState.error = null;
  mockIsImageFile.mockReturnValue(true);
  mockPrepareImage.mockReset();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true }),
  }) as jest.Mock;
});

describe("chat page", () => {
  it("renders the welcome state with a composer", () => {
    render(<Home />);
    expect(
      screen.getByText("How can I help you today?")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Send a message…")
    ).toBeInTheDocument();
  });

  it("disables send until there is input", () => {
    render(<Home />);
    const sendButton = screen.getByRole("button", { name: "Send message" });
    expect(sendButton).toBeDisabled();

    typeMessage("Hello");
    expect(sendButton).toBeEnabled();
  });

  it("sends a text message and renders the assistant reply", async () => {
    mockSend.mockResolvedValue({ ok: true, message: "Hi there!" });
    render(<Home />);

    typeMessage("Hello");
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("Hi there!")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();

    expect(mockSend).toHaveBeenCalledWith({
      systemPrompt: expect.any(String),
      messages: [{ role: "user", content: "Hello" }],
    });
  });

  it("sends on Enter (without Shift)", async () => {
    mockSend.mockResolvedValue({ ok: true, message: "Reply" });
    render(<Home />);

    const textarea = screen.getByPlaceholderText("Send a message…");
    fireEvent.change(textarea, { target: { value: "Ping" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(await screen.findByText("Reply")).toBeInTheDocument();
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("attaches an image and includes its block in the request", async () => {
    mockSend.mockResolvedValue({ ok: true, message: "Nice picture" });
    const block = {
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: "image/jpeg" as const,
        data: "QUJD",
      },
    };
    mockPrepareImage.mockResolvedValue({
      block,
      previewUrl: "data:image/jpeg;base64,QUJD",
      name: "pic.png",
    });

    const { container } = render(<Home />);

    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(["x"], "pic.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Thumbnail preview appears once the image is prepared.
    expect(await screen.findByAltText("pic.png")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() =>
      expect(mockSend).toHaveBeenCalledWith({
        systemPrompt: expect.any(String),
        messages: [{ role: "user", content: [block] }],
      })
    );
  });

  it("attaches an image pasted from the clipboard", async () => {
    mockPrepareImage.mockResolvedValue({
      block: {
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: "QUJD" },
      },
      previewUrl: "data:image/jpeg;base64,QUJD",
      name: "pasted.png",
    });

    render(<Home />);
    const textarea = screen.getByPlaceholderText("Send a message…");

    const file = new File(["x"], "pasted.png", { type: "image/png" });
    const pasteEvent = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(pasteEvent, "clipboardData", {
      value: {
        items: [{ kind: "file", type: "image/png", getAsFile: () => file }],
      },
    });
    fireEvent(textarea, pasteEvent);

    expect(await screen.findByAltText("pasted.png")).toBeInTheDocument();
  });

  it("attaches an image dropped onto the composer", async () => {
    mockPrepareImage.mockResolvedValue({
      block: {
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: "QUJD" },
      },
      previewUrl: "data:image/jpeg;base64,QUJD",
      name: "dropped.png",
    });

    render(<Home />);
    const textarea = screen.getByPlaceholderText("Send a message…");

    const file = new File(["x"], "dropped.png", { type: "image/png" });
    const dropEvent = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(dropEvent, "dataTransfer", {
      value: { files: [file], types: ["Files"] },
    });
    fireEvent(textarea, dropEvent);

    expect(await screen.findByAltText("dropped.png")).toBeInTheDocument();
  });

  it("shows an error banner with a retry that re-sends", async () => {
    mockSend.mockResolvedValue({
      ok: false,
      error: {
        code: "PROVIDER_ERROR",
        message: "ANTHROPIC_API_KEY is not set.",
        retryable: false,
      },
    });
    mockState.error = "ANTHROPIC_API_KEY is not set.";

    render(<Home />);
    typeMessage("test");
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    const retry = await screen.findByRole("button", { name: "Retry" });
    expect(mockSend).toHaveBeenCalledTimes(1);

    fireEvent.click(retry);
    await waitFor(() => expect(mockSend).toHaveBeenCalledTimes(2));
  });

  it("clears the conversation with New chat", async () => {
    mockSend.mockResolvedValue({ ok: true, message: "Hi there!" });
    render(<Home />);

    typeMessage("Hello");
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(await screen.findByText("Hi there!")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "New chat" }));

    expect(screen.queryByText("Hi there!")).not.toBeInTheDocument();
    expect(
      screen.getByText("How can I help you today?")
    ).toBeInTheDocument();
  });

  it("copies an assistant reply to the clipboard", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    mockSend.mockResolvedValue({ ok: true, message: "Copy me" });
    render(<Home />);
    await sendMessage("Hello", "Copy me");

    const copyButton = screen.getByRole("button", { name: "Copy" });
    fireEvent.click(copyButton);

    expect(writeText).toHaveBeenCalledWith("Copy me");
    await waitFor(() =>
      expect(copyButton).toHaveAttribute("title", "Copied"),
    );
  });

  it("opens the feedback dialog and posts on submit", async () => {
    mockSend.mockResolvedValue({ ok: true, message: "Rate me" });
    render(<Home />);
    await sendMessage("Hello", "Rate me");

    fireEvent.click(screen.getByRole("button", { name: "Good response" }));

    expect(
      screen.getByRole("dialog", { name: "Give positive feedback" }),
    ).toBeInTheDocument();

    fireEvent.change(
      screen.getByPlaceholderText("What did you like about this response?"),
      { target: { value: "Clear and concise" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [, init] = (global.fetch as jest.Mock).mock.calls.at(-1)!;
    expect(JSON.parse(init.body as string)).toMatchObject({
      messageId: expect.any(String),
      rating: "up",
      category: null,
      details: "Clear and concise",
      text: "Rate me",
    });

    expect(
      screen.queryByRole("dialog", { name: "Give positive feedback" }),
    ).not.toBeInTheDocument();
  });

  it("posts rating without details when feedback dialog is cancelled", async () => {
    mockSend.mockResolvedValue({ ok: true, message: "Rate me" });
    render(<Home />);
    await sendMessage("Hello", "Rate me");

    fireEvent.click(screen.getByRole("button", { name: "Bad response" }));
    expect(
      screen.getByRole("dialog", { name: "Give negative feedback" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [, init] = (global.fetch as jest.Mock).mock.calls.at(-1)!;
    expect(JSON.parse(init.body as string)).toMatchObject({
      messageId: expect.any(String),
      rating: "down",
      text: "Rate me",
    });
  });

  it("posts null rating when clearing an active thumb", async () => {
    mockSend.mockResolvedValue({ ok: true, message: "Rate me" });
    render(<Home />);
    await sendMessage("Hello", "Rate me");

    fireEvent.click(screen.getByRole("button", { name: "Good response" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    (global.fetch as jest.Mock).mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Good response" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [, init] = (global.fetch as jest.Mock).mock.calls.at(-1)!;
    expect(JSON.parse(init.body as string)).toMatchObject({
      messageId: expect.any(String),
      rating: null,
      text: "Rate me",
    });
  });

  it("regenerates an assistant reply from sliced history", async () => {
    mockSend
      .mockResolvedValueOnce({ ok: true, message: "First reply" })
      .mockResolvedValueOnce({ ok: true, message: "Second reply" });

    render(<Home />);
    await sendMessage("Hello", "First reply");

    fireEvent.click(
      screen.getByRole("button", { name: "Regenerate response" }),
    );

    await waitFor(() => expect(mockSend).toHaveBeenCalledTimes(2));
    expect(mockSend.mock.calls[1][0]).toEqual({
      systemPrompt: expect.any(String),
      messages: [{ role: "user", content: "Hello" }],
    });
    expect(await screen.findByText("Second reply")).toBeInTheDocument();
    expect(screen.queryByText("First reply")).not.toBeInTheDocument();
  });
});
