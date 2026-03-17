const { verifyPassword, generateToken, checkRateLimit, recordLoginAttempt, getClientIP } = require('./_auth');

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const ip = getClientIP(req);

    // Rate limiting
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
        return res.status(429).json({
            error: `Muitas tentativas. Tente novamente em ${rateCheck.remainingMin} minutos.`
        });
    }

    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'Senha obrigatória' });
    }

    if (!verifyPassword(password)) {
        recordLoginAttempt(ip, false);
        return res.status(401).json({ error: 'Senha incorreta' });
    }

    recordLoginAttempt(ip, true);

    const token = generateToken({ role: 'admin' });

    return res.status(200).json({ success: true, token });
}
