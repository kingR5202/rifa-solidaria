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
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

    // Require admin auth - CPF lookup is sensitive
    const admin = requireAdmin(req);
    if (!admin) {
        return res.status(401).json({ error: 'Não autorizado' });
    }

    const { cpf } = req.query;

    if (!cpf) {
        return res.status(400).json({ error: 'CPF é obrigatório' });
    }

    // Remove formatting
    const cleanCpf = cpf.replace(/\D/g, '');

    if (cleanCpf.length !== 11) {
        return res.status(400).json({ error: 'CPF inválido (deve ter 11 dígitos)' });
    }

    try {
        // Get Checkify API key from settings
        const settings = await supabaseFetch('settings?select=checkify_api_key&limit=1');
        const apiKey = settings[0]?.checkify_api_key;

        if (!apiKey) {
            return res.status(400).json({ error: 'API Key do Checkify não configurada no painel admin' });
        }

        // Call Checkify API v2.0
        const apiRes = await fetch(`https://api.checkify.space/api/v1/consultas/cpf/${cleanCpf}`, {
            method: 'GET',
            headers: {
                'checkify-key': apiKey,
                'Content-Type': 'application/json',
            },
        });

        const data = await apiRes.json();

        if (!apiRes.ok) {
            const errorMessages = {
                401: 'API Key inválida',
                400: 'CPF inválido',
                403: 'Sem créditos ou assinatura inativa',
                404: 'CPF não encontrado',
            };
            return res.status(apiRes.status).json({
                error: errorMessages[apiRes.status] || data.message || 'Erro na consulta',
            });
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error('[Checkify] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
