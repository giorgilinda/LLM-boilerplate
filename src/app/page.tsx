"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "./page.module.css";
import { useLLM } from "@/hooks/useLLM";
import { useTranslation } from "@/hooks/useTranslation";
import { prepareImage, isImageFile, type PreparedImage } from "@/utils";
import type { LLMMessage } from "@/lib/llm-gateway/types";
import type { MessageKey } from "@/lib/i18n/messages";

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

/** A thumbs rating the user can give an assistant response. */
type Feedback = "up" | "down";

/** A message as rendered in the UI — richer than the wire shape so previews persist. */
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** Only present on user messages that carried attachments. */
  images?: PreparedImage[];
  /** Only present on assistant messages the user has rated. */
  feedback?: Feedback;
}

const IS_MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

/**
 * Issue categories offered for negative feedback. `value` is the stable,
 * machine-readable string sent to the API; `labelKey` is the translated label
 * shown in the dropdown. Mirrors the set Claude offers on thumbs-down.
 */
const NEGATIVE_FEEDBACK_CATEGORIES: ReadonlyArray<{
  value: string;
  labelKey: MessageKey;
}> = [
  { value: "ui_bug", labelKey: "feedback.category.uiBug" },
  {
    value: "overcautious_refusal",
    labelKey: "feedback.category.overcautiousRefusal",
  },
  {
    value: "poor_image_understanding",
    labelKey: "feedback.category.poorImageUnderstanding",
  },
  {
    value: "didnt_follow_instructions",
    labelKey: "feedback.category.didntFollowInstructions",
  },
  {
    value: "factually_incorrect",
    labelKey: "feedback.category.factuallyIncorrect",
  },
  {
    value: "incomplete_response",
    labelKey: "feedback.category.incompleteResponse",
  },
  {
    value: "should_have_used_reasoning",
    labelKey: "feedback.category.shouldHaveUsedReasoning",
  },
  {
    value: "should_have_searched_web",
    labelKey: "feedback.category.shouldHaveSearchedWeb",
  },
  { value: "memory_issue", labelKey: "feedback.category.memoryIssue" },
  { value: "report_content", labelKey: "feedback.category.reportContent" },
];

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
  // Id of the assistant message currently being regenerated (shows an inline
  // "thinking" indicator in place of that bubble), and the last-copied message
  // (drives the transient "Copied" affordance).
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // The response + rating currently being elaborated on in the feedback dialog
  // (null = dialog closed).
  const [feedbackTarget, setFeedbackTarget] = useState<{
    message: ChatMessage;
    rating: Feedback;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const isEmpty = messages.length === 0;
  const canSend =
    !isLoading && (input.trim().length > 0 || attachments.length > 0);

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

  const handleFiles = useCallback(async (files: FileList | File[] | null) => {
    if (!files) return;
    const prepared = await Promise.all(
      Array.from(files).filter(isImageFile).map(prepareImage),
    );
    if (prepared.length > 0) {
      setAttachments((prev) => [...prev, ...prepared]);
    }
  }, []);

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
    [handleFiles],
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
    [handleFiles],
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
    [send],
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

  const handleCopy = useCallback(async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopiedId(message.id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === message.id ? null : current));
      }, 1500);
    } catch {
      // Clipboard can be unavailable (insecure context / denied permission);
      // failing silently keeps the boilerplate simple.
    }
  }, []);

  // Fire-and-forget POST to the feedback log. Best-effort: network failures
  // are swallowed so a flaky logging endpoint never breaks the chat UI.
  const postFeedback = useCallback(
    (payload: {
      messageId: string;
      rating: Feedback | null;
      category?: string | null;
      details?: string | null;
      text: string;
    }) => {
      void fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {
        // Best-effort logging endpoint; ignore network failures.
      });
    },
    [],
  );

  // Clicking a thumb toggles its active state. Turning a rating ON opens the
  // dialog so the user can (optionally) explain it; turning it OFF just clears
  // the rating and logs the removal. The rating itself is logged on dialog
  // submit/cancel, so each user action produces exactly one feedback event.
  const handleFeedback = useCallback(
    (message: ChatMessage, rating: Feedback) => {
      const isClearing = message.feedback === rating;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? { ...m, feedback: isClearing ? undefined : rating }
            : m,
        ),
      );

      if (isClearing) {
        postFeedback({
          messageId: message.id,
          rating: null,
          text: message.text,
        });
        setFeedbackTarget((current) =>
          current?.message.id === message.id ? null : current,
        );
        return;
      }

      setFeedbackTarget({ message, rating });
    },
    [postFeedback],
  );

  const submitFeedback = useCallback(
    (category: string | null, details: string | null) => {
      if (!feedbackTarget) return;
      postFeedback({
        messageId: feedbackTarget.message.id,
        rating: feedbackTarget.rating,
        category,
        details,
        text: feedbackTarget.message.text,
      });
      setFeedbackTarget(null);
    },
    [feedbackTarget, postFeedback],
  );

  // Cancelling keeps the thumb selected (the user did rate) but logs the
  // rating with no extra detail.
  const closeFeedback = useCallback(() => {
    if (!feedbackTarget) return;
    postFeedback({
      messageId: feedbackTarget.message.id,
      rating: feedbackTarget.rating,
      text: feedbackTarget.message.text,
    });
    setFeedbackTarget(null);
  }, [feedbackTarget, postFeedback]);

  // Regenerate a specific assistant response: re-send the conversation up to
  // (but excluding) that message, then replace its text with the new reply.
  const regenerateMessage = useCallback(
    async (message: ChatMessage) => {
      if (isLoading || regeneratingId) return;
      const index = messages.findIndex((m) => m.id === message.id);
      if (index < 0) return;

      const history = messages.slice(0, index);
      setRegeneratingId(message.id);
      try {
        const res = await send({
          systemPrompt: SYSTEM_PROMPT,
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
    [isLoading, regeneratingId, messages, send],
  );

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
        {IS_MOCK_MODE && (
          <span className={styles.badge}>🔜{t("chat.mockMode")}</span>
        )}
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
                t={t}
                isRegenerating={regeneratingId === m.id}
                isCopied={copiedId === m.id}
                actionsDisabled={isLoading || regeneratingId !== null}
                onCopy={handleCopy}
                onFeedback={handleFeedback}
                onRegenerate={regenerateMessage}
              />
            ))}

            {isLoading && !regeneratingId && (
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

      {feedbackTarget && (
        <FeedbackDialog
          rating={feedbackTarget.rating}
          t={t}
          onSubmit={submitFeedback}
          onClose={closeFeedback}
        />
      )}
    </div>
  );
}

interface MessageProps {
  message: ChatMessage;
  label: string;
  t: (key: MessageKey) => string;
  isRegenerating: boolean;
  isCopied: boolean;
  actionsDisabled: boolean;
  onCopy: (message: ChatMessage) => void;
  onFeedback: (message: ChatMessage, rating: Feedback) => void;
  onRegenerate: (message: ChatMessage) => void;
}

/** A single rendered message (text + optional image thumbnails + actions). */
function Message({
  message,
  label,
  t,
  isRegenerating,
  isCopied,
  actionsDisabled,
  onCopy,
  onFeedback,
  onRegenerate,
}: MessageProps) {
  const isUser = message.role === "user";
  // Actions only make sense on a finished assistant reply.
  const showActions = !isUser && message.text.length > 0 && !isRegenerating;

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

      {isRegenerating ? (
        <div className={styles.thinking}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>
      ) : (
        message.text && <p className={styles.bubble}>{message.text}</p>
      )}

      {showActions && (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => onCopy(message)}
            aria-label={t("chat.copy")}
            title={isCopied ? t("chat.copied") : t("chat.copy")}
          >
            {isCopied ? <CheckIcon /> : <CopyIcon />}
          </button>
          <button
            type="button"
            className={`${styles.actionButton} ${
              message.feedback === "up" ? styles.actionActive : ""
            }`}
            onClick={() => onFeedback(message, "up")}
            aria-label={t("chat.goodResponse")}
            aria-pressed={message.feedback === "up"}
            title={t("chat.goodResponse")}
          >
            <ThumbUpIcon />
          </button>
          <button
            type="button"
            className={`${styles.actionButton} ${
              message.feedback === "down" ? styles.actionActive : ""
            }`}
            onClick={() => onFeedback(message, "down")}
            aria-label={t("chat.badResponse")}
            aria-pressed={message.feedback === "down"}
            title={t("chat.badResponse")}
          >
            <ThumbDownIcon />
          </button>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => onRegenerate(message)}
            disabled={actionsDisabled}
            aria-label={t("chat.regenerate")}
            title={t("chat.regenerate")}
          >
            <RetryIcon />
          </button>
        </div>
      )}
    </div>
  );
}

