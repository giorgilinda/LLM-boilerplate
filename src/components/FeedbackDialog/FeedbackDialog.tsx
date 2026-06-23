"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "@/components/Chat/Chat.module.css";
import { useTranslation } from "@/hooks/useTranslation";
import { NEGATIVE_FEEDBACK_CATEGORIES } from "@/lib/chat/feedback";
import type { Feedback } from "@/lib/chat/types";

interface FeedbackDialogProps {
  rating: Feedback;
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
export function FeedbackDialog({ rating, onSubmit, onClose }: FeedbackDialogProps) {
  const { t } = useTranslation();
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
