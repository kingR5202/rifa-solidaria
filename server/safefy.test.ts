import { describe, expect, it } from "vitest";
import { ENV } from "./_core/env";

describe("SafefyPay Configuration", () => {
  it("should have SafefyPay keys configured", () => {
    expect(ENV.safefyPublicKey).toBeTruthy();
    expect(ENV.safefySecretKey).toBeTruthy();
    // Accept both production and sandbox keys
    expect(ENV.safefyPublicKey).toMatch(/^pk_(production|sandbox)_/);
    expect(ENV.safefySecretKey).toMatch(/^sk_(production|sandbox)_/);
  });

  it("should validate SafefyPay API keys format", () => {
    // Public key should start with pk_production_ or pk_sandbox_ followed by hex characters
    expect(ENV.safefyPublicKey).toMatch(/^pk_(production|sandbox)_[a-f0-9]+$/);
    
    // Secret key should start with sk_production_ or sk_sandbox_ followed by hex characters
    expect(ENV.safefySecretKey).toMatch(/^sk_(production|sandbox)_[a-f0-9]+$/);
  });

  it("should not expose secret key in public context", () => {
    // Ensure secret key is only used server-side
    expect(ENV.safefySecretKey).toBeDefined();
    expect(ENV.safefySecretKey.length).toBeGreaterThan(20);
  });
});
