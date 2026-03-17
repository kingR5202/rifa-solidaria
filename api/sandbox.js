import { requireAdmin } from './_auth.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateTestTransactionId() {
    return `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

async function sendUtmifyEvent(orderId, status, createdAt, approvedDate, customer, quantity, totalPriceInCents, isTestMode = true) {
    const token = await getUtmifyToken();
    if (!token) return { error: 'UTMify token não configurado' };

    try {
        const response = await fetch('https://utmify-proxy.botecoconta84.workers.dev/', {
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
                isTest: isTestMode,
            }),
        });
        const data = await response.json();
        return { ok: response.ok, status: response.status, data };
    } catch (err) {
        return { error: err.message };
    }
}

// Handler for creating test payments
async function handleCreatePayment(req, res) {
    const { quantity, autoComplete } = req.body;
    const testQuantity = quantity || 1;
    const totalPrice = (testQuantity * 10).toFixed(2); // R$ 10 per title for testing

    // Create test transaction ID
    const transactionId = generateTestTransactionId();

    // Test customer data
    const testCustomer = {
        name: 'Cliente Teste Sandbox',
        phone: '11999999999',
        email: 'teste@sandbox.com',
        cpf: '111.111.111-11',
    };

    // Save test transaction as pending
    const txData = {
        transaction_id: transactionId,
        customer_name: testCustomer.name,
        customer_phone: testCustomer.phone,
        customer_email: testCustomer.email,
        customer_cpf: testCustomer.cpf,
        quantity: testQuantity,
        total_price: totalPrice,
        pix_code: 'TEST-PIX-CODE-00020126360014br.gov.bcb.pix',
        status: 'pending',
    };

    await supabaseFetch('transactions', {
        method: 'POST',
        body: JSON.stringify(txData),
    });

    // If autoComplete is true, simulate webhook completion immediately
    if (autoComplete) {
        // Simulate webhook internally
        const tx = await supabaseFetch(
            `transactions?transaction_id=eq.${encodeURIComponent(transactionId)}&select=*`
        );

        if (tx.length > 0) {
            // Generate codes and create order
            const codes = [];
            for (let i = 0; i < testQuantity; i++) {
                codes.push(generateCode());
            }

            const orderData = {
                transaction_id: transactionId,
                customer_name: testCustomer.name,
                customer_phone: testCustomer.phone,
                customer_email: testCustomer.email,
                customer_cpf: testCustomer.cpf,
                quantity: testQuantity,
                total_price: totalPrice,
                payment_status: 'paid',
                codes: codes.join(','),
            };

            await supabaseFetch('orders', {
                method: 'POST',
                body: JSON.stringify(orderData),
            });

            const paidAt = new Date().toISOString();
            await supabaseFetch(
                `transactions?transaction_id=eq.${encodeURIComponent(transactionId)}`,
                {
                    method: 'PATCH',
                    body: JSON.stringify({
                        status: 'paid',
                        paid_at: paidAt,
                    }),
                }
            );

            // Send to Utmify with isTest: true
            await sendUtmifyEvent(
                transactionId,
                'paid',
                paidAt.slice(0, 19).replace('T', ' '),
                paidAt.slice(0, 19).replace('T', ' '),
                testCustomer,
                testQuantity,
                Math.round(parseFloat(totalPrice) * 100),
                true
            );
        }

        return res.status(200).json({
            success: true,
            message: 'Pagamento de teste criado e completado automaticamente',
            transaction_id: transactionId,
            customer: testCustomer,
            quantity: testQuantity,
            total_price: totalPrice,
            status: 'completed',
        });
    }

    return res.status(200).json({
        success: true,
        message: 'Transação de teste criada (pendente)',
        transaction_id: transactionId,
        customer: testCustomer,
        quantity: testQuantity,
        total_price: totalPrice,
        status: 'pending',
    });
}

// Handler for simulating webhooks
async function handleSimulateWebhook(req, res) {
    const { transaction_id, isRealEvent = false } = req.body;

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

    // If isRealEvent=true, just resend to UTMify without creating order/updating status
    if (isRealEvent) {
        const paidAt = (tx.paid_at || new Date().toISOString()).slice(0, 19).replace('T', ' ');
        const utmifyResult = await sendUtmifyEvent(
            tx.transaction_id,
            'paid',
            tx.created_at || paidAt,
            paidAt,
            {
                name: tx.customer_name,
                phone: tx.customer_phone,
                email: tx.customer_email || '',
                cpf: tx.customer_cpf || '',
            },
            tx.quantity || 1,
            Math.round((parseFloat(tx.total_price) || 0) * 100),
            false // isTest = false => evento REAL para UTMify
        );

        return res.status(200).json({
            success: true,
            message: 'Pagamento disparado como REAL para UTMify (isTest: false)',
            transaction_id: tx.transaction_id,
            utmify_sent: true,
            utmify_mode: 'REAL (isTest: false)',
            utmify_result: utmifyResult,
        });
    }

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
    const isTestMode = !isRealEvent; // isRealEvent=true => isTest=false (evento real)
    const utmifyResult = await sendUtmifyEvent(
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
        Math.round((parseFloat(tx.total_price) || 0) * 100),
        isTestMode
    );

    return res.status(200).json({
        success: true,
        message: isRealEvent
            ? 'Pagamento disparado como REAL para UTMify (isTest: false)'
            : 'Webhook de teste processado com sucesso (isTest: true)',
        transaction_id: tx.transaction_id,
        codes,
        order_created: true,
        utmify_sent: true,
        utmify_mode: isRealEvent ? 'REAL (isTest: false)' : 'TESTE (isTest: true)',
        utmify_result: utmifyResult,
    });
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
            const { action } = req.body;

            // Route to appropriate handler based on action
            if (action === 'create' || (!action && (req.body.quantity !== undefined || req.body.autoComplete !== undefined))) {
                return await handleCreatePayment(req, res);
            } else if (action === 'webhook' || (!action && req.body.transaction_id)) {
                return await handleSimulateWebhook(req, res);
            }

            return res.status(400).json({ error: 'Ação inválida. Use action: "create" ou "webhook"' });
        }

        return res.status(405).json({ error: 'Método não permitido' });
    } catch (error) {
        console.error('[Sandbox API] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
