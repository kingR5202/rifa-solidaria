import { requireAdmin } from './_auth.js';

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
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(500).json({ error: 'SUPABASE_URL ou SUPABASE_KEY não configuradas' });
    }

    try {
        // POST: Save new PIX transaction (PUBLIC - called during checkout)
        if (req.method === 'POST') {
            const { transaction_id, customer_name, customer_phone, customer_email, customer_cpf, quantity, total_price, pix_code } = req.body;

            if (!transaction_id || !customer_name || !customer_phone) {
                return res.status(400).json({ error: 'Dados incompletos' });
            }

            const txData = {
                transaction_id,
                customer_name,
                customer_phone,
                quantity,
                total_price,
                pix_code: pix_code || '',
                status: 'pending',
            };
            if (customer_email) txData.customer_email = customer_email;
            if (customer_cpf) txData.customer_cpf = customer_cpf;

            const data = await supabaseFetch('transactions', {
                method: 'POST',
                body: JSON.stringify(txData),
            });

            return res.status(200).json({ success: true, id: data[0]?.id });
        }

        // PATCH: Update transaction status (PUBLIC - called when payment confirmed)
        if (req.method === 'PATCH') {
            const { transaction_id, status } = req.body;

            if (!transaction_id || !status) {
                return res.status(400).json({ error: 'Dados incompletos' });
            }

            await supabaseFetch(
                `transactions?transaction_id=eq.${encodeURIComponent(transaction_id)}`,
                {
                    method: 'PATCH',
                    body: JSON.stringify({
                        status,
                        paid_at: status === 'paid' ? new Date().toISOString() : null,
                    }),
                }
            );

            return res.status(200).json({ success: true });
        }

        // GET: Get all transactions - REQUIRES ADMIN
        if (req.method === 'GET') {
            const admin = requireAdmin(req);
            if (!admin) {
                return res.status(401).json({ error: 'Não autorizado' });
            }

            const data = await supabaseFetch(
                'transactions?select=*&order=created_at.desc'
            );
            return res.status(200).json({ transactions: data });
        }

        // DELETE: Delete transaction by id - REQUIRES ADMIN
        if (req.method === 'DELETE') {
            const admin = requireAdmin(req);
            if (!admin) {
                return res.status(401).json({ error: 'Não autorizado' });
            }

            const { id } = req.query;
            if (!id) {
                return res.status(400).json({ error: 'ID obrigatório' });
            }
            await supabaseFetch(`transactions?id=eq.${id}`, { method: 'DELETE' });
            return res.status(200).json({ success: true });
        }

    } catch (error) {
        console.error('[Transactions API] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
