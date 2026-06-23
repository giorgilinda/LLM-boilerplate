"use client";

import React, { useCallback, useState } from "react";
import styles from "./Chat.module.css";
import { useTranslation } from "@/hooks/useTranslation";
import { useAttachments } from "@/hooks/useAttachments";
import { useChatSession } from "@/hooks/useChatSession";
import { useFeedback } from "@/hooks/useFeedback";
import { IS_MOCK_MODE } from "@/lib/chat/constants";
import type { ChatMessage } from "@/lib/chat/types";
import { Composer } from "@/components/Composer/Composer";
import { MessageThread } from "@/components/MessageThread/MessageThread";
import { FeedbackDialog } from "@/components/FeedbackDialog/FeedbackDialog";

/**
 * Chat — the reference conversation view: a Claude-style thread with a growing
 * composer, image attachments (file picker, drag-and-drop, paste), and
 * per-response actions (copy, feedback, regenerate).
 *
 * This component is the composition root. The actual work lives in focused
 * units elsewhere:
 * - {@link useChatSession} — message history + send / retry / regenerate / new-chat
 * - {@link useAttachments} — staging images from picker / paste / drop
 * - {@link useFeedback} — thumbs up/down + optional detail dialog
 * - {@link Composer} — the input UI
 * - {@link MessageThread} — the rendered conversation, loading + error states
 *
 * Set `NEXT_PUBLIC_MOCK_MODE=true` in `.env.local` to develop this UI without
 * spending tokens — the gateway returns canned responses (and acknowledges
 * attached images), so the whole flow is testable offline.
 */
export function Chat() {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const attachments = useAttachments();
  const session = useChatSession({
    input,
    setInput,
    attachments: attachments.attachments,
    clearAttachments: attachments.clear,
  });
  const feedback = useFeedback(session.setMessages);

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

  const composer = (
    <Composer
      input={input}
      onInputChange={setInput}
      onSubmit={session.submit}
      canSend={session.canSend}
      attachments={attachments.attachments}
      isDragging={attachments.isDragging}
      onFiles={attachments.handleFiles}
      onRemoveAttachment={attachments.removeAttachment}
      onPaste={attachments.handlePaste}
      dropzoneProps={attachments.dropzoneProps}
    />
  );

  const actionsDisabled =
    session.isLoading || session.regeneratingId !== null;

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        {IS_MOCK_MODE && (
          <span className={styles.badge}>{t("chat.mockMode")}</span>
        )}
        {!session.isEmpty && (
          <button
            type="button"
            className={styles.newChat}
            onClick={session.newChat}
          >
            {t("chat.newChat")}
          </button>
        )}
      </div>

      {session.isEmpty ? (
        <div className={styles.welcome}>
          <h1 className={styles.greeting}>{t("chat.greeting")}</h1>
          <p className={styles.subtitle}>{t("chat.subtitle")}</p>
          {composer}
        </div>
      ) : (
        <MessageThread
          messages={session.messages}
          isLoading={session.isLoading}
          error={session.error}
          regeneratingId={session.regeneratingId}
          copiedId={copiedId}
          actionsDisabled={actionsDisabled}
          onRetry={session.retry}
          onCopy={handleCopy}
          onFeedback={feedback.handleFeedback}
          onRegenerate={session.regenerate}
          composer={composer}
        />
      )}

      {feedback.feedbackTarget && (
        <FeedbackDialog
          rating={feedback.feedbackTarget.rating}
          onSubmit={feedback.submitFeedback}
          onClose={feedback.closeFeedback}
        />
      )}
    </div>
  );
}