interface FeedbackDialogProps {
  rating: Feedback;
  t: (key: MessageKey) => string;
  /** Called with the optional category + details when the user submits. */
  onSubmit: (category: string | null, details: string | null) => void;
  /** Called when the user cancels, presses Escape, or clicks the backdrop. */
  onClose: () => void;
}

/**
 * Claude-style modal for elaborating on a thumbs up/down rating. Both fields
 * are optional: positive feedback shows only a details textarea, negative
 * feedback also offers an issue-category dropdown.
 */
function FeedbackDialog({ rating, t, onSubmit, onClose }: FeedbackDialogProps) {
  const isPositive = rating === "up";
  const [category, setCategory] = useState("");
  const [details, setDetails] = useState("");
  const detailsRef = useRef<HTMLTextAreaElement>(null);

  // Autofocus the first text field, and close on Escape.
  useEffect(() => {
    detailsRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleSubmit = () => {
    onSubmit(category || null, details.trim() || null);
  };

  return (
    <div
      className={styles.dialogBackdrop}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={t(
          isPositive ? "feedback.positiveTitle" : "feedback.negativeTitle",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={styles.dialogTitle}>
          {t(isPositive ? "feedback.positiveTitle" : "feedback.negativeTitle")}
        </h2>

        {!isPositive && (
          <label className={styles.dialogField}>
            <span className={styles.dialogLabel}>
              {t("feedback.categoryLabel")}
            </span>
            <select
              className={styles.dialogSelect}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">{t("feedback.categoryPlaceholder")}</option>
              {NEGATIVE_FEEDBACK_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {t(c.labelKey)}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className={styles.dialogField}>
          <span className={styles.dialogLabel}>
            {t("feedback.detailsLabel")}
          </span>
          <textarea
            ref={detailsRef}
            className={styles.dialogTextarea}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={t(
              isPositive
                ? "feedback.detailsPlaceholderPositive"
                : "feedback.detailsPlaceholderNegative",
            )}
            rows={3}
          />
        </label>

        <p className={styles.dialogDisclaimer}>{t("feedback.disclaimer")}</p>

        <div className={styles.dialogActions}>
          <button
            type="button"
            className={styles.dialogCancel}
            onClick={onClose}
          >
            {t("feedback.cancel")}
          </button>
          <button
            type="button"
            className={styles.dialogSubmit}
            onClick={handleSubmit}
          >
            {t("feedback.submit")}
          </button>
        </div>
      </div>
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

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <rect
        x="9"
        y="9"
        width="11"
        height="11"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M5 15V5a2 2 0 0 1 2-2h8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M5 13l4 4L19 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThumbUpIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M7 10v10H4V10h3zm0 0l5-7a2 2 0 0 1 2 2v3h4.5a2 2 0 0 1 2 2.3l-1.1 7A2 2 0 0 1 17.4 20H7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThumbDownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M17 14V4h3v10h-3zm0 0l-5 7a2 2 0 0 1-2-2v-3H5.5a2 2 0 0 1-2-2.3l1.1-7A2 2 0 0 1 6.6 4H17"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
