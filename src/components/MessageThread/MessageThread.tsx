"use client";

import React, { useEffect, useRef } from "react";
import styles from "@/components/Chat/Chat.module.css";
import { useTranslation } from "@/hooks/useTranslation";
import type { ChatMessage, Feedback } from "@/lib/chat/types";
import { Message } from "@/components/Message/Message";

interface MessageThreadProps {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  regeneratingId: string | null;
  copiedId: string | null;
  actionsDisabled: boolean;
  onRetry: () => void;
  onCopy: (message: ChatMessage) => void;
  onFeedback: (message: ChatMessage, rating: Feedback) => void;
  onRegenerate: (message: ChatMessage) => void;
  /** The composer is rendered docked beneath the thread. */
  composer: React.ReactNode;
}

/**
 * MessageThread — the active conversation view: the message list, the
 * "thinking" indicator while a reply is in flight, an error banner with retry,
 * and the docked composer. Auto-scrolls to the latest message.
 */
export function MessageThread({
  messages,
  isLoading,
  error,
  regeneratingId,
  copiedId,
  actionsDisabled,
  onRetry,
  onCopy,
  onFeedback,
  onRegenerate,
  composer,
}: MessageThreadProps) {
  const { t } = useTranslation();
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Keep the latest message in view as the conversation grows.
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, regeneratingId]);

  return (
    <>
      <div className={styles.thread}>
        {messages.map((m) => (
          <Message
            key={m.id}
            message={m}
            isRegenerating={regeneratingId === m.id}
            isCopied={copiedId === m.id}
            actionsDisabled={actionsDisabled}
            onCopy={onCopy}
            onFeedback={onFeedback}
            onRegenerate={onRegenerate}
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
            <button type="button" className={styles.retry} onClick={onRetry}>
              {t("chat.retry")}
            </button>
          </div>
        )}

        <div ref={threadEndRef} />
      </div>

      <div className={styles.composerDock}>{composer}</div>
    </>
  );
}
