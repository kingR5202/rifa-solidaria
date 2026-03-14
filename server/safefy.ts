import { ENV } from "./_core/env";
import QRCode from "qrcode";

/**
 * SafefyPay API client for generating PIX QR Codes
 * Supports offline mode for development/testing
 */

interface SafefyPayChargeRequest {
  amount: number; // Amount in cents (e.g., 250 for R$ 2.50)
  description: string;
  reference_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
}

interface SafefyPayChargeResponse {
  id: string;
  status: string;
  qr_code: string;
  copy_paste: string;
  amount: number;
  description: string;
  reference_id: string;
  created_at: string;
  expires_at: string;
}

// JWT Token cache
let cachedToken: string | null = null;
let cachedTokenExpiry: number = 0;

/**
 * Generate a valid CPF for anonymous transactions
 */
function generateCPF(): string {
  const rnd = (n: number) => Math.round(Math.random() * n);
  const mod = (dividend: number, divisor: number) =>
    Math.round(dividend - Math.floor(dividend / divisor) * divisor);

  const n = Array(9)
    .fill(0)
    .map(() => rnd(9));
  let d1 = n.reduce((total, num, i) => total + num * (10 - i), 0);
  d1 = 11 - mod(d1, 11);
  if (d1 >= 10) d1 = 0;

  let d2 = n.reduce((total, num, i) => total + num * (11 - i), 0) + d1 * 2;
  d2 = 11 - mod(d2, 11);
  if (d2 >= 10) d2 = 0;

  return [...n, d1, d2].join("");
}

/**
 * Generate mock PIX copy-paste code for offline mode
 */
function generateMockPixCode(reference_id: string): string {
  // Mock PIX code format (simplified for testing)
  const timestamp = Date.now().toString().slice(-6);
  return `00020126580014br.gov.bcb.pix0136${reference_id.padEnd(36, "0")}5204000053039865802BR5913ITALIANCAR6009BRASILIA62410503${timestamp}63041D3D`;
}

/**
 * Generate QR Code as base64 PNG image
 */
async function generateQRCodeImage(text: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: "H" as const,
      margin: 1,
      width: 300,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
    // Extract base64 from data URL
    const base64 = (qrCodeDataUrl as string).split(",")[1] || "";
    return base64;
  } catch (error) {
    console.error("Failed to generate QR code image:", error);
    throw error;
  }
}

/**
 * Get SafefyPay JWT token with caching
 */
async function getSafefyToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < cachedTokenExpiry) {
    return cachedToken;
  }

  if (!ENV.safefyPublicKey || !ENV.safefySecretKey) {
    throw new Error("SafefyPay credentials not configured");
  }

  try {
    const response = await fetch("https://api-payment.safefypay.com.br/v1/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grantType: "client_credentials",
        publicKey: ENV.safefyPublicKey,
        secretKey: ENV.safefySecretKey,
      }),
    });

    const authData = await response.json();

    if (!response.ok || !authData.data?.accessToken) {
      console.error("SafefyPay auth error:", authData);
      throw new Error("SafefyPay authentication failed");
    }

    cachedToken = authData.data.accessToken as string;
    const expiresIn = authData.data.expiresIn || 3600;
    // Cache with 5 minute margin
    cachedTokenExpiry = Date.now() + (expiresIn - 300) * 1000;

    console.log("[SafefyPay] Token obtained successfully");
    return cachedToken;
  } catch (error) {
    console.error("Failed to get SafefyPay token:", error);
    throw error;
  }
}

export async function createPixCharge(
  data: SafefyPayChargeRequest
): Promise<SafefyPayChargeResponse> {
  try {
    // Offline mode - return mock data (auto-enable if keys not configured)
    if (ENV.safefyOfflineMode || !ENV.safefyPublicKey || !ENV.safefySecretKey) {
      console.log("[SafefyPay] Offline mode enabled - returning mock PIX charge");
      const mockId = `test_${data.reference_id}_${Date.now()}`;
      const pixCode = generateMockPixCode(mockId);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      
      // Generate QR code image
      const qrCodeImage = await generateQRCodeImage(pixCode);

      return {
        id: mockId,
        status: "pending",
        qr_code: qrCodeImage,
        copy_paste: pixCode,
        amount: data.amount,
        description: data.description,
        reference_id: data.reference_id,
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      };
    }

    // Production mode - use real SafefyPay API
    const token = await getSafefyToken();

    const externalId = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const customerPhone = data.customer_phone.replace(/\D/g, "");

    const payload = {
      method: "Pix",
      amount: data.amount,
      currency: "BRL",
      externalId: externalId,
      description: data.description,
      pixExpirationMinutes: 10,
      customerName: data.customer_name,
      customerDocument: generateCPF(),
      customerEmail: data.customer_email || `${customerPhone}@italiancar.com`,
    };

    console.log("[SafefyPay] Creating charge:", {
      externalId,
      amount: data.amount,
      customerName: data.customer_name,
    });

    const response = await fetch("https://api-payment.safefypay.com.br/v1/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("SafefyPay API error:", responseData);
      throw new Error(`SafefyPay error: ${responseData.error?.message || response.statusText}`);
    }

    const transactionData = responseData.data || {};
    const transactionId: string = transactionData.id || externalId;
    const pixCode: string = transactionData.pix?.copyAndPaste || "";

    console.log("[SafefyPay] Charge created successfully:", {
      transactionId,
      externalId,
    });

    // Calculate expiration time (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    return {
      id: transactionId,
      status: "pending",
      qr_code: pixCode,
      copy_paste: pixCode,
      amount: data.amount,
      description: data.description,
      reference_id: data.reference_id,
      created_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    };
  } catch (error) {
    console.error("Payment creation error:", error);
    throw error;
  }
}

/**
 * Get charge status from SafefyPay
 */
export async function getChargeStatus(chargeId: string): Promise<SafefyPayChargeResponse> {
  try {
    // Offline mode
    if (ENV.safefyOfflineMode) {
      console.log("[SafefyPay] Offline mode - returning mock charge status");
      return {
        id: chargeId,
        status: "pending",
        qr_code: generateMockPixCode(chargeId),
        copy_paste: generateMockPixCode(chargeId),
        amount: 250,
        description: "Test charge",
        reference_id: "test",
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };
    }

    // Production mode
    const token = await getSafefyToken();

    const response = await fetch(
      `https://api-payment.safefypay.com.br/v1/transactions/${encodeURIComponent(chargeId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`SafefyPay API error: ${response.statusText}`);
    }

    const data = await response.json();
    const transactionData = data.data || {};
    const status = transactionData.status || "Pending";

    return {
      id: chargeId,
      status: status.toLowerCase(),
      qr_code: transactionData.pix?.copyAndPaste || "",
      copy_paste: transactionData.pix?.copyAndPaste || "",
      amount: transactionData.amount || 0,
      description: transactionData.description || "",
      reference_id: transactionData.externalId || "",
      created_at: transactionData.createdAt || new Date().toISOString(),
      expires_at: transactionData.expiresAt || new Date().toISOString(),
    };
  } catch (error) {
    console.error("Failed to get charge status:", error);
    throw error;
  }
}
