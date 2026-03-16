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
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    try {
        // Get Resend API key from settings
        const settings = await supabaseFetch('settings?select=resend_api_key&limit=1');
        const apiKey = settings[0]?.resend_api_key;

        if (!apiKey) {
            return res.status(400).json({ error: 'API Key do Resend não configurada' });
        }

        const { to, customerName, quantity, totalPrice, codes, transactionId } = req.body;

        if (!to) {
            return res.status(400).json({ error: 'E-mail do destinatário é obrigatório' });
        }

        const codesHtml = codes && codes.length > 0
            ? `<div style="background:#111;border-radius:12px;padding:16px;margin:16px 0;">
                <p style="color:#9ca3af;font-size:14px;margin:0 0 8px 0;">Seus códigos:</p>
                <div style="display:flex;flex-wrap:wrap;gap:8px;">
                    ${codes.map(c => `<span style="background:#166534;color:#4ade80;padding:4px 12px;border-radius:6px;font-family:monospace;font-size:14px;">${c}</span>`).join('')}
                </div>
               </div>`
            : '';

        const emailHtml = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;background:#000;border-radius:16px;overflow:hidden;border:1px solid #333;">
            <div style="background:linear-gradient(135deg,#166534,#000);padding:32px;text-align:center;">
                <h1 style="color:#4ade80;margin:0;font-size:24px;">Pagamento Confirmado!</h1>
            </div>
            <div style="padding:24px;">
                <p style="color:#fff;font-size:16px;margin:0 0 8px 0;">
                    Olá <strong>${customerName || 'Cliente'}</strong>,
                </p>
                <p style="color:#d1d5db;font-size:14px;margin:0 0 20px 0;">
                    Seu pagamento foi confirmado com sucesso! Obrigado por ajudar a reconstruir a ItalianCar.
                </p>

                <div style="background:#111;border:1px solid #333;border-radius:12px;padding:16px;text-align:center;margin:16px 0;">
                    <p style="color:#9ca3af;font-size:12px;margin:0;">Resumo do pedido</p>
                    <p style="color:#fff;font-size:20px;font-weight:bold;margin:8px 0 4px 0;">
                        ${quantity} título${quantity !== 1 ? 's' : ''}
                    </p>
                    <p style="color:#4ade80;font-size:24px;font-weight:bold;margin:0;">
                        R$ ${Number(totalPrice).toFixed(2)}
                    </p>
                    ${transactionId ? `<p style="color:#6b7280;font-size:11px;margin:8px 0 0 0;">ID: ${transactionId}</p>` : ''}
                </div>

                ${codesHtml}

                <p style="color:#6b7280;font-size:12px;text-align:center;margin:24px 0 0 0;">
                    Rifa Solidária — ItalianCar Automotiva
                </p>
            </div>
        </div>`;

        const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'Rifa Solidária <onboarding@resend.dev>',
                to: [to],
                subject: `Pagamento Confirmado — ${quantity} título${quantity !== 1 ? 's' : ''} da Rifa Solidária`,
                html: emailHtml,
            }),
        });

        const emailData = await emailRes.json();

        if (!emailRes.ok) {
            console.error('[Send Email] Resend error:', emailData);
            return res.status(400).json({ error: emailData.message || 'Erro ao enviar e-mail' });
        }

        return res.status(200).json({ success: true, id: emailData.id });
    } catch (error) {
        console.error('[Send Email] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
