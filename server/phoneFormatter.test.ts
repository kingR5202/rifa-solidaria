import { describe, expect, it } from "vitest";

// Replicar a lógica de formatação para testar
function formatPhone(value: string): string {
  // Remove non-digits
  let digits = value.replace(/\D/g, "");

  // Remove leading 55 if user typed it
  if (digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  // Limit to 11 digits (Brazilian phone format)
  const limitedDigits = digits.slice(0, 11);

  // Format as (XX) XXXXX-XXXX (without +55)
  if (limitedDigits.length === 0) {
    return "";
  } else if (limitedDigits.length <= 2) {
    return `(${limitedDigits}`;
  } else if (limitedDigits.length <= 7) {
    return `(${limitedDigits.slice(0, 2)}) ${limitedDigits.slice(2)}`;
  } else {
    return `(${limitedDigits.slice(0, 2)}) ${limitedDigits.slice(2, 7)}-${limitedDigits.slice(7, 11)}`;
  }
}

describe("Phone Formatter", () => {
  it("should format empty string", () => {
    expect(formatPhone("")).toBe("");
  });

  it("should format single digit", () => {
    expect(formatPhone("1")).toBe("(1");
  });

  it("should format two digits", () => {
    expect(formatPhone("11")).toBe("(11");
  });

  it("should format area code", () => {
    expect(formatPhone("119")).toBe("(11) 9");
  });

  it("should format partial number", () => {
    expect(formatPhone("11999999")).toBe("(11) 99999-9");
  });

  it("should format complete number", () => {
    expect(formatPhone("11999999999")).toBe("(11) 99999-9999");
  });

  it("should limit to 11 digits", () => {
    expect(formatPhone("119999999999999")).toBe("(11) 99999-9999");
  });

  it("should remove leading 55 if typed", () => {
    expect(formatPhone("5511999999999")).toBe("(11) 99999-9999");
  });

  it("should handle +55 prefix", () => {
    expect(formatPhone("+5511999999999")).toBe("(11) 99999-9999");
  });

  it("should handle spaces and special characters", () => {
    expect(formatPhone("(11) 99999-9999")).toBe("(11) 99999-9999");
  });

  it("should handle typing 55 in the middle", () => {
    expect(formatPhone("1155999999999")).toBe("(11) 55999-9999");
  });

  it("should not add 55 automatically", () => {
    const result = formatPhone("11999999999");
    expect(result).not.toContain("+55");
    expect(result).toBe("(11) 99999-9999");
  });
});
