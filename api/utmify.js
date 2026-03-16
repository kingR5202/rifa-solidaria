const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

async function getUtmifyToken() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?select=utmify_token&limit=1`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
    });
    const data = await res.json();
    return data?.[0]?.utmify_token || null;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    try {
        const token = await getUtmifyToken();
        if (!token) {
            return res.status(400).json({ error: 'Token Utmify não configurado' });
        }

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
        } = req.body;

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
                    priceInCents: totalPriceInCents ? Math.round(totalPriceInCents / (quantity || 1)) : 0,
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

        const utmifyRes = await fetch("https://api.utmify.com.br/api-credentials/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-token": token,
            },
            body: JSON.stringify(payload),
        });

        const utmifyData = await utmifyRes.text();
        console.log("[Utmify API]", utmifyRes.status, utmifyData);

        if (!utmifyRes.ok) {
            return res.status(utmifyRes.status).json({ error: "Erro Utmify", details: utmifyData });
        }

        return res.status(200).json({ success: true, response: utmifyData });
    } catch (error) {
        console.error("[Utmify API] Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
