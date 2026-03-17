const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(500).json({ error: 'SUPABASE_URL ou SUPABASE_KEY não configuradas' });
    }

    try {
        // POST: Save new order after payment
        if (req.method === 'POST') {
            const { transaction_id, customer_name, customer_phone, customer_email, customer_cpf, quantity, total_price } = req.body;

            if (!customer_name || !customer_phone || !quantity || !total_price) {
                return res.status(400).json({ error: 'Dados incompletos' });
            }

            // Generate unique codes for each title
            const codes = [];
            for (let i = 0; i < quantity; i++) {
                codes.push(generateCode());
            }
            const codesStr = codes.join(',');

            const orderData = {
                transaction_id: transaction_id || '',
                customer_name,
                customer_phone,
                quantity,
                total_price,
                payment_status: 'paid',
                codes: codesStr,
            };
            if (customer_email) orderData.customer_email = customer_email;
            if (customer_cpf) orderData.customer_cpf = customer_cpf;

            const data = await supabaseFetch('orders', {
                method: 'POST',
                body: JSON.stringify(orderData),
            });

            return res.status(200).json({
                success: true,
                orderId: data[0]?.id,
                codes,
            });
        }

        // GET: Get orders by phone number
        if (req.method === 'GET') {
            const { phone } = req.query;

            if (!phone) {
                return res.status(400).json({ error: 'Telefone obrigatório' });
            }

            // Clean phone - remove formatting, keep only digits
            const cleanPhone = phone.replace(/\D/g, '');

            const data = await supabaseFetch(
                `orders?select=id,transaction_id,customer_name,quantity,total_price,payment_status,codes,created_at&customer_phone=ilike.*${cleanPhone}*&order=created_at.desc`
            );

            return res.status(200).json({ orders: data });
        }

    } catch (error) {
        console.error('[Orders API] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
