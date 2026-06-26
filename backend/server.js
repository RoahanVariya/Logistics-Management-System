const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'logistics-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 8 * 60 * 60 * 1000 },
}));

// ─── Serve Frontend Static Files ──────────────────────────────────────────────

app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ─── SPA Routes ───────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'dashboard.html'));
});

// ─── Start After DB is Ready ──────────────────────────────────────────────────

initDatabase().then(() => {
  // Mount routes AFTER DB is initialized
  const authRoutes    = require('./routes/auth');
  const entriesRoutes = require('./routes/entries');
  const reportsRoutes = require('./routes/reports');

  app.use('/api/auth', authRoutes);
  app.use('/api/entries', entriesRoutes);
  app.use('/api/reports', reportsRoutes);

  app.listen(PORT, () => {
    console.log(`\n🚛 Logistics Management System`);
    console.log(`📡 Server running at: http://localhost:${PORT}`);
    console.log(`\n👤 Demo Credentials:`);
    console.log(`   Admin:      admin / admin123`);
    console.log(`   Supervisor: supervisor / supervisor123\n`);
  });
}).catch(err => {
  console.error('❌ Failed to initialize database:', err);
  process.exit(1);
});
