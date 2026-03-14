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
            const ordersResult = await db.query(
                `SELECT id, transaction_id, customer_name, customer_phone, quantity, total_price, payment_status, codes, created_at
                 FROM orders
                 ORDER BY created_at DESC`
            );

            // Summary stats
            const statsResult = await db.query(
                `SELECT
                    COUNT(*) as total_orders,
                    COALESCE(SUM(quantity), 0) as total_titles,
                    COALESCE(SUM(total_price), 0) as total_revenue,
                    COUNT(DISTINCT customer_phone) as unique_customers
                 FROM orders`
            );

            return res.status(200).json({
                orders: ordersResult.rows,
                stats: statsResult.rows[0],
            });
        }

        return res.status(405).json({ error: 'Método não permitido' });
    } catch (error) {
        console.error('[Admin API] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
