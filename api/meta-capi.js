import crypto from 'crypto';

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

function sha256(value) {
    if (!value) return undefined;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return undefined;
    return crypto.createHash('sha256').update(normalized).digest('hex');
}

function generateEventId() {
    return `evt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

async function getSettings() {
    const data = await supabaseFetch('settings?select=*&limit=1');
    return data.length > 0 ? data[0] : null;
}

async function logEvent(eventName, eventId, status, response) {
    try {
        await supabaseFetch('capi_events_log', {
            method: 'POST',
            body: JSON.stringify({
                event_name: eventName,
                event_id: eventId,
                status,
                response: typeof response === 'string' ? response : JSON.stringify(response),
            }),
        });
    } catch (err) {
        console.error('[CAPI Log] Failed to log event:', err.message);
    }
}

async function sendToMeta(settings, eventPayload, isTest = false) {
    const { meta_pixel_id, meta_access_token, meta_test_code } = settings;

    if (!meta_pixel_id || !meta_access_token) {
        throw new Error('Pixel ID e Access Token são obrigatórios');
    }

    const body = {
        data: [eventPayload],
        access_token: meta_access_token,
    };

    if (isTest && meta_test_code) {
        body.test_event_code = meta_test_code;
    }

    const url = `https://graph.facebook.com/v18.0/${meta_pixel_id}/events`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    const data = await res.json();
    return { ok: res.ok, data };
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(500).json({ error: 'SUPABASE_URL ou SUPABASE_KEY não configuradas' });
    }

    try {
        // GET: Return event logs
        if (req.method === 'GET') {
            const logs = await supabaseFetch('capi_events_log?select=*&order=created_at.desc&limit=50');
            return res.status(200).json({ logs });
        }

        // POST: Send event to Meta CAPI
        if (req.method === 'POST') {
            const settings = await getSettings();
            if (!settings || !settings.meta_pixel_id || !settings.meta_access_token) {
                return res.status(400).json({ error: 'Meta CAPI não configurado. Configure Pixel ID e Access Token no painel admin.' });
            }

            const {
                event_name = 'PageView',
                test = false,
                user_data = {},
                custom_data = {},
                event_source_url,
                event_id: clientEventId,
            } = req.body;

            const eventId = clientEventId || generateEventId();
            const eventTime = Math.floor(Date.now() / 1000);

            // Build user_data with SHA256 hashing
            const hashedUserData = {};
            if (user_data.em) hashedUserData.em = [sha256(user_data.em)];
            if (user_data.ph) hashedUserData.ph = [sha256(user_data.ph)];
            if (user_data.fn) hashedUserData.fn = [sha256(user_data.fn)];
            if (user_data.ln) hashedUserData.ln = [sha256(user_data.ln)];
            if (user_data.external_id) hashedUserData.external_id = [sha256(user_data.external_id)];
            if (user_data.fbp) hashedUserData.fbp = user_data.fbp;
            if (user_data.fbc) hashedUserData.fbc = user_data.fbc;

            // client_ip_address and client_user_agent from request headers
            hashedUserData.client_ip_address = user_data.client_ip_address
                || req.headers['x-forwarded-for']?.split(',')[0]?.trim()
                || req.headers['x-real-ip']
                || req.socket?.remoteAddress
                || '';
            hashedUserData.client_user_agent = user_data.client_user_agent
                || req.headers['user-agent']
                || '';

            const eventPayload = {
                event_name,
                event_time: eventTime,
                event_id: eventId,
                action_source: 'website',
                user_data: hashedUserData,
            };

            if (event_source_url) {
                eventPayload.event_source_url = event_source_url;
            }

            if (custom_data && Object.keys(custom_data).length > 0) {
                eventPayload.custom_data = {
                    ...custom_data,
                    currency: custom_data.currency || 'BRL',
                };
            }

            const result = await sendToMeta(settings, eventPayload, test);

            const status = result.ok ? 'sent' : 'error';
            await logEvent(event_name, eventId, status, result.data);

            if (!result.ok) {
                return res.status(400).json({
                    error: 'Erro ao enviar evento para Meta',
                    fb_response: result.data,
                    event_id: eventId,
                });
            }

            return res.status(200).json({
                success: true,
                event_id: eventId,
                fb_response: result.data,
            });
        }

        return res.status(405).json({ error: 'Método não permitido' });
    } catch (error) {
        console.error('[Meta CAPI] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
