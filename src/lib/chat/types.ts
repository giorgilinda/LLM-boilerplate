import type { PreparedImage } from "@/utils";

/** A thumbs rating the user can give an assistant response. */
export type Feedback = "up" | "down";

/**
 * A message as rendered in the UI — richer than the gateway wire shape so
 * image previews persist in the thread after sending.
 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** Only present on user messages that carried attachments. */
  images?: PreparedImage[];
  /** Only present on assistant messages the user has rated. */
  feedback?: Feedback;
}
