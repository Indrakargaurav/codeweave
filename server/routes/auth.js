const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('../models/User');

// ==============================
// 🔐 Local Register Route
// ==============================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('❌ Register Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==============================
// 🔐 Local Login Route
// ==============================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // ✅ Return user data with ownerId (no JWT needed)
    res.status(200).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        ownerId: user.ownerId,
      },
    });
  } catch (err) {
    console.error('❌ Login Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==============================
// 🔑 Google OAuth
// ==============================
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

router.get('/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
  // ✅ Redirect with ownerId instead of JWT
  res.redirect(
    `http://localhost:3000/login/success?ownerId=${req.user.ownerId}&name=${req.user.name}&email=${req.user.email}`
  );
});

// ==============================
// 🐱 GitHub OAuth
// ==============================
router.get(
  '/github',
  passport.authenticate('github', {
    scope: ['user:email'],
  })
);

router.get('/github/callback', passport.authenticate('github', { session: false }), (req, res) => {
  // ✅ Redirect with ownerId instead of JWT
  res.redirect(
    `http://localhost:3000/login/success?ownerId=${req.user.ownerId}&name=${req.user.name}&email=${req.user.email}`
  );
});

// ==============================
// 🔗 LinkedIn OAuth
// ==============================
router.get('/linkedin', passport.authenticate('linkedin'));

router.get(
  '/linkedin/callback',
  passport.authenticate('linkedin', { session: false }),
  (req, res) => {
    // ✅ Redirect with ownerId instead of JWT
    res.redirect(
      `http://localhost:3000/login/success?ownerId=${req.user.ownerId}&name=${req.user.name}&email=${req.user.email}`
    );
  }
);

module.exports = router;
