const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
            return res.status(200).json(data[0]);
        }

        // PATCH: Update settings
        if (req.method === 'PATCH') {
            const body = req.body;

            // Check if settings row exists
            const existing = await supabaseFetch('settings?select=id&limit=1');

            if (existing.length === 0) {
                // Create first settings row
                const data = await supabaseFetch('settings', {
                    method: 'POST',
                    body: JSON.stringify(body),
                });
                return res.status(200).json({ success: true, settings: data[0] });
            }

            // Update existing
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
