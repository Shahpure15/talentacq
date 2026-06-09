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
      `SELECT practice_id, practice_code, practice_name, practice_head_id, is_active FROM MST_Practice`,
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
      `SELECT practice_id, practice_code, practice_name, practice_head_id, is_active FROM MST_Practice WHERE practice_code = :code`,
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
      `SELECT practice_id, practice_code, practice_name, practice_head_id, is_active FROM MST_Practice WHERE practice_id > :id ORDER BY practice_id ASC FETCH FIRST 1 ROWS ONLY`,
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
      `SELECT practice_id, practice_code, practice_name, practice_head_id, is_active FROM MST_Practice WHERE practice_id < :id ORDER BY practice_id DESC FETCH FIRST 1 ROWS ONLY`,
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
      `SELECT NVL(MAX(practice_id), 0) + 1 AS next_id FROM MST_Practice`,
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
    const { practice_code, practice_name, practice_head_id, is_active } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `INSERT INTO MST_Practice (practice_code, practice_name, practice_head_id, is_active)
       VALUES (:practice_code, :practice_name, :practice_head_id, :is_active)`,
      {
        practice_code, practice_name, 
        practice_head_id: practice_head_id === '' || practice_head_id == null ? null : Number(practice_head_id),
        is_active: Number(is_active)
      },
      { autoCommit: true }
    );
    res.status(201).json({ success: true, rowsAffected: result.rowsAffected });
  } catch (err) {
    if (err.errorNum === 1) return res.status(409).json({ success: false, message: 'Practice Code already exists' });
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) try { await connection.close(); } catch (e) {}
  }
});

// PUT
router.put('/:id', async (req, res) => {
  let connection;
  try {
    const { practice_code, practice_name, practice_head_id, is_active } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `UPDATE MST_Practice 
       SET practice_code = :practice_code, practice_name = :practice_name, practice_head_id = :practice_head_id, is_active = :is_active
       WHERE practice_id = :id`,
      {
        id: req.params.id,
        practice_code, practice_name, 
        practice_head_id: practice_head_id === '' || practice_head_id == null ? null : Number(practice_head_id),
        is_active: Number(is_active)
      },
      { autoCommit: true }
    );
    res.json({ success: true, rowsAffected: result.rowsAffected });
  } catch (err) {
    if (err.errorNum === 1) return res.status(409).json({ success: false, message: 'Practice Code already exists' });
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) try { await connection.close(); } catch (e) {}
  }
});

module.exports = router;
