const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'italiancar2024';

async function supabaseFetch(path, options = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        ...options,
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || JSON.stringify(data));
    return data;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // Check admin password
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${ADMIN_PASSWORD}`) {
        return res.status(401).json({ error: 'Não autorizado' });
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(500).json({ error: 'SUPABASE_URL ou SUPABASE_KEY não configuradas' });
    }

    try {
        if (req.method === 'GET') {
            // Get all orders
            const orders = await supabaseFetch(
                'orders?select=id,transaction_id,customer_name,customer_phone,customer_email,customer_cpf,quantity,total_price,payment_status,codes,created_at&order=created_at.desc'
            );

            // Calculate stats from results
            const stats = {
                total_orders: orders.length,
                total_titles: orders.reduce((sum, o) => sum + (o.quantity || 0), 0),
                total_revenue: orders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0),
                unique_customers: new Set(orders.map(o => o.customer_phone)).size,
            };

            return res.status(200).json({ orders, stats });
        }

        return res.status(405).json({ error: 'Método não permitido' });
    } catch (error) {
        console.error('[Admin API] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
