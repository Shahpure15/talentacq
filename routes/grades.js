const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db');

// GET all
router.get('/', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT grade_id, grade_code, grade_name, band_min_salary, band_max_salary, currency_code, is_active FROM MST_Grade`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json({ success: true, data: result.rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase(), v]))) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) try { await connection.close(); } catch (e) {}
  }
});

// GET by code
router.get('/code/:code', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT grade_id, grade_code, grade_name, band_min_salary, band_max_salary, currency_code, is_active FROM MST_Grade WHERE grade_code = :code`,
      { code: req.params.code },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: Object.fromEntries(Object.entries(result.rows[0]).map(([k, v]) => [k.toLowerCase(), v])) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) try { await connection.close(); } catch (e) {}
  }
});

// GET next
router.get('/next/:id', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT grade_id, grade_code, grade_name, band_min_salary, band_max_salary, currency_code, is_active FROM MST_Grade WHERE grade_id > :id ORDER BY grade_id ASC FETCH FIRST 1 ROWS ONLY`,
      { id: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Last record reached' });
    res.json({ success: true, data: Object.fromEntries(Object.entries(result.rows[0]).map(([k, v]) => [k.toLowerCase(), v])) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) try { await connection.close(); } catch (e) {}
  }
});

// GET previous
router.get('/previous/:id', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT grade_id, grade_code, grade_name, band_min_salary, band_max_salary, currency_code, is_active FROM MST_Grade WHERE grade_id < :id ORDER BY grade_id DESC FETCH FIRST 1 ROWS ONLY`,
      { id: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'First record reached' });
    res.json({ success: true, data: Object.fromEntries(Object.entries(result.rows[0]).map(([k, v]) => [k.toLowerCase(), v])) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) try { await connection.close(); } catch (e) {}
  }
});

// GET next-id
router.get('/next-id', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT NVL(MAX(grade_id), 0) + 1 AS next_id FROM MST_Grade`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json({ success: true, next_id: result.rows[0].NEXT_ID });
  } catch (err) {
    res.status(500).json({ success: false });
  } finally {
    if (connection) try { await connection.close(); } catch (e) {}
  }
});

// POST
router.post('/', async (req, res) => {
  let connection;
  try {
    const { grade_code, grade_name, band_min_salary, band_max_salary, currency_code, is_active } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `INSERT INTO MST_Grade (grade_code, grade_name, band_min_salary, band_max_salary, currency_code, is_active)
       VALUES (:grade_code, :grade_name, :band_min_salary, :band_max_salary, :currency_code, :is_active)`,
      {
        grade_code, grade_name, 
        band_min_salary: band_min_salary === '' || band_min_salary == null ? null : Number(band_min_salary),
        band_max_salary: band_max_salary === '' || band_max_salary == null ? null : Number(band_max_salary),
        currency_code: currency_code || null,
        is_active: Number(is_active)
      },
      { autoCommit: true }
    );
    res.status(201).json({ success: true, rowsAffected: result.rowsAffected });
  } catch (err) {
    if (err.errorNum === 1) return res.status(409).json({ success: false, message: 'Grade Code already exists' });
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) try { await connection.close(); } catch (e) {}
  }
});

// PUT
router.put('/:id', async (req, res) => {
  let connection;
  try {
    const { grade_code, grade_name, band_min_salary, band_max_salary, currency_code, is_active } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `UPDATE MST_Grade 
       SET grade_code = :grade_code, grade_name = :grade_name, band_min_salary = :band_min_salary, 
           band_max_salary = :band_max_salary, currency_code = :currency_code, is_active = :is_active
       WHERE grade_id = :id`,
      {
        id: req.params.id,
        grade_code, grade_name, 
        band_min_salary: band_min_salary === '' || band_min_salary == null ? null : Number(band_min_salary),
        band_max_salary: band_max_salary === '' || band_max_salary == null ? null : Number(band_max_salary),
        currency_code: currency_code || null,
        is_active: Number(is_active)
      },
      { autoCommit: true }
    );
    res.json({ success: true, rowsAffected: result.rowsAffected });
  } catch (err) {
    if (err.errorNum === 1) return res.status(409).json({ success: false, message: 'Grade Code already exists' });
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) try { await connection.close(); } catch (e) {}
  }
});

module.exports = router;
