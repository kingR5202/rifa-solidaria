import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";

// Mock the SafefyPay module
vi.mock("./safefy", () => ({
  createPixCharge: vi.fn().mockResolvedValue({
    id: "test-charge-123",
    status: "pending",
    qr_code: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    qr_code_url: "https://example.com/qr.png",
    copy_paste: "00020126580014br.gov.bcb.pix0136test",
    amount: 250,
    description: "Test charge",
    reference_id: "order-1",
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3600000).toISOString(),
  }),
}));

// Mock the database module
vi.mock("./db", () => ({
  createOrder: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateOrder: vi.fn().mockResolvedValue({ success: true }),
  getOrderById: vi.fn().mockResolvedValue({
    id: 1,
    customerName: "Test User",
    customerPhone: "+55 (99) 99999-9999",
    quantity: 2,
    totalPrice: "5.00",
    paymentStatus: "pending",
    transactionId: "test-charge-123",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
}));

// Mock the notification module
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

describe("Rifa Router", () => {
  it("should create a payment successfully", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.rifa.createPayment({
      name: "Test User",
      phone: "+55 (99) 99999-9999",
      quantity: 2,
      totalPrice: 5.0,
    });

    expect(result.success).toBe(true);
    expect(result.orderId).toBeDefined();
    expect(result.pixQrCode).toBeDefined();
    expect(result.pixCopyPaste).toBeDefined();
    expect(result.expiresAt).toBeDefined();
  });

  it("should validate name input", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    try {
      await caller.rifa.createPayment({
        name: "AB", // Too short
        phone: "+55 (99) 99999-9999",
        quantity: 2,
        totalPrice: 5.0,
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toContain("Nome deve ter");
    }
  });

  it("should validate phone input", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    try {
      await caller.rifa.createPayment({
        name: "Test User",
        phone: "123", // Too short
        quantity: 2,
        totalPrice: 5.0,
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toContain("Telefone");
    }
  });

  it("should validate quantity input", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    try {
      await caller.rifa.createPayment({
        name: "Test User",
        phone: "+55 (99) 99999-9999",
        quantity: 0, // Invalid
        totalPrice: 5.0,
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toContain("Quantidade");
    }
  });

  it("should get payment status", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.rifa.getPaymentStatus({
      orderId: 1,
    });

    expect(result.orderId).toBe(1);
    expect(result.status).toBe("pending");
    expect(result.quantity).toBe(2);
    expect(result.totalPrice).toBeDefined();
  });
});
