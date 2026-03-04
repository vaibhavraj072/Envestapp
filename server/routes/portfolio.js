const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authMiddleware');

router.post('/add', authenticateToken, async (req, res) => {
    const { stock_symbol } = req.body;

    try {
        await pool.query(
            'INSERT INTO portfolios (user_id, stock_symbol) VALUES ($1, $2)',
            [req.user.id, stock_symbol]
        );

        res.json({ message: 'Stock added to portfolio' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add stock' });
    }
});

router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT stock_symbol FROM portfolios WHERE user_id = $1',
            [req.user.id]
        );

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
});

module.exports = router;