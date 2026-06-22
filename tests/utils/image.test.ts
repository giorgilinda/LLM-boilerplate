import { isImageFile, prepareImage } from "@/utils/image";

/**
 * jsdom doesn't decode images or implement <canvas>, so the browser image
 * pipeline (FileReader -> Image -> canvas) is stubbed here to make
 * prepareImage deterministic.
 *
 * WHY THESE TESTS EXIST:
 * prepareImage originally decoded via `URL.createObjectURL` (a `blob:` URL),
 * which the app's CSP (`img-src 'self' data: https:`) blocks — the image
 * failed to decode in the browser. These tests lock in the data-URL path and
 * the downscale/encoding contract so the regression can't come back.
 */

type Handler = (() => void) | null;

class MockFileReader {
  onload: Handler = null;
  onerror: Handler = null;
  result: string | null = null;
  readAsDataURL(): void {
    this.result = "data:image/png;base64,c291cmNl"; // "source"
    Promise.resolve().then(() => this.onload?.());
  }
}

/** Replace the global Image with a stub that decodes to a fixed size. */
function installImageMock(opts?: {
  width?: number;
  height?: number;
  fail?: boolean;
}): void {
  const { width = 800, height = 600, fail = false } = opts ?? {};
  class MockImage {
    onload: Handler = null;
    onerror: Handler = null;
    width = width;
    height = height;
    set src(_value: string) {
      Promise.resolve().then(() => (fail ? this.onerror?.() : this.onload?.()));
    }
  }
  (global as unknown as { Image: unknown }).Image = MockImage;
}

describe("isImageFile", () => {
  it("accepts image files", () => {
    expect(isImageFile(new File(["x"], "a.png", { type: "image/png" }))).toBe(
      true
    );
    expect(isImageFile(new File(["x"], "a.jpg", { type: "image/jpeg" }))).toBe(
      true
    );
  });

  it("rejects non-image files", () => {
    expect(
      isImageFile(new File(["x"], "a.txt", { type: "text/plain" }))
    ).toBe(false);
    expect(
      isImageFile(new File(["x"], "a.pdf", { type: "application/pdf" }))
    ).toBe(false);
  });
});

describe("prepareImage", () => {
  let drawImage: jest.Mock;

  beforeEach(() => {
    (global as unknown as { FileReader: unknown }).FileReader = MockFileReader;
    installImageMock();
    drawImage = jest.fn();
    jest
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    jest
      .spyOn(HTMLCanvasElement.prototype, "toDataURL")
      .mockReturnValue("data:image/jpeg;base64,ZW5jb2RlZA=="); // "encoded"
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns a gateway-ready ImageBlock with the data URL prefix stripped", async () => {
    const result = await prepareImage(
      new File(["x"], "photo.png", { type: "image/png" })
    );

    expect(result.block).toEqual({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/jpeg",
        data: "ZW5jb2RlZA==",
      },
    });
    expect(result.previewUrl).toBe("data:image/jpeg;base64,ZW5jb2RlZA==");
    expect(result.name).toBe("photo.png");
  });

  it("keeps small images at their original size", async () => {
    installImageMock({ width: 800, height: 600 });
    await prepareImage(new File(["x"], "small.png", { type: "image/png" }));
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 800, 600);
  });

  it("downscales so the longest edge is capped at 1568px", async () => {
    installImageMock({ width: 3136, height: 1568 }); // 2x over the cap
    await prepareImage(new File(["x"], "big.jpg", { type: "image/jpeg" }));
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1568, 784);
  });

  it("decodes via a CSP-safe data URL, never a blob: object URL", async () => {
    const createObjectURL = jest.fn();
    (URL as unknown as { createObjectURL: unknown }).createObjectURL =
      createObjectURL;

    await prepareImage(new File(["x"], "photo.png", { type: "image/png" }));

    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("rejects when the image fails to decode", async () => {
    installImageMock({ fail: true });
    await expect(
      prepareImage(new File(["x"], "broken.png", { type: "image/png" }))
    ).rejects.toThrow("Failed to decode image file.");
  });
});
