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
 * conversation, image attachments, and the error/retry + reset flows.
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

beforeEach(() => {
  mockSend.mockReset();
  mockState.isLoading = false;
  mockState.error = null;
  mockIsImageFile.mockReturnValue(true);
  mockPrepareImage.mockReset();
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
});
