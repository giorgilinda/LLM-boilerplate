import React from "react";
import styles from "@/components/Chat/Chat.module.css";
import { useTranslation } from "@/hooks/useTranslation";
import type { ChatMessage, Feedback } from "@/lib/chat/types";
import {
  CopyIcon,
  CheckIcon,
  ThumbUpIcon,
  ThumbDownIcon,
  RetryIcon,
} from "./icons";

interface MessageProps {
  message: ChatMessage;
  isRegenerating: boolean;
  isCopied: boolean;
  actionsDisabled: boolean;
  onCopy: (message: ChatMessage) => void;
  onFeedback: (message: ChatMessage, rating: Feedback) => void;
  onRegenerate: (message: ChatMessage) => void;
}

/** A single rendered message (text + optional image thumbnails + actions). */
export function Message({
  message,
  isRegenerating,
  isCopied,
  actionsDisabled,
  onCopy,
  onFeedback,
  onRegenerate,
}: MessageProps) {
  const { t } = useTranslation();
  const isUser = message.role === "user";
  const label = t(isUser ? "chat.you" : "chat.assistant");
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
