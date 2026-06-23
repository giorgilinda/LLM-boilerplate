/**
 * @jest-environment node
 */

import { promises as fs } from "node:fs";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/feedback/route";

jest.mock("node:fs", () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
  },
}));

const mockReadFile = fs.readFile as jest.Mock;
const mockWriteFile = fs.writeFile as jest.Mock;
const mockMkdir = fs.mkdir as jest.Mock;

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/feedback", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function lastWrittenEvents(): unknown[] {
  const raw = mockWriteFile.mock.calls.at(-1)?.[1] as string;
  return JSON.parse(raw) as unknown[];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockReadFile.mockRejectedValue(new Error("ENOENT"));
  mockWriteFile.mockResolvedValue(undefined);
  mockMkdir.mockResolvedValue(undefined);
});

describe("POST /api/feedback", () => {
  it("appends a feedback event to the log", async () => {
    const res = await POST(
      makeRequest({
        messageId: "msg-1",
        rating: "up",
        details: "Very helpful",
        text: "Hello from assistant",
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockMkdir).toHaveBeenCalled();
    expect(lastWrittenEvents()).toHaveLength(1);
    expect(lastWrittenEvents()[0]).toMatchObject({
      messageId: "msg-1",
      rating: "up",
      category: null,
      details: "Very helpful",
      text: "Hello from assistant",
      createdAt: expect.any(String),
    });
  });

  it("preserves existing events when appending", async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify([
        {
          messageId: "old",
          rating: "down",
          category: null,
          details: null,
          text: "prior",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ]),
    );

    await POST(
      makeRequest({
        messageId: "msg-2",
        rating: "up",
        text: "new",
      }),
    );

    expect(lastWrittenEvents()).toHaveLength(2);
    expect(lastWrittenEvents()[1]).toMatchObject({
      messageId: "msg-2",
      rating: "up",
    });
  });

  it("accepts null rating for clearing feedback", async () => {
    await POST(
      makeRequest({
        messageId: "msg-1",
        rating: null,
        text: "Hello",
      }),
    );

    expect(lastWrittenEvents()[0]).toMatchObject({
      messageId: "msg-1",
      rating: null,
    });
  });

  it("stores category on negative feedback", async () => {
    await POST(
      makeRequest({
        messageId: "msg-1",
        rating: "down",
        category: "factually_incorrect",
        details: "Wrong date",
        text: "Bad answer",
      }),
    );

    expect(lastWrittenEvents()[0]).toMatchObject({
      rating: "down",
      category: "factually_incorrect",
      details: "Wrong date",
    });
  });

  it("returns 400 when messageId is missing", async () => {
    const res = await POST(makeRequest({ rating: "up", text: "x" }));

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false });
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it("returns 400 when rating is invalid", async () => {
    const res = await POST(
      makeRequest({ messageId: "msg-1", rating: "sideways", text: "x" }),
    );

    expect(res.status).toBe(400);
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it("trims and drops blank optional strings", async () => {
    await POST(
      makeRequest({
        messageId: "msg-1",
        rating: "up",
        category: "   ",
        details: "  \n  ",
        text: "x",
      }),
    );

    expect(lastWrittenEvents()[0]).toMatchObject({
      category: null,
      details: null,
    });
  });

  it("caps category and details length", async () => {
    await POST(
      makeRequest({
        messageId: "msg-1",
        rating: "down",
        category: "c".repeat(100),
        details: "d".repeat(3000),
        text: "x",
      }),
    );

    const event = lastWrittenEvents()[0] as {
      category: string;
      details: string;
    };
    expect(event.category).toHaveLength(64);
    expect(event.details).toHaveLength(2000);
  });
});
