"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { useLLM } from "@/hooks/useLLM";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/chat/constants";
import type { ChatMessage } from "@/lib/chat/types";
import { createId, toLLMMessages } from "@/lib/chat/messages";
import type { PreparedImage } from "@/utils";

interface UseChatSessionParams {
  /** Current composer text (owned by the container). */
  input: string;
  /** Clear the composer text after a send / reset. */
  setInput: (value: string) => void;
  /** Currently staged attachments (from useAttachments). */
  attachments: PreparedImage[];
  /** Clear staged attachments after a send / reset. */
  clearAttachments: () => void;
  /** System prompt sent to the gateway on every turn. Defaults to {@link DEFAULT_SYSTEM_PROMPT}. */
  systemPrompt?: string;
}

export interface ChatSession {
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  isLoading: boolean;
  error: string | null;
  isEmpty: boolean;
  canSend: boolean;
  /** Id of the assistant message currently being regenerated. */
  regeneratingId: string | null;
  /** Send the current input + attachments as a new user turn. */
  submit: () => Promise<void>;
  /** Re-send the current history (e.g. after a failed turn). */
  retry: () => void;
  /** Reset the whole conversation. */
  newChat: () => void;
  /** Re-send history before a message and replace its text with a new reply. */
  regenerate: (message: ChatMessage) => Promise<void>;
}

/**
 * useChatSession — owns the conversation: message history plus the
 * send / retry / regenerate / new-chat orchestration around {@link useLLM}.
 */
export function useChatSession({
  input,
  setInput,
  attachments,
  clearAttachments,
  systemPrompt = DEFAULT_SYSTEM_PROMPT,
}: UseChatSessionParams): ChatSession {
  const { send, isLoading, error } = useLLM();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const isEmpty = messages.length === 0;
  const canSend =
    !isLoading && (input.trim().length > 0 || attachments.length > 0);

  const runSend = useCallback(
    async (history: ChatMessage[]) => {
      const res = await send({
        systemPrompt,
        messages: toLLMMessages(history),
      });
      if (res.ok && res.message) {
        setMessages((prev) => [
          ...prev,
          { id: createId(), role: "assistant", text: res.message as string },
        ]);
      }
    },
    [send, systemPrompt],
  );

  const submit = useCallback(async () => {
    if (!canSend) return;

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      text: input.trim(),
      images: attachments.length > 0 ? attachments : undefined,
    };

    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
    setInput("");
    clearAttachments();

    await runSend(nextHistory);
  }, [canSend, input, attachments, messages, runSend, setInput, clearAttachments]);

  // On a failed turn the user message stays in the thread (no assistant reply
  // was appended), so retrying simply re-sends the current history.
  const retry = useCallback(() => {
    if (!isLoading && messages.length > 0) runSend(messages);
  }, [isLoading, messages, runSend]);

  const newChat = useCallback(() => {
    setMessages([]);
    setInput("");
    clearAttachments();
  }, [setInput, clearAttachments]);

  const regenerate = useCallback(
    async (message: ChatMessage) => {
      if (isLoading || regeneratingId) return;
      const index = messages.findIndex((m) => m.id === message.id);
      if (index < 0) return;

      const history = messages.slice(0, index);
      setRegeneratingId(message.id);
      try {
        const res = await send({
          systemPrompt,
          messages: toLLMMessages(history),
        });
        if (res.ok && res.message) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === message.id
                ? { ...m, text: res.message as string, feedback: undefined }
                : m,
            ),
          );
        }
      } finally {
        setRegeneratingId(null);
      }
    },
    [isLoading, regeneratingId, messages, send, systemPrompt],
  );

  return {
    messages,
    setMessages,
    isLoading,
    error,
    isEmpty,
    canSend,
    regeneratingId,
    submit,
    retry,
    newChat,
    regenerate,
  };
}
