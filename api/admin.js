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

async function getSafefyToken() {
    const { SAFEFY_PUBLIC_KEY, SAFEFY_SECRET_KEY } = process.env;
    if (!SAFEFY_PUBLIC_KEY || !SAFEFY_SECRET_KEY) throw new Error('Credenciais Safefy ausentes');

    const authResponse = await fetch('https://api-payment.safefypay.com.br/v1/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantType: 'client_credentials', publicKey: SAFEFY_PUBLIC_KEY, secretKey: SAFEFY_SECRET_KEY }),
    });
    const authData = await authResponse.json();
    if (!authResponse.ok || !authData.data?.accessToken) throw new Error('Autenticação Safefy falhou');
    return authData.data.accessToken;
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
            isTest: false,
        }),
    }).catch(() => {});
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
        // GET: Return dashboard data
        if (req.method === 'GET') {
            const orders = await supabaseFetch(
                'orders?select=id,transaction_id,customer_name,customer_phone,customer_email,customer_cpf,quantity,total_price,payment_status,codes,created_at&order=created_at.desc'
            );

            const stats = {
                total_orders: orders.length,
                total_titles: orders.reduce((sum, o) => sum + (o.quantity || 0), 0),
                total_revenue: orders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0),
                unique_customers: new Set(orders.map(o => o.customer_phone)).size,
            };

            return res.status(200).json({ orders, stats });
        }

        // POST: Reprocess pending payments
        if (req.method === 'POST') {
            // Get all pending transactions
            const pendingTxs = await supabaseFetch('transactions?status=eq.pending&order=created_at.asc');

            if (pendingTxs.length === 0) {
                return res.status(200).json({ success: true, processed: 0, total_pending: 0, results: [], message: 'Nenhuma transação pendente' });
            }

            const safefyToken = await getSafefyToken();
            const results = [];
            let processed = 0;

            for (const tx of pendingTxs) {
                try {
                    // Check status on Safefy
                    const safefyRes = await fetch(
                        `https://api-payment.safefypay.com.br/v1/transactions/${encodeURIComponent(tx.transaction_id)}`,
                        { headers: { 'Authorization': `Bearer ${safefyToken}`, 'Accept': 'application/json' } }
                    );

                    if (!safefyRes.ok) {
                        results.push({ id: tx.transaction_id, result: 'api_error' });
                        continue;
                    }

                    const safefyData = await safefyRes.json();
                    const safefyStatus = safefyData.data?.status || '';
                    const isPaid = safefyStatus === 'Completed';

                    if (!isPaid) {
                        results.push({ id: tx.transaction_id, result: 'still_pending', safefy_status: safefyStatus });
                        continue;
                    }

                    // Check if order already exists
                    const existingOrders = await supabaseFetch(
                        `orders?transaction_id=eq.${encodeURIComponent(tx.transaction_id)}&select=id`
                    );

                    if (existingOrders.length > 0) {
                        // Just update transaction status
                        await supabaseFetch(`transactions?transaction_id=eq.${encodeURIComponent(tx.transaction_id)}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString() }),
                        });
                        results.push({ id: tx.transaction_id, result: 'already_has_order' });
                        continue;
                    }

                    // Generate codes and create order
                    const codes = [];
                    for (let i = 0; i < (tx.quantity || 1); i++) {
                        codes.push(generateCode());
                    }

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

                    await supabaseFetch('orders', { method: 'POST', body: JSON.stringify(orderData) });

                    // Update transaction
                    await supabaseFetch(`transactions?transaction_id=eq.${encodeURIComponent(tx.transaction_id)}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString() }),
                    });

                    // Send Utmify
                    const paidAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
                    await sendUtmifyEvent(
                        tx.transaction_id, 'paid',
                        tx.created_at || paidAt, paidAt,
                        { name: tx.customer_name, phone: tx.customer_phone, email: tx.customer_email || '', cpf: tx.customer_cpf || '' },
                        tx.quantity || 1,
                        Math.round((parseFloat(tx.total_price) || 0) * 100)
                    );

                    results.push({ id: tx.transaction_id, result: 'order_created', codes: codes.join(','), customer: tx.customer_name });
                    processed++;

                } catch (err) {
                    results.push({ id: tx.transaction_id, result: 'error', message: err.message });
                }
            }

            return res.status(200).json({
                success: true,
                total_pending: pendingTxs.length,
                processed,
                results,
            });
        }

        return res.status(405).json({ error: 'Método não permitido' });
    } catch (error) {
        console.error('[Admin API] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
