import { describe, expect, it } from "vitest";
import { generateCode, generateMultipleCodes } from "./codeGenerator";

describe("Code Generator", () => {
  it("should generate a valid 8-character code", () => {
    const code = generateCode();
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[A-Z0-9]{8}$/);
  });

  it("should generate unique codes", () => {
    const codes = new Set();
    for (let i = 0; i < 100; i++) {
      codes.add(generateCode());
    }
    // Should have at least 95 unique codes out of 100 (very unlikely to have duplicates)
    expect(codes.size).toBeGreaterThan(90);
  });

  it("should generate multiple unique codes", () => {
    const codes = generateMultipleCodes(10);
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10); // All should be unique
    codes.forEach((code) => {
      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[A-Z0-9]{8}$/);
    });
  });

  it("should generate codes with mix of letters and numbers", () => {
    let hasLetters = false;
    let hasNumbers = false;

    for (let i = 0; i < 100; i++) {
      const code = generateCode();
      if (/[A-Z]/.test(code)) hasLetters = true;
      if (/[0-9]/.test(code)) hasNumbers = true;
      if (hasLetters && hasNumbers) break;
    }

    expect(hasLetters).toBe(true);
    expect(hasNumbers).toBe(true);
  });
});
