"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "./page.module.css";
import { useLLM } from "@/hooks/useLLM";
import { useTranslation } from "@/hooks/useTranslation";
import { prepareImage, isImageFile, type PreparedImage } from "@/utils";
import type { LLMMessage } from "@/lib/llm-gateway/types";

/**
 * Chat example page — the reference implementation for talking to the LLM
 * gateway from the UI.
 *
 * It is intentionally a single self-contained file so it can be copied as the
 * starting point for a new project: a Claude-style conversation view, a
 * growing composer, and image attachments that flow through the gateway's
 * multimodal `ImageBlock` contract via {@link useLLM}.
 *
 * What it demonstrates:
 * - Calling the gateway with `useLLM().send({ systemPrompt, messages })`.
 * - Multi-turn history (text + images) kept in component state.
 * - Client-side image downscaling + base64 encoding via {@link prepareImage}.
 * - Loading / error states, retry, and a reset ("new chat").
 *
 * Set `NEXT_PUBLIC_MOCK_MODE=true` in `.env.local` to develop this UI without
 * spending tokens — the gateway returns canned responses (and acknowledges
 * attached images), so the whole flow is testable offline.
 */

const SYSTEM_PROMPT =
  "You are a helpful, concise assistant. When the user attaches an image, describe what you see and answer questions about it.";

/** A message as rendered in the UI — richer than the wire shape so previews persist. */
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** Only present on user messages that carried attachments. */
  images?: PreparedImage[];
}

const IS_MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

function createId(): string {
  return Math.random().toString(36).slice(2);
}

/**
 * Convert the UI message list into the gateway's `LLMMessage[]` wire format.
 *
 * User messages with attachments become an array of content blocks (images
 * first, then any text); everything else stays a plain string. This mirrors
 * the `MessageContent` union the gateway accepts.
 */
function toLLMMessages(messages: ChatMessage[]): LLMMessage[] {
  return messages.map((m) => {
    if (m.role === "user" && m.images && m.images.length > 0) {
      return {
        role: "user",
        content: [
          ...m.images.map((img) => img.block),
          ...(m.text ? [{ type: "text" as const, text: m.text }] : []),
        ],
      };
    }
    return { role: m.role, content: m.text };
  });
}

export default function Home() {
  const { t } = useTranslation();
  const { send, isLoading, error } = useLLM();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<PreparedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const isEmpty = messages.length === 0;
  const canSend = !isLoading && (input.trim().length > 0 || attachments.length > 0);

  // Keep the latest message in view as the conversation grows.
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-grow the composer textarea up to a max height (CSS caps it).
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(resizeTextarea, [input, resizeTextarea]);

  const handleFiles = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files) return;
      const prepared = await Promise.all(
        Array.from(files).filter(isImageFile).map(prepareImage)
      );
      if (prepared.length > 0) {
        setAttachments((prev) => [...prev, ...prepared]);
      }
    },
    []
  );

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Paste-from-clipboard: screenshots and copied images arrive as "file" items
  // on the clipboard. preventDefault stops the image being pasted as junk text.
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const images: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file && isImageFile(file)) images.push(file);
        }
      }

      if (images.length > 0) {
        e.preventDefault();
        void handleFiles(images);
      }
    },
    [handleFiles]
  );

  // Drag-and-drop: `dragOver` must call preventDefault for the drop to fire.
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      void handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const runSend = useCallback(
    async (history: ChatMessage[]) => {
      const res = await send({
        systemPrompt: SYSTEM_PROMPT,
        messages: toLLMMessages(history),
      });
      if (res.ok && res.message) {
        setMessages((prev) => [
          ...prev,
          { id: createId(), role: "assistant", text: res.message as string },
        ]);
      }
    },
    [send]
  );

  const handleSubmit = useCallback(async () => {
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
    setAttachments([]);

    await runSend(nextHistory);
  }, [canSend, input, attachments, messages, runSend]);

  // On a failed turn the user message stays in the thread (no assistant reply
  // was appended), so retrying simply re-sends the current history.
  const handleRetry = useCallback(() => {
    if (!isLoading && messages.length > 0) runSend(messages);
  }, [isLoading, messages, runSend]);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setInput("");
    setAttachments([]);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const composer = (
    <div
      className={`${styles.composer} ${isDragging ? styles.dragging : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className={styles.dropHint}>{t("chat.dropHint")}</div>
      )}

      {attachments.length > 0 && (
        <ul className={styles.attachments}>
          {attachments.map((img, index) => (
            <li key={`${img.name}-${index}`} className={styles.thumb}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.previewUrl} alt={img.name || t("chat.imageAlt")} />
              <button
                type="button"
                className={styles.thumbRemove}
                onClick={() => removeAttachment(index)}
                aria-label={t("chat.removeImage")}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.inputRow}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => fileInputRef.current?.click()}
          aria-label={t("chat.attachImage")}
          title={t("chat.attachImage")}
        >
          <PlusIcon />
        </button>

        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={t("chat.placeholder")}
          rows={1}
        />

        <button
          type="button"
          className={styles.sendButton}
          onClick={handleSubmit}
          disabled={!canSend}
          aria-label={t("chat.send")}
          title={t("chat.send")}
        >
          <ArrowUpIcon />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        {IS_MOCK_MODE && <span className={styles.badge}>{t("chat.mockMode")}</span>}
        {!isEmpty && (
          <button
            type="button"
            className={styles.newChat}
            onClick={handleNewChat}
          >
            {t("chat.newChat")}
          </button>
        )}
      </div>

      {isEmpty ? (
        <div className={styles.welcome}>
          <h1 className={styles.greeting}>{t("chat.greeting")}</h1>
          <p className={styles.subtitle}>{t("chat.subtitle")}</p>
          {composer}
        </div>
      ) : (
        <>
          <div className={styles.thread}>
            {messages.map((m) => (
              <Message
                key={m.id}
                message={m}
                label={t(m.role === "user" ? "chat.you" : "chat.assistant")}
              />
            ))}

            {isLoading && (
              <div className={`${styles.message} ${styles.assistantMessage}`}>
                <span className={styles.role}>{t("chat.assistant")}</span>
                <div className={styles.thinking}>
                  <span className={styles.dot} />
                  <span className={styles.dot} />
                  <span className={styles.dot} />
                </div>
              </div>
            )}

            {error && !isLoading && (
              <div className={styles.errorBanner} role="alert">
                <span>
                  {t("chat.error")} {error}
                </span>
                <button
                  type="button"
                  className={styles.retry}
                  onClick={handleRetry}
                >
                  {t("chat.retry")}
                </button>
              </div>
            )}

            <div ref={threadEndRef} />
          </div>

          <div className={styles.composerDock}>{composer}</div>
        </>
      )}
    </div>
  );
}

/** A single rendered message (text + optional image thumbnails). */
function Message({ message, label }: { message: ChatMessage; label: string }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`${styles.message} ${
        isUser ? styles.userMessage : styles.assistantMessage
      }`}
    >
      <span className={styles.role}>{label}</span>
      {message.images && message.images.length > 0 && (
        <div className={styles.messageImages}>
          {message.images.map((img, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${img.name}-${index}`}
              src={img.previewUrl}
              alt={img.name}
              className={styles.messageImage}
            />
          ))}
        </div>
      )}
      {message.text && <p className={styles.bubble}>{message.text}</p>}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        d="M12 19V5M5 12l7-7 7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
