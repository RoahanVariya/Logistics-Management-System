const express = require('express');
const router  = express.Router();
const { get, all } = require('../database');
const { Parser } = require('json2csv');
const ExcelJS   = require('exceljs');

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Authentication required.' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Authentication required.' });
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }
  next();
}

// ─── Date Range Helper ────────────────────────────────────────────────────────

function getDateRange(type) {
  const now = new Date();
  let start, end;
  if (type === 'daily') {
    start = end = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0,10);
  } else if (type === 'weekly') {
    const s = new Date(now); s.setDate(now.getDate() - now.getDay());
    start = s.toISOString().slice(0,10);
    end   = now.toISOString().slice(0,10);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
    end   = now.toISOString().slice(0,10);
  }
  return { start, end };
}

function buildWhere(truck_number, material_type, date) {
  const clauses = [], params = [];
  if (truck_number) { clauses.push('truck_number LIKE ?'); params.push(`%${truck_number}%`); }
  if (material_type) { clauses.push('material_type = ?'); params.push(material_type); }
  if (date) { clauses.push('DATE(entry_time) = ?'); params.push(date); }
  return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

// ─── GET /api/reports/daily ───────────────────────────────────────────────────

router.get('/daily', requireAdmin, (req, res) => {
  const { start, end } = getDateRange('daily');
  const summary     = get(`SELECT COUNT(*) as total_trucks, SUM(quantity) as total_quantity FROM truck_entries WHERE DATE(entry_time) BETWEEN ? AND ?`, [start, end]);
  const byMaterial  = all(`SELECT material_type, COUNT(*) as count, SUM(quantity) as quantity FROM truck_entries WHERE DATE(entry_time) BETWEEN ? AND ? GROUP BY material_type ORDER BY quantity DESC`, [start, end]);
  const byHour      = all(`SELECT strftime('%H', entry_time) as hour, COUNT(*) as count, SUM(quantity) as quantity FROM truck_entries WHERE DATE(entry_time) BETWEEN ? AND ? GROUP BY hour ORDER BY hour`, [start, end]);
  const byTransporter = all(`SELECT transporter_name, COUNT(*) as deliveries, SUM(quantity) as quantity FROM truck_entries WHERE DATE(entry_time) BETWEEN ? AND ? AND transporter_name != '' GROUP BY transporter_name ORDER BY deliveries DESC`, [start, end]);
  res.json({ period: 'daily', start, end, summary: summary || { total_trucks: 0, total_quantity: 0 }, byMaterial, byHour, byTransporter });
});

// ─── GET /api/reports/weekly ──────────────────────────────────────────────────

router.get('/weekly', requireAdmin, (req, res) => {
  const { start, end } = getDateRange('weekly');
  const summary      = get(`SELECT COUNT(*) as total_trucks, SUM(quantity) as total_quantity FROM truck_entries WHERE DATE(entry_time) BETWEEN ? AND ?`, [start, end]);
  const byMaterial   = all(`SELECT material_type, COUNT(*) as count, SUM(quantity) as quantity FROM truck_entries WHERE DATE(entry_time) BETWEEN ? AND ? GROUP BY material_type ORDER BY quantity DESC`, [start, end]);
  const byDay        = all(`SELECT DATE(entry_time) as day, COUNT(*) as count, SUM(quantity) as quantity FROM truck_entries WHERE DATE(entry_time) BETWEEN ? AND ? GROUP BY day ORDER BY day`, [start, end]);
  const byTransporter = all(`SELECT transporter_name, COUNT(*) as deliveries, SUM(quantity) as quantity FROM truck_entries WHERE DATE(entry_time) BETWEEN ? AND ? AND transporter_name != '' GROUP BY transporter_name ORDER BY deliveries DESC`, [start, end]);
  res.json({ period: 'weekly', start, end, summary: summary || { total_trucks: 0, total_quantity: 0 }, byMaterial, byDay, byTransporter });
});

// ─── GET /api/reports/monthly ─────────────────────────────────────────────────

router.get('/monthly', requireAdmin, (req, res) => {
  const { start, end } = getDateRange('monthly');
  const summary      = get(`SELECT COUNT(*) as total_trucks, SUM(quantity) as total_quantity FROM truck_entries WHERE DATE(entry_time) BETWEEN ? AND ?`, [start, end]);
  const byMaterial   = all(`SELECT material_type, COUNT(*) as count, SUM(quantity) as quantity FROM truck_entries WHERE DATE(entry_time) BETWEEN ? AND ? GROUP BY material_type ORDER BY quantity DESC`, [start, end]);
  const byDay        = all(`SELECT DATE(entry_time) as day, COUNT(*) as count, SUM(quantity) as quantity FROM truck_entries WHERE DATE(entry_time) BETWEEN ? AND ? GROUP BY day ORDER BY day`, [start, end]);
  const byTransporter = all(`SELECT transporter_name, COUNT(*) as deliveries, SUM(quantity) as quantity FROM truck_entries WHERE DATE(entry_time) BETWEEN ? AND ? AND transporter_name != '' GROUP BY transporter_name ORDER BY deliveries DESC`, [start, end]);
  res.json({ period: 'monthly', start, end, summary: summary || { total_trucks: 0, total_quantity: 0 }, byMaterial, byDay, byTransporter });
});

// ─── GET /api/reports/dashboard ───────────────────────────────────────────────

router.get('/dashboard', requireAuth, (req, res) => {
  const today      = new Date().toISOString().slice(0,10);
  const { start: weekStart  } = getDateRange('weekly');
  const { start: monthStart } = getDateRange('monthly');

  const todayCount  = get(`SELECT COUNT(*) as cnt FROM truck_entries WHERE DATE(entry_time) = ?`, [today]);
  const weekCount   = get(`SELECT COUNT(*) as cnt FROM truck_entries WHERE DATE(entry_time) >= ?`, [weekStart]);
  const monthCount  = get(`SELECT COUNT(*) as cnt FROM truck_entries WHERE DATE(entry_time) >= ?`, [monthStart]);
  const totalQty    = get(`SELECT SUM(quantity) as total FROM truck_entries WHERE DATE(entry_time) >= ?`, [monthStart]);
  const recent      = all(`SELECT * FROM truck_entries ORDER BY entry_time DESC LIMIT 10`);

  res.json({
    todayTrucks:    todayCount  ? todayCount.cnt   : 0,
    weekEntries:    weekCount   ? weekCount.cnt     : 0,
    monthEntries:   monthCount  ? monthCount.cnt    : 0,
    totalQuantity:  totalQty    ? (totalQty.total || 0) : 0,
    recentEntries:  recent,
  });
});

// ─── GET /api/reports/export/csv ──────────────────────────────────────────────

router.get('/export/csv', requireAdmin, (req, res) => {
  const { truck_number = '', material_type = '', date = '' } = req.query;
  const { sql: whereSQL, params } = buildWhere(truck_number, material_type, date);
  const rows = all(`SELECT id, truck_number, driver_name, material_type, quantity, entry_time FROM truck_entries ${whereSQL} ORDER BY entry_time DESC`, params);

  try {
    const parser = new Parser({ fields: ['id','truck_number','driver_name','material_type','quantity','entry_time'] });
    const csv = parser.parse(rows);
    res.header('Content-Type', 'text/csv');
    res.attachment('truck_entries.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate CSV.' });
  }
});

// ─── GET /api/reports/export/excel ────────────────────────────────────────────

router.get('/export/excel', requireAdmin, async (req, res) => {
  const { truck_number = '', material_type = '', date = '' } = req.query;
  const { sql: whereSQL, params } = buildWhere(truck_number, material_type, date);
  const rows = all(`SELECT id, truck_number, driver_name, material_type, quantity, entry_time FROM truck_entries ${whereSQL} ORDER BY entry_time DESC`, params);

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Logistics Management System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Truck Entries');
    sheet.columns = [
      { header: 'ID',                key: 'id',            width: 8  },
      { header: 'Truck Number',      key: 'truck_number',  width: 15 },
      { header: 'Driver Name',       key: 'driver_name',   width: 22 },
      { header: 'Material Type',     key: 'material_type', width: 15 },
      { header: 'Quantity (kg)',     key: 'quantity',       width: 15 },
      { header: 'Entry Date & Time', key: 'entry_time',    width: 22 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    rows.forEach((row, i) => {
      const r = sheet.addRow(row);
      r.fill = i % 2 === 0
        ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } }
        : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    });

    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment('truck_entries.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate Excel file.' });
  }
});

module.exports = router;
