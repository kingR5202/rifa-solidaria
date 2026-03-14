import pg from 'pg';

const { Pool } = pg;

let pool = null;

function getPool() {
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
            max: 5,
        });
    }
    return pool;
}

// Generate random 6-digit title code
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function ensureTable() {
    const db = getPool();
    await db.query(`
        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            transaction_id VARCHAR(255),
            customer_name VARCHAR(255) NOT NULL,
            customer_phone VARCHAR(20) NOT NULL,
            quantity INT NOT NULL DEFAULT 1,
            total_price DECIMAL(10,2) NOT NULL,
            payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
            codes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!process.env.DATABASE_URL) {
        return res.status(500).json({ error: 'DATABASE_URL não configurada' });
    }

    try {
        await ensureTable();
        const db = getPool();

        // POST: Save new order after payment
        if (req.method === 'POST') {
            const { transaction_id, customer_name, customer_phone, quantity, total_price } = req.body;

            if (!customer_name || !customer_phone || !quantity || !total_price) {
                return res.status(400).json({ error: 'Dados incompletos' });
            }

            // Generate unique codes for each title
            const codes = [];
            for (let i = 0; i < quantity; i++) {
                codes.push(generateCode());
            }
            const codesStr = codes.join(',');

            const result = await db.query(
                `INSERT INTO orders (transaction_id, customer_name, customer_phone, quantity, total_price, payment_status, codes)
                 VALUES ($1, $2, $3, $4, $5, 'paid', $6)
                 RETURNING id`,
                [transaction_id || '', customer_name, customer_phone, quantity, total_price, codesStr]
            );

            return res.status(200).json({
                success: true,
                orderId: result.rows[0].id,
                codes,
            });
        }

        // GET: Get orders by phone number
        if (req.method === 'GET') {
            const { phone } = req.query;

            if (!phone) {
                return res.status(400).json({ error: 'Telefone obrigatório' });
            }

            // Clean phone - remove formatting, keep only digits
            const cleanPhone = phone.replace(/\D/g, '');

            const result = await db.query(
                `SELECT id, transaction_id, customer_name, quantity, total_price, payment_status, codes, created_at
                 FROM orders
                 WHERE REGEXP_REPLACE(customer_phone, '[^0-9]', '', 'g') LIKE $1
                 ORDER BY created_at DESC`,
                [`%${cleanPhone}%`]
            );

            return res.status(200).json({ orders: result.rows });
        }

    } catch (error) {
        console.error('[Orders API] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
