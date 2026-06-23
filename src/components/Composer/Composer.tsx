"use client";

import React, { useEffect, useRef } from "react";
import styles from "@/components/Chat/Chat.module.css";
import { useTranslation } from "@/hooks/useTranslation";
import type { AttachmentDropzoneProps } from "@/hooks/useAttachments";
import type { PreparedImage } from "@/utils";
import { PlusIcon, ArrowUpIcon } from "./icons";

interface ComposerProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  canSend: boolean;
  attachments: PreparedImage[];
  isDragging: boolean;
  onFiles: (files: FileList | File[] | null) => void;
  onRemoveAttachment: (index: number) => void;
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  dropzoneProps: AttachmentDropzoneProps;
}

/**
 * Composer — the message input: an auto-growing textarea, attach/send buttons,
 * staged attachment thumbnails, and a drag-and-drop zone. Purely presentational;
 * all attachment state and handlers come from {@link useAttachments} via props.
 */
export function Composer({
  input,
  onInputChange,
  onSubmit,
  canSend,
  attachments,
  isDragging,
  onFiles,
  onRemoveAttachment,
  onPaste,
  dropzoneProps,
}: ComposerProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the composer textarea up to a max height (CSS caps it).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div
      className={`${styles.composer} ${isDragging ? styles.dragging : ""}`}
      onDragOver={dropzoneProps.onDragOver}
      onDragLeave={dropzoneProps.onDragLeave}
      onDrop={dropzoneProps.onDrop}
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
                onClick={() => onRemoveAttachment(index)}
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
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={onPaste}
          placeholder={t("chat.placeholder")}
          rows={1}
        />

        <button
          type="button"
          className={styles.sendButton}
          onClick={onSubmit}
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
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
