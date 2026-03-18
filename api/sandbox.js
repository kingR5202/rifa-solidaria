import { requireAdmin } from './_auth.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Sandbox credentials (separate from production)
const SANDBOX_PUBLIC_KEY = process.env.SAFEFY_SANDBOX_PUBLIC_KEY;
const SANDBOX_SECRET_KEY = process.env.SAFEFY_SANDBOX_SECRET_KEY;

const SAFEFY_API_URL = 'https://api-payment.safefypay.com.br';

function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateCPF() {
    const rnd = (n) => Math.round(Math.random() * n);
    const mod = (dividend, divisor) => Math.round(dividend - (Math.floor(dividend / divisor) * divisor));
    const n = Array(9).fill(0).map(() => rnd(9));
    let d1 = n.reduce((total, num, i) => total + (num * (10 - i)), 0);
    d1 = 11 - mod(d1, 11);
    if (d1 >= 10) d1 = 0;
    let d2 = n.reduce((total, num, i) => total + (num * (11 - i)), 0) + (d1 * 2);
    d2 = 11 - mod(d2, 11);
    if (d2 >= 10) d2 = 0;
    return [...n, d1, d2].join('');
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

// Cache sandbox token
let sandboxToken = null;
let sandboxTokenExpiry = 0;

async function getSandboxToken() {
    if (sandboxToken && Date.now() < sandboxTokenExpiry) {
        return sandboxToken;
    }

    if (!SANDBOX_PUBLIC_KEY || !SANDBOX_SECRET_KEY) {
        throw new Error('Credenciais Safefy Sandbox não configuradas. Defina SAFEFY_SANDBOX_PUBLIC_KEY e SAFEFY_SANDBOX_SECRET_KEY.');
    }

    const response = await fetch(`${SAFEFY_API_URL}/v1/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grantType: 'client_credentials',
            publicKey: SANDBOX_PUBLIC_KEY,
            secretKey: SANDBOX_SECRET_KEY,
        }),
    });

    const data = await response.json();
    if (!response.ok || !data.data?.accessToken) {
        console.error('[Sandbox] Auth error:', data);
        throw new Error('Autenticação Safefy Sandbox falhou');
    }

    sandboxToken = data.data.accessToken;
    const expiresIn = data.data.expiresIn || 3600;
    sandboxTokenExpiry = Date.now() + ((expiresIn - 300) * 1000);

    console.log('[Sandbox] Token sandbox obtido com sucesso');
    return sandboxToken;
}

async function getUtmifyToken() {
    try {
        const data = await supabaseFetch('settings?select=utmify_token&limit=1');
        return data?.[0]?.utmify_token || null;
    } catch { return null; }
}

async function sendUtmifyEvent(orderId, status, createdAt, approvedDate, customer, quantity, totalPriceInCents, feeInCents = 0, isTestMode = true) {
    const token = await getUtmifyToken();
    if (!token) return { error: 'UTMify token não configurado' };

    try {
        const response = await fetch('https://api.utmify.com.br/api-credentials/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-token': token,
            },
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
                    gatewayFeeInCents: feeInCents || 0,
                    userCommissionInCents: (totalPriceInCents || 0) - (feeInCents || 0),
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

/**
 * Create a REAL sandbox transaction on Safefy using sandbox credentials
 */
async function handleCreatePayment(req, res) {
    const { quantity } = req.body;
    const testQuantity = quantity || 1;
    const pricePerTitle = 1000; // R$ 10.00 in cents
    const totalAmountCents = testQuantity * pricePerTitle;

    const token = await getSandboxToken();
    const externalId = `sandbox-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const testCustomer = {
        name: 'Cliente Teste Sandbox',
        phone: '11999999999',
        email: 'teste@sandbox.com',
        cpf: generateCPF(),
    };

    // Create REAL transaction on Safefy Sandbox
    const callbackUrl = `https://${req.headers.host}/api/webhook`;
    const payload = {
        method: 'Pix',
        amount: totalAmountCents,
        currency: 'BRL',
        externalId: externalId,
        description: `Sandbox Test - ${testQuantity} título(s)`,
        callbackUrl: callbackUrl,
        pixExpirationMinutes: 10,
        customerName: testCustomer.name,
        customerDocument: testCustomer.cpf,
        customerEmail: testCustomer.email,
    };

    console.log('[Sandbox] Creating real transaction on Safefy:', { externalId, amount: totalAmountCents });

    const response = await fetch(`${SAFEFY_API_URL}/v1/transactions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('[Sandbox] Safefy create error:', data);
        return res.status(response.status).json({
            error: data.error?.message || 'Erro ao criar transação na Safefy Sandbox',
            details: data,
        });
    }

    const transactionData = data.data || {};
    const transactionId = transactionData.id || externalId;
    const pixCode = transactionData.pix?.copyAndPaste || '';
    const fee = transactionData.fee || 0;
    const netAmount = transactionData.netAmount || 0;

    console.log('[Sandbox] Transaction created:', {
        transactionId,
        externalId,
        fee,
        netAmount,
        environment: transactionData.environment,
    });

    // Save to database as pending
    const txData = {
        transaction_id: transactionId,
        customer_name: testCustomer.name,
        customer_phone: testCustomer.phone,
        customer_email: testCustomer.email,
        customer_cpf: testCustomer.cpf,
        quantity: testQuantity,
        total_price: (totalAmountCents / 100).toFixed(2),
        pix_code: pixCode,
        status: 'pending',
    };

    await supabaseFetch('transactions', {
        method: 'POST',
        body: JSON.stringify(txData),
    });

    return res.status(200).json({
        success: true,
        message: 'Transação Sandbox criada na Safefy (PIX real sandbox)',
        transaction_id: transactionId,
        external_id: externalId,
        pix_code: pixCode,
        customer: testCustomer,
        quantity: testQuantity,
        total_price: (totalAmountCents / 100).toFixed(2),
        fee_cents: fee,
        net_amount_cents: netAmount,
        environment: transactionData.environment || 'Sandbox',
        status: 'pending',
        callback_url: callbackUrl,
        hint: 'Use "Simular Pagamento" para completar via /v1/transactions/{id}/simulate',
    });
}

/**
 * Simulate payment completion using Safefy's /simulate endpoint
 * This triggers a REAL webhook callback from Safefy
 */
async function handleSimulatePayment(req, res) {
    const { transaction_id, action = 'complete' } = req.body;

    if (!transaction_id) {
        return res.status(400).json({ error: 'transaction_id obrigatório' });
    }

    // Validate action
    const validActions = ['complete', 'expire', 'fail', 'refund'];
    if (!validActions.includes(action)) {
        return res.status(400).json({
            error: `Ação inválida. Use: ${validActions.join(', ')}`,
        });
    }

    const token = await getSandboxToken();

    console.log(`[Sandbox] Simulating "${action}" for transaction:`, transaction_id);

    // Call Safefy's simulate endpoint
    const response = await fetch(
        `${SAFEFY_API_URL}/v1/transactions/${encodeURIComponent(transaction_id)}/simulate`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ action }),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.error('[Sandbox] Simulate error:', data);
        return res.status(response.status).json({
            error: data.error?.message || 'Erro ao simular transação',
            details: data,
        });
    }

    const simData = data.data || {};

    console.log('[Sandbox] Simulation result:', {
        id: simData.id,
        status: simData.status,
        action: simData.simulatedAction,
    });

    return res.status(200).json({
        success: true,
        message: `Simulação "${action}" enviada com sucesso. A Safefy disparará o webhook automaticamente.`,
        transaction_id: simData.id || transaction_id,
        new_status: simData.status,
        simulated_action: simData.simulatedAction,
        completed_at: simData.completedAt,
        hint: action === 'complete'
            ? 'O webhook payment.completed será disparado pela Safefy para seu callbackUrl'
            : `O webhook payment.${action === 'expire' ? 'expired' : action === 'fail' ? 'failed' : 'refunded'} será disparado`,
    });
}

/**
 * Check transaction status on Safefy Sandbox
 */
async function handleCheckStatus(req, res) {
    const { transaction_id } = req.body;

    if (!transaction_id) {
        return res.status(400).json({ error: 'transaction_id obrigatório' });
    }

    const token = await getSandboxToken();

    const response = await fetch(
        `${SAFEFY_API_URL}/v1/transactions/${encodeURIComponent(transaction_id)}`,
        {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
            },
        }
    );

    if (!response.ok) {
        return res.status(response.status).json({ error: 'Transação não encontrada na Safefy' });
    }

    const data = await response.json();
    const txData = data.data || {};

    return res.status(200).json({
        success: true,
        transaction_id: txData.id,
        external_id: txData.externalId,
        status: txData.status,
        amount: txData.amount,
        fee: txData.fee,
        net_amount: txData.netAmount,
        environment: txData.environment,
        created_at: txData.createdAt,
        completed_at: txData.completedAt,
        expires_at: txData.expiresAt,
    });
}

/**
 * Resend UTMify event for an existing transaction (useful for testing)
 */
async function handleResendUtmify(req, res) {
    const { transaction_id, isRealEvent = false } = req.body;

    if (!transaction_id) {
        return res.status(400).json({ error: 'transaction_id obrigatório' });
    }

    // Get transaction from database
    const transactions = await supabaseFetch(
        `transactions?transaction_id=eq.${encodeURIComponent(transaction_id)}&select=*`
    );

    if (transactions.length === 0) {
        return res.status(404).json({ error: 'Transação não encontrada no banco de dados' });
    }

    const tx = transactions[0];
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
        0, // fee - we don't have it stored, will use 0
        !isRealEvent // isTest
    );

    return res.status(200).json({
        success: true,
        message: isRealEvent
            ? 'Evento REAL enviado para UTMify (isTest: false)'
            : 'Evento de TESTE enviado para UTMify (isTest: true)',
        transaction_id: tx.transaction_id,
        utmify_mode: isRealEvent ? 'REAL' : 'TESTE',
        utmify_result: utmifyResult,
    });
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '');
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

    if (!SANDBOX_PUBLIC_KEY || !SANDBOX_SECRET_KEY) {
        return res.status(500).json({
            error: 'Credenciais sandbox não configuradas',
            hint: 'Defina SAFEFY_SANDBOX_PUBLIC_KEY e SAFEFY_SANDBOX_SECRET_KEY nas variáveis de ambiente',
        });
    }

    try {
        if (req.method === 'POST') {
            const { action } = req.body;

            switch (action) {
                case 'create':
                    return await handleCreatePayment(req, res);

                case 'simulate':
                    return await handleSimulatePayment(req, res);

                case 'status':
                    return await handleCheckStatus(req, res);

                case 'resend_utmify':
                    return await handleResendUtmify(req, res);

                default:
                    // Backward compatibility
                    if (!action && (req.body.quantity !== undefined || req.body.autoComplete !== undefined)) {
                        return await handleCreatePayment(req, res);
                    }
                    if (!action && req.body.transaction_id) {
                        return await handleSimulatePayment(req, res);
                    }

                    return res.status(400).json({
                        error: 'Ação inválida',
                        actions: {
                            create: 'Criar transação no sandbox Safefy',
                            simulate: 'Simular pagamento via /simulate (dispara webhook)',
                            status: 'Verificar status na Safefy',
                            resend_utmify: 'Reenviar evento para UTMify',
                        },
                    });
            }
        }

        return res.status(405).json({ error: 'Método não permitido' });
    } catch (error) {
        console.error('[Sandbox API] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
