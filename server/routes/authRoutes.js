const express = require('express');
const router = express.Router();

// 🧠 Controllers
const { register, login } = require('../controllers/authController');

// ==============================
// 🔐 Local Authentication Routes
// ==============================
router.post('/register', register); // POST /api/auth/register
router.post('/login', login); // POST /api/auth/login

module.exports = router;
