import { formatDate, capitalize, debounce } from "@/utils";

describe("Utils", () => {
  describe("formatDate", () => {
    it("should format a date correctly", () => {
      // Use local date constructor to avoid timezone flakiness (UTC "2024-01-15" can become Jan 14 in some zones)
      const date = new Date(2024, 0, 15);
      const formatted = formatDate(date);
      expect(formatted).toBe("January 15, 2024");
    });

    it("should handle end-of-year date", () => {
      const date = new Date(2023, 11, 31);
      expect(formatDate(date)).toBe("December 31, 2023");
    });

    it("should use en-US long style", () => {
      const date = new Date(2025, 6, 4);
      expect(formatDate(date)).toMatch(/July 4, 2025/);
    });
  });

  describe("capitalize", () => {
    it("should capitalize the first letter", () => {
      expect(capitalize("hello")).toBe("Hello");
      expect(capitalize("world")).toBe("World");
    });

    it("should handle empty strings", () => {
      expect(capitalize("")).toBe("");
    });

    it("should leave single character uppercased", () => {
      expect(capitalize("a")).toBe("A");
    });

    it("should not change already capitalized string", () => {
      expect(capitalize("Hello")).toBe("Hello");
    });
  });

  describe("debounce", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should debounce function calls", () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("should pass through arguments on the last call", () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn("a", "b");
      debouncedFn("c", "d");
      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith("c", "d");
    });

    it("should reset timer on each call", () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn();
      jest.advanceTimersByTime(50);
      debouncedFn();
      jest.advanceTimersByTime(50);
      expect(mockFn).not.toHaveBeenCalled();
      jest.advanceTimersByTime(50);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
});
