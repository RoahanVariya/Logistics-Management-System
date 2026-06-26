const express = require('express');
const router = express.Router();
const { get, run } = require('../database');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password, and role are required.' });
  }

  const user = get(
    'SELECT * FROM users WHERE username = ? AND password = ? AND role = ?',
    [username, password, role]
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. Please check username, password, and role.' });
  }

  req.session.user = { id: user.id, username: user.username, role: user.role };
  return res.json({ message: 'Login successful', user: { id: user.id, username: user.username, role: user.role } });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Logout failed.' });
    res.json({ message: 'Logged out successfully.' });
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated.' });
  res.json({ user: req.session.user });
});

module.exports = router;
