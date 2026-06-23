import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * POST /api/feedback
 *
 * Records thumbs-up / thumbs-down feedback on an assistant response.
 *
 * STORAGE: this boilerplate persists feedback to an append-only JSON log at
 * `data/feedback.json` (one event per click, so toggling off is recorded as a
 * `null` rating rather than mutating history). That keeps the example
 * dependency-free and inspectable.
 *
 * PRODUCTION CAVEAT: writing to the local filesystem only works on a
 * persistent Node server. Serverless platforms (e.g. Vercel) have a read-only
 * / ephemeral filesystem, so for a real app replace {@link appendFeedback}
 * with a database insert — the route contract stays identical.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const FEEDBACK_FILE = path.join(DATA_DIR, "feedback.json");

type Rating = "up" | "down" | null;

interface FeedbackEvent {
  messageId: string;
  rating: Rating;
  /**
   * For negative feedback, an optional machine-readable issue category (e.g.
   * "factually_incorrect"). Null when not provided / not applicable.
   */
  category: string | null;
  /** Optional free-text the user typed to explain their rating. */
  details: string | null;
  /** A snapshot of the rated response, handy when reviewing feedback later. */
  text: string;
  createdAt: string;
}

function isValidRating(value: unknown): value is Rating {
  return value === "up" || value === "down" || value === null;
}

/** Accept a string (trimmed to a sane length) or coerce anything else to null. */
function optionalString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, maxLength) : null;
}

async function readFeedback(): Promise<FeedbackEvent[]> {
  try {
    const raw = await fs.readFile(FEEDBACK_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FeedbackEvent[]) : [];
  } catch {
    // File missing or unreadable — treat as an empty log.
    return [];
  }
}

async function appendFeedback(event: FeedbackEvent): Promise<void> {
  const events = await readFeedback();
  events.push(event);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FEEDBACK_FILE, JSON.stringify(events, null, 2), "utf8");
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      messageId?: unknown;
      rating?: unknown;
      category?: unknown;
      details?: unknown;
      text?: unknown;
    };

    if (typeof body.messageId !== "string" || !isValidRating(body.rating)) {
      return NextResponse.json(
        { ok: false, error: "messageId (string) and rating (up|down|null) are required." },
        { status: 400 },
      );
    }

    await appendFeedback({
      messageId: body.messageId,
      rating: body.rating,
      category: optionalString(body.category, 64),
      details: optionalString(body.details, 2000),
      text: typeof body.text === "string" ? body.text : "",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to record feedback." },
      { status: 500 },
    );
  }
}
