const confirmedPayments = new Map();

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

        if (isPaid && transactionId) {
            console.log(`[Webhook Safefy] PAGAMENTO CONFIRMADO: ${transactionId}`);
            const cacheEntry = { status: 'paid', timestamp: Date.now(), data: body };
            confirmedPayments.set(transactionId, cacheEntry);
            if (externalId) {
                confirmedPayments.set(externalId, cacheEntry);
            }
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        console.error('[Webhook Safefy] Erro:', error);
        return res.status(200).json({ error: 'Erro interno', message: error.message });
    }
}
