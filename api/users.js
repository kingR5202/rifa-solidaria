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
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(500).json({ error: 'SUPABASE_URL ou SUPABASE_KEY não configuradas' });
    }

    try {
        // POST: Save/update user on checkout or login
        if (req.method === 'POST') {
            const { phone, name } = req.body;

            if (!phone) {
                return res.status(400).json({ error: 'Telefone obrigatório' });
            }

            // Check if user already exists
            const existing = await supabaseFetch(
                `users?phone=eq.${encodeURIComponent(phone)}`
            );

            if (existing.length > 0) {
                // Update last_login and name if provided
                const updateData = { last_login: new Date().toISOString() };
                if (name) updateData.name = name;

                await supabaseFetch(
                    `users?phone=eq.${encodeURIComponent(phone)}`,
                    {
                        method: 'PATCH',
                        body: JSON.stringify(updateData),
                    }
                );
                return res.status(200).json({ success: true, user: existing[0], isNew: false });
            }

            // Create new user
            const data = await supabaseFetch('users', {
                method: 'POST',
                body: JSON.stringify({
                    phone,
                    name: name || '',
                    last_login: new Date().toISOString(),
                }),
            });

            return res.status(200).json({ success: true, user: data[0], isNew: true });
        }

        // GET: Get all users (for admin)
        if (req.method === 'GET') {
            const data = await supabaseFetch(
                'users?select=*&order=created_at.desc'
            );
            return res.status(200).json({ users: data });
        }

        // DELETE: Delete user by id
        if (req.method === 'DELETE') {
            const { id } = req.query;
            if (!id) {
                return res.status(400).json({ error: 'ID obrigatório' });
            }

            await supabaseFetch(`users?id=eq.${id}`, {
                method: 'DELETE',
            });

            return res.status(200).json({ success: true });
        }

    } catch (error) {
        console.error('[Users API] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
