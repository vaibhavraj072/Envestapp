const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "envestapp_secret_key";

// REGISTER
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email',
            [name, email, hashedPassword]
        );

        res.status(201).json({ message: "User created" });
    } catch (err) {
        res.status(400).json({ error: "Email already exists" });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
    );

    if (result.rows.length === 0)
        return res.status(400).json({ error: "User not found" });

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword)
        return res.status(400).json({ error: "Invalid password" });

    const token = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: "1d" }
    );

    res.json({ token });
});

module.exports = router;
