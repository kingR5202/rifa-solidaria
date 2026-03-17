// Cloudflare Worker - Intercepta /api/utmify e envia para a API Utmify
//
// CONFIGURAÇÃO:
// 1. Acesse o Cloudflare Dashboard > Workers & Pages > Create Worker
// 2. Cole este código no editor
// 3. Vá em Settings > Variables and Secrets
// 4. Adicione as variáveis:
//    - SUPABASE_URL = sua URL do Supabase (ex: https://xxx.supabase.co)
//    - SUPABASE_KEY = sua chave do Supabase
// 5. O token Utmify será lido automaticamente do painel Admin (tabela settings)

async function getUtmifyToken(env) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/settings?select=utmify_token&limit=1`, {
    headers: {
      "apikey": env.SUPABASE_KEY,
      "Authorization": `Bearer ${env.SUPABASE_KEY}`,
    },
  });
  const data = await res.json();
  return data?.[0]?.utmify_token || null;
}

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Método não permitido" }, 405);
    }

    try {
      const token = await getUtmifyToken(env);
      if (!token) {
        return jsonResponse({ error: "Token Utmify não configurado. Acesse o Painel Admin > Rastreamento > Utmify e salve o token." }, 400);
      }

      const body = await request.json();
      const {
        orderId,
        status,
        createdAt,
        approvedDate,
        customer,
        quantity,
        totalPriceInCents,
        trackingParameters,
        isTest,
      } = body;

      const payload = {
        orderId,
        platform: "RifaSolidaria",
        paymentMethod: "pix",
        status,
        createdAt,
        approvedDate: approvedDate || null,
        refundedAt: null,
        customer: {
          name: customer?.name || "",
          email: customer?.email || "",
          phone: customer?.phone ? customer.phone.replace(/\D/g, "") : null,
          document: customer?.cpf ? customer.cpf.replace(/\D/g, "") : null,
          country: "BR",
        },
        products: [
          {
            id: "produto-principal",
            name: "Produto Principal",
            planId: null,
            planName: null,
            quantity: quantity || 1,
            priceInCents: totalPriceInCents
              ? Math.round(totalPriceInCents / (quantity || 1))
              : 0,
          },
        ],
        trackingParameters: {
          src: trackingParameters?.src || null,
          sck: trackingParameters?.sck || null,
          utm_source: trackingParameters?.utm_source || null,
          utm_campaign: trackingParameters?.utm_campaign || null,
          utm_medium: trackingParameters?.utm_medium || null,
          utm_content: trackingParameters?.utm_content || null,
          utm_term: trackingParameters?.utm_term || null,
        },
        commission: {
          totalPriceInCents: totalPriceInCents || 0,
          gatewayFeeInCents: 223,
          userCommissionInCents: (totalPriceInCents || 0) - 223,
        },
        isTest: isTest || false,
      };

      const utmifyRes = await fetch(
        "https://api.utmify.com.br/api-credentials/orders",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-token": token,
          },
          body: JSON.stringify(payload),
        }
      );

      const utmifyData = await utmifyRes.text();
      console.log("[Utmify Worker]", utmifyRes.status, utmifyData);

      if (!utmifyRes.ok) {
        return jsonResponse(
          { error: "Erro Utmify", status: utmifyRes.status, details: utmifyData },
          utmifyRes.status
        );
      }

      return jsonResponse({ success: true, response: utmifyData }, 200);
    } catch (error) {
      console.error("[Utmify Worker] Error:", error.message);
      return jsonResponse({ error: error.message }, 500);
    }
  },
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
