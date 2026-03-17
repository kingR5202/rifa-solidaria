// Helper para gerar um CPF válido aleatório para transações anônimas
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

// Cache do token em memória
let cachedJwt = null;
let cachedJwtExpiry = 0;

// Cache de pagamentos confirmados
const confirmedPayments = new Map();

async function getSafefyToken() {
    if (cachedJwt && Date.now() < cachedJwtExpiry) {
        return cachedJwt;
    }

    const { SAFEFY_PUBLIC_KEY, SAFEFY_SECRET_KEY } = process.env;

    if (!SAFEFY_PUBLIC_KEY || !SAFEFY_SECRET_KEY) {
        throw new Error('Credenciais Safefy ausentes');
    }

    const authResponse = await fetch('https://api-payment.safefypay.com.br/v1/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grantType: 'client_credentials',
            publicKey: SAFEFY_PUBLIC_KEY,
            secretKey: SAFEFY_SECRET_KEY
        })
    });

    const authData = await authResponse.json();
    if (!authResponse.ok || !authData.data?.accessToken) {
        throw new Error('Autenticação Safefy falhou');
    }

    cachedJwt = authData.data.accessToken;
    const expiresIn = authData.data.expiresIn || 3600;
    cachedJwtExpiry = Date.now() + ((expiresIn - 300) * 1000);
    return cachedJwt;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            const { id, action } = req.query;

            if (action === 'track') return res.status(200).json({ status: 'ignored' });
            if (!id) return res.status(400).json({ error: 'ID ausente' });

            // 1. Verificar cache de Webhook
            if (confirmedPayments.has(id)) {
                return res.status(200).json({ status: 'paid', source: 'webhook_cache' });
            }

            // 2. Consulta direta na Safefy
            const token = await getSafefyToken();
            const response = await fetch(`https://api-payment.safefypay.com.br/v1/transactions/${encodeURIComponent(id)}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                const status = data.data?.status || 'Pending';
                const paid = (status === 'Completed');
                return res.status(200).json({ status: paid ? 'paid' : 'pending' });
            }

            // 3. Fallback
            if (id.startsWith('ord-')) return res.status(200).json({ status: 'pending' });

            return res.status(404).json({ error: 'Não encontrado' });
        }

        if (req.method === 'POST') {
            const { value, amount, metadata } = req.body;
            const finalAmountCents = parseInt(value || amount);
            if (!finalAmountCents) return res.status(400).json({ error: 'Valor obrigatório' });

            const token = await getSafefyToken();
            const externalId = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            const customerName = metadata?.customer?.nome || 'Cliente';
            const customerPhone = (metadata?.customer?.telefone || '11999999999').replace(/\D/g, '');
            const customerEmail = metadata?.customer?.email || null;
            const customerCpf = metadata?.customer?.cpf ? metadata.customer.cpf.replace(/\D/g, '') : null;

            const payload = {
                method: 'Pix',
                amount: finalAmountCents,
                currency: 'BRL',
                externalId: externalId,
                description: `Pagamento ${externalId}`,
                callbackUrl: `https://${req.headers.host}/api/webhook`,
                pixExpirationMinutes: 10,
                customerName: customerName,
                customerDocument: customerCpf || generateCPF(),
            };

            if (customerEmail) {
                payload.customerEmail = customerEmail;
            }

            if (metadata) {
                payload.metadata = JSON.stringify(metadata);
            }

            const response = await fetch('https://api-payment.safefypay.com.br/v1/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) {
                return res.status(response.status).json({ error: data.error?.message || 'Erro Safefy' });
            }

            const transactionData = data.data || {};
            const transactionId = transactionData.id || externalId;
            const pixCode = transactionData.pix?.copyAndPaste || '';

            return res.status(200).json({
                id: transactionId,
                qr_code: pixCode,
                status: 'PENDING',
                amount: finalAmountCents
            });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
