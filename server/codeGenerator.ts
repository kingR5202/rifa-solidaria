/**
 * Code generator for rifa tickets
 * Generates 8-character codes with letters and numbers
 */

const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Generate a random 8-character code with letters and numbers
 * Format: XXXXXXXX (e.g., ABC12345)
 */
export function generateCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length));
  }
  return code;
}

/**
 * Generate multiple unique codes
 */
export function generateMultipleCodes(quantity: number): string[] {
  const codes: string[] = [];
  const usedCodes = new Set<string>();

  while (codes.length < quantity) {
    const code = generateCode();
    if (!usedCodes.has(code)) {
      codes.push(code);
      usedCodes.add(code);
    }
  }

  return codes;
}
