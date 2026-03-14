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

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'italiancar2024';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // Check admin password
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${ADMIN_PASSWORD}`) {
        return res.status(401).json({ error: 'Não autorizado' });
    }

    if (!process.env.DATABASE_URL) {
        return res.status(500).json({ error: 'DATABASE_URL não configurada' });
    }

    try {
        const db = getPool();

        if (req.method === 'GET') {
            // Get all orders
            const [orders] = await db.execute(
                `SELECT id, transaction_id, customer_name, customer_phone, quantity, total_price, payment_status, codes, created_at
                 FROM orders
                 ORDER BY created_at DESC`
            );

            // Summary stats
            const [stats] = await db.execute(
                `SELECT
                    COUNT(*) as total_orders,
                    SUM(quantity) as total_titles,
                    SUM(total_price) as total_revenue,
                    COUNT(DISTINCT customer_phone) as unique_customers
                 FROM orders`
            );

            return res.status(200).json({
                orders,
                stats: stats[0],
            });
        }

        return res.status(405).json({ error: 'Método não permitido' });
    } catch (error) {
        console.error('[Admin API] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
