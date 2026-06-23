"use client";

import { useCallback, useState } from "react";
import type { ClipboardEvent, DragEvent } from "react";
import { prepareImage, isImageFile, type PreparedImage } from "@/utils";

export interface AttachmentDropzoneProps {
  onDragOver: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}

export interface UseAttachments {
  /** Currently staged (not yet sent) image attachments. */
  attachments: PreparedImage[];
  /** True while a file is being dragged over the composer. */
  isDragging: boolean;
  /** Prepare + stage image files from a picker, paste, or drop. */
  handleFiles: (files: FileList | File[] | null) => Promise<void>;
  /** Remove a single staged attachment by index. */
  removeAttachment: (index: number) => void;
  /** Clipboard paste handler for the composer textarea. */
  handlePaste: (e: ClipboardEvent<HTMLTextAreaElement>) => void;
  /** Spread onto the composer element to enable drag-and-drop. */
  dropzoneProps: AttachmentDropzoneProps;
  /** Clear all staged attachments (after send / new chat). */
  clear: () => void;
}

/**
 * useAttachments — owns the image-attachment feature for the composer:
 * staging, removal, and the three ways images arrive (file picker, clipboard
 * paste, drag-and-drop). Images are downscaled + base64-encoded via
 * {@link prepareImage} before being staged.
 */
export function useAttachments(): UseAttachments {
  const [attachments, setAttachments] = useState<PreparedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files) return;
      const prepared = await Promise.all(
        Array.from(files).filter(isImageFile).map(prepareImage),
      );
      if (prepared.length > 0) {
        setAttachments((prev) => [...prev, ...prepared]);
      }
    },
    [],
  );

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Paste-from-clipboard: screenshots and copied images arrive as "file" items
  // on the clipboard. preventDefault stops the image being pasted as junk text.
  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLTextAreaElement>) => {
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
  const onDragOver = useCallback((e: DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      setIsDragging(true);
    }
  }, []);

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      void handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const clear = useCallback(() => setAttachments([]), []);

  return {
    attachments,
    isDragging,
    handleFiles,
    removeAttachment,
    handlePaste,
    dropzoneProps: { onDragOver, onDragLeave, onDrop },
    clear,
  };
}
