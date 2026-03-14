import mysql from 'mysql2/promise';

let pool = null;

function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            uri: process.env.DATABASE_URL,
            waitForConnections: true,
            connectionLimit: 5,
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
    await db.execute(`
        CREATE TABLE IF NOT EXISTS orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
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

            const [result] = await db.execute(
                `INSERT INTO orders (transaction_id, customer_name, customer_phone, quantity, total_price, payment_status, codes)
                 VALUES (?, ?, ?, ?, ?, 'paid', ?)`,
                [transaction_id || '', customer_name, customer_phone, quantity, total_price, codesStr]
            );

            return res.status(200).json({
                success: true,
                orderId: result.insertId,
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

            const [rows] = await db.execute(
                `SELECT id, transaction_id, customer_name, quantity, total_price, payment_status, codes, created_at
                 FROM orders
                 WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(customer_phone, '(', ''), ')', ''), '-', ''), ' ', ''), '+', '') LIKE ?
                 ORDER BY created_at DESC`,
                [`%${cleanPhone}%`]
            );

            return res.status(200).json({ orders: rows });
        }

    } catch (error) {
        console.error('[Orders API] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
