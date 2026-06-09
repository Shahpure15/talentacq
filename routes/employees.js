const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db');

router.get('/', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT employee_id, employee_code, first_name, last_name, email, employee_type, role_id, practice_id, grade_id, is_active FROM MST_Employee`,
      [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json({ success: true, data: result.rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase(), v]))) });
  } catch (err) { res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.get('/code/:code', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT employee_id, employee_code, first_name, last_name, email, employee_type, role_id, practice_id, grade_id, is_active FROM MST_Employee WHERE employee_code = :code`,
      { code: req.params.code }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: Object.fromEntries(Object.entries(result.rows[0]).map(([k, v]) => [k.toLowerCase(), v])) });
  } catch (err) { res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.get('/next/:id', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT employee_id, employee_code, first_name, last_name, email, employee_type, role_id, practice_id, grade_id, is_active FROM MST_Employee WHERE employee_id > :id ORDER BY employee_id ASC FETCH FIRST 1 ROWS ONLY`,
      { id: req.params.id }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Last record reached' });
    res.json({ success: true, data: Object.fromEntries(Object.entries(result.rows[0]).map(([k, v]) => [k.toLowerCase(), v])) });
  } catch (err) { res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.get('/previous/:id', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT employee_id, employee_code, first_name, last_name, email, employee_type, role_id, practice_id, grade_id, is_active FROM MST_Employee WHERE employee_id < :id ORDER BY employee_id DESC FETCH FIRST 1 ROWS ONLY`,
      { id: req.params.id }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'First record reached' });
    res.json({ success: true, data: Object.fromEntries(Object.entries(result.rows[0]).map(([k, v]) => [k.toLowerCase(), v])) });
  } catch (err) { res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.get('/next-id', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(`SELECT NVL(MAX(employee_id), 0) + 1 AS next_id FROM MST_Employee`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json({ success: true, next_id: result.rows[0].NEXT_ID });
  } catch (err) { res.status(500).json({ success: false });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.post('/', async (req, res) => {
  let connection;
  try {
    const { employee_code, first_name, last_name, email, employee_type, role_id, practice_id, grade_id, is_active } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `INSERT INTO MST_Employee (employee_code, first_name, last_name, email, employee_type, role_id, practice_id, grade_id, is_active)
       VALUES (:employee_code, :first_name, :last_name, :email, :employee_type, :role_id, :practice_id, :grade_id, :is_active)`,
      {
        employee_code, first_name, last_name: last_name || null, email: email || null, employee_type: employee_type || null,
        role_id: role_id || null, practice_id: practice_id || null, grade_id: grade_id || null,
        is_active: Number(is_active)
      },
      { autoCommit: true }
    );
    res.status(201).json({ success: true, rowsAffected: result.rowsAffected });
  } catch (err) {
    if (err.errorNum === 1) return res.status(409).json({ success: false, message: 'Employee Code already exists' });
    res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.put('/:id', async (req, res) => {
  let connection;
  try {
    const { employee_code, first_name, last_name, email, employee_type, role_id, practice_id, grade_id, is_active } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `UPDATE MST_Employee SET employee_code = :employee_code, first_name = :first_name, last_name = :last_name, email = :email, employee_type = :employee_type, role_id = :role_id, practice_id = :practice_id, grade_id = :grade_id, is_active = :is_active WHERE employee_id = :id`,
      {
        id: req.params.id, employee_code, first_name, last_name: last_name || null, email: email || null, employee_type: employee_type || null,
        role_id: role_id || null, practice_id: practice_id || null, grade_id: grade_id || null,
        is_active: Number(is_active)
      },
      { autoCommit: true }
    );
    res.json({ success: true, rowsAffected: result.rowsAffected });
  } catch (err) {
    if (err.errorNum === 1) return res.status(409).json({ success: false, message: 'Employee Code already exists' });
    res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

module.exports = router;
