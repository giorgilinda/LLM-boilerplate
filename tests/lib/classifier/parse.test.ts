import { parseJsonFromModelText } from "@/lib/classifier/parse";

describe("parseJsonFromModelText", () => {
  it("parses plain JSON", () => {
    expect(parseJsonFromModelText('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown fences", () => {
    expect(parseJsonFromModelText('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("returns null for invalid JSON", () => {
    expect(parseJsonFromModelText("not json")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(parseJsonFromModelText("   ")).toBeNull();
  });
});
