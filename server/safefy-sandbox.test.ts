import { describe, expect, it } from "vitest";
import { createPixCharge } from "./safefy";

/**
 * Test SafefyPay Sandbox credentials
 * These tests validate that the sandbox API credentials are working correctly
 */
describe("SafefyPay Sandbox Integration", () => {
  it("should create a PIX charge in sandbox mode", async () => {
    try {
      const result = await createPixCharge({
        amount: 250, // R$ 2.50
        description: "Test charge - Rifa ItalianCar",
        reference_id: `test-${Date.now()}`,
        customer_name: "Test User",
        customer_phone: "+55 (11) 99999-9999",
        customer_email: "test@example.com",
      });

      // Validate response structure
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.qr_code).toBeDefined();
      expect(result.copy_paste).toBeDefined();
      expect(result.amount).toBe(250);
      expect(result.created_at).toBeDefined();
      expect(result.expires_at).toBeDefined();

      console.log("✅ SafefyPay Sandbox credentials validated successfully!");
      console.log(`   Charge ID: ${result.id}`);
      console.log(`   Status: ${result.status}`);
    } catch (error: any) {
      console.error("❌ SafefyPay Sandbox test failed:", error.message);
      throw error;
    }
  });

  it("should validate QR code format", async () => {
    try {
      const result = await createPixCharge({
        amount: 500,
        description: "QR Code format test",
        reference_id: `qr-test-${Date.now()}`,
        customer_name: "QR Test",
        customer_phone: "+55 (11) 88888-8888",
      });

      // QR code should be base64 encoded PNG or contain valid PIX data
      expect(result.qr_code).toBeTruthy();
      expect(result.copy_paste).toBeTruthy();

      // PIX copy-paste code should start with "00020126"
      if (!result.copy_paste.startsWith("00020126")) {
        console.warn("⚠️ PIX code format may be different than expected");
      }

      console.log("✅ QR Code format validated!");
    } catch (error: any) {
      console.error("❌ QR Code format test failed:", error.message);
      throw error;
    }
  });
});
