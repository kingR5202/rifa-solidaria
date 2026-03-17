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

function generateTestTransactionId() {
    return `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
                // Simulate webhook by calling the test-webhook endpoint
                const webhookUrl = `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/test-webhook`;
                await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': req.headers.authorization,
                    },
                    body: JSON.stringify({ transaction_id: transactionId }),
                });

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

        return res.status(405).json({ error: 'Método não permitido' });
    } catch (error) {
        console.error('[Test Payment API] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
