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
    res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(500).json({ error: 'SUPABASE_URL ou SUPABASE_KEY não configuradas' });
    }

    try {
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
