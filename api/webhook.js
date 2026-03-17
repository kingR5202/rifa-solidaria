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
    } catch {
        return null;
    }
}

async function sendUtmifyEvent(orderId, status, createdAt, approvedDate, customer, quantity, totalPriceInCents) {
    const token = await getUtmifyToken();
    if (!token) return;

    const payload = {
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
    };

    try {
        await fetch('https://utmify-proxy.botecoconta84.workers.dev/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        console.log('[Webhook] Utmify event sent:', status);
    } catch (err) {
        console.error('[Webhook] Utmify error:', err.message);
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const body = req.body;
        console.log('[Webhook Safefy] Recebido:', JSON.stringify(body));

        const event = req.headers['x-safefy-event'] || '';
        const transactionData = body.data || body;
        const transactionId = transactionData.id || '';
        const externalId = transactionData.externalId || '';
        const status = transactionData.status || '';

        const isPaid = (event === 'payment.completed' || status === 'Completed');

        if (isPaid && (transactionId || externalId)) {
            console.log(`[Webhook] PAGAMENTO CONFIRMADO: ${transactionId} / ${externalId}`);

            const lookupId = transactionId || externalId;

            // 1. Find the pending transaction
            let transactions = [];
            try {
                transactions = await supabaseFetch(
                    `transactions?transaction_id=eq.${encodeURIComponent(lookupId)}&status=eq.pending`
                );
            } catch {
                // Try with externalId if transactionId didn't match
                if (externalId && externalId !== lookupId) {
                    transactions = await supabaseFetch(
                        `transactions?transaction_id=eq.${encodeURIComponent(externalId)}&status=eq.pending`
                    );
                }
            }

            if (transactions.length === 0) {
                console.log('[Webhook] No pending transaction found for:', lookupId);
                return res.status(200).json({ received: true, action: 'no_pending_transaction' });
            }

            const tx = transactions[0];

            // 2. Check if order already exists (avoid duplicates)
            const existingOrders = await supabaseFetch(
                `orders?transaction_id=eq.${encodeURIComponent(tx.transaction_id)}&select=id`
            );

            if (existingOrders.length > 0) {
                console.log('[Webhook] Order already exists for:', tx.transaction_id);
                // Still update transaction status
                await supabaseFetch(
                    `transactions?transaction_id=eq.${encodeURIComponent(tx.transaction_id)}`,
                    {
                        method: 'PATCH',
                        body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString() }),
                    }
                );
                return res.status(200).json({ received: true, action: 'already_processed' });
            }

            // 3. Generate codes and create order
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

            await supabaseFetch('orders', {
                method: 'POST',
                body: JSON.stringify(orderData),
            });
            console.log('[Webhook] Order created with codes:', codes.join(','));

            // 4. Update transaction status to paid
            await supabaseFetch(
                `transactions?transaction_id=eq.${encodeURIComponent(tx.transaction_id)}`,
                {
                    method: 'PATCH',
                    body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString() }),
                }
            );

            // 5. Send Utmify paid event
            const paidAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
            await sendUtmifyEvent(
                tx.transaction_id,
                'paid',
                tx.created_at || paidAt,
                paidAt,
                { name: tx.customer_name, phone: tx.customer_phone, email: tx.customer_email || '', cpf: tx.customer_cpf || '' },
                tx.quantity || 1,
                Math.round((parseFloat(tx.total_price) || 0) * 100)
            );

            console.log('[Webhook] Payment fully processed:', tx.transaction_id);
            return res.status(200).json({ received: true, action: 'order_created' });
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        console.error('[Webhook Safefy] Erro:', error);
        return res.status(200).json({ error: 'Erro interno', message: error.message });
    }
}
