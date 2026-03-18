const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Simple rate limit for phone lookups
const phoneLookups = new Map();
const PHONE_RATE_LIMIT = 10; // max lookups per phone
const PHONE_RATE_WINDOW = 60 * 1000; // 1 minute

// Generate random 6-digit title code
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

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
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(500).json({ error: 'SUPABASE_URL ou SUPABASE_KEY não configuradas' });
    }

    try {
        // POST: Disabled - orders are created exclusively by the webhook
        if (req.method === 'POST') {
            return res.status(403).json({ error: 'Pedidos são criados automaticamente via webhook de pagamento' });
        }

        // GET: Get orders by phone number (public, rate-limited)
        if (req.method === 'GET') {
            const { phone } = req.query;

            if (!phone) {
                return res.status(400).json({ error: 'Telefone obrigatório' });
            }

            // Clean phone - remove formatting, keep only digits
            const cleanPhone = phone.replace(/\D/g, '');

            if (cleanPhone.length < 10 || cleanPhone.length > 11) {
                return res.status(400).json({ error: 'Telefone inválido' });
            }

            // Rate limit per phone
            const now = Date.now();
            const key = cleanPhone;
            const entry = phoneLookups.get(key);
            if (entry && now - entry.start < PHONE_RATE_WINDOW) {
                if (entry.count >= PHONE_RATE_LIMIT) {
                    return res.status(429).json({ error: 'Muitas consultas. Tente novamente em 1 minuto.' });
                }
                entry.count++;
            } else {
                phoneLookups.set(key, { count: 1, start: now });
            }

            const data = await supabaseFetch(
                `orders?select=id,customer_name,quantity,total_price,payment_status,codes,created_at&customer_phone=eq.${cleanPhone}&order=created_at.desc&limit=50`
            );

            return res.status(200).json({ orders: data });
        }

    } catch (error) {
        console.error('[Orders API] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
