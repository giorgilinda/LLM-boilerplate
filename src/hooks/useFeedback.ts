"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import type { ChatMessage, Feedback } from "@/lib/chat/types";

interface FeedbackTarget {
  message: ChatMessage;
  rating: Feedback;
}

export interface UseFeedback {
  /** The response + rating currently being elaborated on (null = dialog closed). */
  feedbackTarget: FeedbackTarget | null;
  /** Toggle a thumb rating; opening the dialog when turning a rating on. */
  handleFeedback: (message: ChatMessage, rating: Feedback) => void;
  /** Submit optional category + details from the dialog. */
  submitFeedback: (category: string | null, details: string | null) => void;
  /** Close the dialog, logging the rating without extra detail. */
  closeFeedback: () => void;
}

/**
 * useFeedback — owns thumbs up/down state on messages and the optional
 * detail dialog. Each user action produces exactly one event in the feedback
 * log via POST /api/feedback (best-effort).
 */
export function useFeedback(
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>,
): UseFeedback {
  const [feedbackTarget, setFeedbackTarget] = useState<FeedbackTarget | null>(
    null,
  );

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
    [postFeedback, setMessages],
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

  const closeFeedback = useCallback(() => {
    if (!feedbackTarget) return;
    postFeedback({
      messageId: feedbackTarget.message.id,
      rating: feedbackTarget.rating,
      text: feedbackTarget.message.text,
    });
    setFeedbackTarget(null);
  }, [feedbackTarget, postFeedback]);

  return {
    feedbackTarget,
    handleFeedback,
    submitFeedback,
    closeFeedback,
  };
}
