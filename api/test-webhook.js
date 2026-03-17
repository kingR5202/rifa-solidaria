import { requireAdmin } from './_auth.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

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

async function getUtmifyToken() {
    try {
        const data = await supabaseFetch('settings?select=utmify_token&limit=1');
        return data?.[0]?.utmify_token || null;
    } catch { return null; }
}

async function sendUtmifyEvent(orderId, status, createdAt, approvedDate, customer, quantity, totalPriceInCents) {
    const token = await getUtmifyToken();
    if (!token) return;

    await fetch('https://utmify-proxy.botecoconta84.workers.dev/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            orderId,
            platform: 'RifaSolidaria',
            paymentMethod: 'pix',
            status,
            createdAt,
            approvedDate: approvedDate || null,
            refundedAt: null,
            customer: {
                name: customer.name || '',
                email: customer.email || '',
                phone: customer.phone ? customer.phone.replace(/\D/g, '') : null,
                document: customer.cpf ? customer.cpf.replace(/\D/g, '') : null,
                country: 'BR',
            },
            products: [{
                id: 'produto-principal',
                name: 'Produto Principal',
                planId: null,
                planName: null,
                quantity: quantity || 1,
                priceInCents: totalPriceInCents ? Math.round(totalPriceInCents / (quantity || 1)) : 0,
            }],
            trackingParameters: {},
            commission: {
                totalPriceInCents: totalPriceInCents || 0,
                gatewayFeeInCents: 223,
                userCommissionInCents: (totalPriceInCents || 0) - 223,
            },
            isTest: true, // Mark as test in Utmify
        }),
    }).catch(() => {});
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // Require admin authentication
    const admin = requireAdmin(req);
    if (!admin) {
        return res.status(401).json({ error: 'Não autorizado' });
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(500).json({ error: 'SUPABASE_URL ou SUPABASE_KEY não configuradas' });
    }

    try {
        if (req.method === 'POST') {
            const { transaction_id } = req.body;

            if (!transaction_id) {
                return res.status(400).json({ error: 'transaction_id obrigatório' });
            }

            // Get transaction from database
            const transactions = await supabaseFetch(
                `transactions?transaction_id=eq.${encodeURIComponent(transaction_id)}&select=*`
            );

            if (transactions.length === 0) {
                return res.status(404).json({ error: 'Transação não encontrada' });
            }

            const tx = transactions[0];

            // Check if transaction is already paid
            if (tx.status === 'paid') {
                return res.status(400).json({ error: 'Transação já foi paga' });
            }

            // Check if order already exists
            const existingOrders = await supabaseFetch(
                `orders?transaction_id=eq.${encodeURIComponent(transaction_id)}&select=id`
            );

            if (existingOrders.length > 0) {
                return res.status(400).json({ error: 'Pedido já existe para esta transação' });
            }

            // Generate codes
            const codes = [];
            for (let i = 0; i < (tx.quantity || 1); i++) {
                codes.push(generateCode());
            }

            // Create order
            const orderData = {
                transaction_id: tx.transaction_id,
                customer_name: tx.customer_name,
                customer_phone: tx.customer_phone,
                quantity: tx.quantity || 1,
                total_price: tx.total_price,
                payment_status: 'paid',
                codes: codes.join(','),
            };
            if (tx.customer_email) orderData.customer_email = tx.customer_email;
            if (tx.customer_cpf) orderData.customer_cpf = tx.customer_cpf;

            await supabaseFetch('orders', {
                method: 'POST',
                body: JSON.stringify(orderData),
            });

            // Update transaction status
            const paidAt = new Date().toISOString();
            await supabaseFetch(
                `transactions?transaction_id=eq.${encodeURIComponent(transaction_id)}`,
                {
                    method: 'PATCH',
                    body: JSON.stringify({
                        status: 'paid',
                        paid_at: paidAt,
                    }),
                }
            );

            // Send to Utmify
            await sendUtmifyEvent(
                tx.transaction_id,
                'paid',
                tx.created_at || paidAt.slice(0, 19).replace('T', ' '),
                paidAt.slice(0, 19).replace('T', ' '),
                {
                    name: tx.customer_name,
                    phone: tx.customer_phone,
                    email: tx.customer_email || '',
                    cpf: tx.customer_cpf || '',
                },
                tx.quantity || 1,
                Math.round((parseFloat(tx.total_price) || 0) * 100)
            );

            return res.status(200).json({
                success: true,
                message: 'Webhook de teste processado com sucesso',
                transaction_id: tx.transaction_id,
                codes,
                order_created: true,
                utmify_sent: true,
            });
        }

        return res.status(405).json({ error: 'Método não permitido' });
    } catch (error) {
        console.error('[Test Webhook API] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
