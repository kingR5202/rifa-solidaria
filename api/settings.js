import { requireAdmin } from './_auth.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Fields safe to return publicly (no API keys/tokens)
const PUBLIC_FIELDS = ['checkout_fields', 'ticket_price', 'instagram_url', 'meta_pixel_id', 'clarity_id', 'meta_domain_verification'];

async function supabaseFetch(path, options = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        ...options,
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': options.prefer || 'return=representation',
            ...options.headers,
        },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || JSON.stringify(data));
    return data;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(500).json({ error: 'SUPABASE_URL ou SUPABASE_KEY não configuradas' });
    }

    try {
        // POST: Proxy Utmify event (frontend sends here, backend adds token and forwards)
        if (req.method === 'POST') {
            const data = await supabaseFetch('settings?select=utmify_token&limit=1');
            const utmifyToken = data?.[0]?.utmify_token;
            if (!utmifyToken) {
                return res.status(400).json({ error: 'Token Utmify não configurado' });
            }

            const body = req.body;
            const payload = {
                orderId: body.orderId,
                platform: 'RifaSolidaria',
                paymentMethod: 'pix',
                status: body.status,
                createdAt: body.createdAt,
                approvedDate: body.approvedDate || null,
                refundedAt: null,
                customer: {
                    name: body.customer?.name || '',
                    email: body.customer?.email || '',
                    phone: body.customer?.phone ? body.customer.phone.replace(/\D/g, '') : null,
                    document: body.customer?.cpf ? body.customer.cpf.replace(/\D/g, '') : null,
                    country: 'BR',
                },
                products: [{
                    id: 'produto-principal',
                    name: 'Produto Principal',
                    planId: null,
                    planName: null,
                    quantity: body.quantity || 1,
                    priceInCents: body.totalPriceInCents ? Math.round(body.totalPriceInCents / (body.quantity || 1)) : 0,
                }],
                trackingParameters: {
                    src: body.trackingParameters?.src || null,
                    sck: body.trackingParameters?.sck || null,
                    utm_source: body.trackingParameters?.utm_source || null,
                    utm_campaign: body.trackingParameters?.utm_campaign || null,
                    utm_medium: body.trackingParameters?.utm_medium || null,
                    utm_content: body.trackingParameters?.utm_content || null,
                    utm_term: body.trackingParameters?.utm_term || null,
                },
                commission: {
                    totalPriceInCents: body.totalPriceInCents || 0,
                    gatewayFeeInCents: 223,
                    userCommissionInCents: (body.totalPriceInCents || 0) - 223,
                },
                isTest: body.isTest || false,
            };

            const utmifyRes = await fetch('https://api.utmify.com.br/api-credentials/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-token': utmifyToken,
                },
                body: JSON.stringify(payload),
            });

            const utmifyData = await utmifyRes.text();
            if (!utmifyRes.ok) {
                return res.status(utmifyRes.status).json({ error: 'Erro Utmify', details: utmifyData });
            }
            return res.status(200).json({ success: true, response: utmifyData });
        }

        // GET: Get settings
        if (req.method === 'GET') {
            const data = await supabaseFetch('settings?select=*&limit=1');
            if (data.length === 0) {
                return res.status(200).json({ instagram_url: 'https://instagram.com/italiancarautomotiva' });
            }

            const settings = data[0];

            // If admin is authenticated, return all settings
            const admin = requireAdmin(req);
            if (admin) {
                return res.status(200).json(settings);
            }

            // Public: only return safe fields
            const publicSettings = {};
            for (const field of PUBLIC_FIELDS) {
                if (settings[field] !== undefined) {
                    publicSettings[field] = settings[field];
                }
            }
            return res.status(200).json(publicSettings);
        }

        // PATCH: Update settings - REQUIRES ADMIN
        if (req.method === 'PATCH') {
            const admin = requireAdmin(req);
            if (!admin) {
                return res.status(401).json({ error: 'Não autorizado' });
            }

            const body = req.body;

            const existing = await supabaseFetch('settings?select=id&limit=1');

            if (existing.length === 0) {
                const data = await supabaseFetch('settings', {
                    method: 'POST',
                    body: JSON.stringify(body),
                });
                return res.status(200).json({ success: true, settings: data[0] });
            }

            await supabaseFetch(`settings?id=eq.${existing[0].id}`, {
                method: 'PATCH',
                body: JSON.stringify(body),
            });
            return res.status(200).json({ success: true });
        }

    } catch (error) {
        console.error('[Settings API] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
