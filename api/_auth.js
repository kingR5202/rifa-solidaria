import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'italiancar2024';
const JWT_SECRET = process.env.JWT_SECRET || ADMIN_PASSWORD + '_jwt_secret_2024';

// Simple rate limiting - track login attempts per IP
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken(payload) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24h
    })).toString('base64url');
    const signature = crypto.createHmac('sha256', JWT_SECRET)
        .update(`${header}.${body}`)
        .digest('base64url');
    return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [header, body, signature] = parts;
        const expected = crypto.createHmac('sha256', JWT_SECRET)
            .update(`${header}.${body}`)
            .digest('base64url');

        if (signature !== expected) return null;

        const payload = JSON.parse(Buffer.from(body, 'base64url').toString());

        // Check expiration
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}

function verifyPassword(input) {
    return input === ADMIN_PASSWORD;
}

function checkRateLimit(ip) {
    const now = Date.now();
    const attempt = loginAttempts.get(ip);

    if (attempt) {
        // Clean old entries
        if (now - attempt.firstAttempt > LOCKOUT_MINUTES * 60 * 1000) {
            loginAttempts.delete(ip);
            return { allowed: true };
        }

        if (attempt.count >= MAX_ATTEMPTS) {
            const remainingMs = (LOCKOUT_MINUTES * 60 * 1000) - (now - attempt.firstAttempt);
            const remainingMin = Math.ceil(remainingMs / 60000);
            return { allowed: false, remainingMin };
        }
    }

    return { allowed: true };
}

function recordLoginAttempt(ip, success) {
    if (success) {
        loginAttempts.delete(ip);
        return;
    }

    const attempt = loginAttempts.get(ip);
    if (attempt) {
        attempt.count++;
    } else {
        loginAttempts.set(ip, { count: 1, firstAttempt: Date.now() });
    }
}

// Middleware: check if request has valid admin token
function requireAdmin(req) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return null;
    }

    const token = auth.slice(7);
    return verifyToken(token);
}

function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']
        || req.connection?.remoteAddress
        || '0.0.0.0';
}

export {
    verifyPassword,
    generateToken,
    verifyToken,
    requireAdmin,
    checkRateLimit,
    recordLoginAttempt,
    getClientIP,
};
