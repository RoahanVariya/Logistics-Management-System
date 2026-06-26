const express = require('express');
const router = express.Router();
const { get, all, run, lastInsertId } = require('../database');

// ─── Auth Middleware ──────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Authentication required.' });
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Authentication required.' });
  if (req.session.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
  next();
}

// ─── GET /api/entries ─────────────────────────────────────────────────────────

router.get('/', requireAuth, (req, res) => {
  const {
    page = 1, limit = 10,
    search = '', truck_number = '', transporter_name = '', material_type = '', date = '',
    sort_by = 'entry_time', sort_dir = 'DESC',
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const allowedSort = ['truck_number', 'driver_name', 'transporter_name', 'material_type', 'quantity', 'entry_time'];
  const safeSort = allowedSort.includes(sort_by) ? sort_by : 'entry_time';
  const safeDir  = sort_dir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const whereClauses = [], params = [];

  if (search) {
    whereClauses.push('(truck_number LIKE ? OR driver_name LIKE ? OR transporter_name LIKE ? OR material_type LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (truck_number)      { whereClauses.push('truck_number LIKE ?');      params.push(`%${truck_number}%`); }
  if (transporter_name)  { whereClauses.push('transporter_name LIKE ?');  params.push(`%${transporter_name}%`); }
  if (material_type)     { whereClauses.push('material_type = ?');        params.push(material_type); }
  if (date)              { whereClauses.push('DATE(entry_time) = ?');     params.push(date); }

  const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRow = get(`SELECT COUNT(*) as total FROM truck_entries ${whereSQL}`, params);
  const total = countRow ? (countRow.total || 0) : 0;

  const rows = all(
    `SELECT * FROM truck_entries ${whereSQL} ORDER BY ${safeSort} ${safeDir} LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), offset]
  );

  res.json({
    data: rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  });
});

// ─── POST /api/entries ────────────────────────────────────────────────────────

router.post('/', requireAuth, (req, res) => {
  const { truck_number, driver_name, transporter_name, material_type, quantity, entry_time } = req.body;

  if (!truck_number || !driver_name || !transporter_name || !material_type || !quantity) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive number.' });
  }
  const validMaterials = ['Cement','Sand','Steel','Gravel','Bricks','Other'];
  if (!validMaterials.includes(material_type)) {
    return res.status(400).json({ error: 'Invalid material type.' });
  }

  const entryTime = entry_time || new Date().toISOString().replace('T',' ').slice(0,19);

  run(
    'INSERT INTO truck_entries (truck_number, driver_name, transporter_name, material_type, quantity, entry_time, created_by) VALUES (?,?,?,?,?,?,?)',
    [truck_number.toUpperCase(), driver_name, transporter_name, material_type, parseFloat(quantity), entryTime, req.session.user.username]
  );

  const newId = lastInsertId();
  const newEntry = get('SELECT * FROM truck_entries WHERE id = ?', [newId]);
  res.status(201).json({ message: 'Entry created successfully.', data: newEntry });
});

// ─── PUT /api/entries/:id ─────────────────────────────────────────────────────

router.put('/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { truck_number, driver_name, transporter_name, material_type, quantity, entry_time } = req.body;

  const existing = get('SELECT * FROM truck_entries WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ error: 'Entry not found.' });

  if (!truck_number || !driver_name || !transporter_name || !material_type || !quantity) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive number.' });
  }

  run(
    `UPDATE truck_entries SET truck_number=?, driver_name=?, transporter_name=?, material_type=?, quantity=?, entry_time=?, updated_at=datetime('now') WHERE id=?`,
    [truck_number.toUpperCase(), driver_name, transporter_name, material_type, parseFloat(quantity), entry_time, id]
  );

  const updated = get('SELECT * FROM truck_entries WHERE id = ?', [id]);
  res.json({ message: 'Entry updated successfully.', data: updated });
});

// ─── DELETE /api/entries/:id ──────────────────────────────────────────────────

router.delete('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const existing = get('SELECT * FROM truck_entries WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ error: 'Entry not found.' });
  run('DELETE FROM truck_entries WHERE id = ?', [id]);
  res.json({ message: 'Entry deleted successfully.' });
});

module.exports = router;
