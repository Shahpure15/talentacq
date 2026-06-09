const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db');

router.get('/', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(`SELECT activity_id, activity_code, activity_name, description, is_mandatory, is_active FROM MST_OnboardingActivity`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json({ success: true, data: result.rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase(), v]))) });
  } catch (err) { res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.get('/code/:code', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(`SELECT activity_id, activity_code, activity_name, description, is_mandatory, is_active FROM MST_OnboardingActivity WHERE activity_code = :code`, { code: req.params.code }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: Object.fromEntries(Object.entries(result.rows[0]).map(([k, v]) => [k.toLowerCase(), v])) });
  } catch (err) { res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.get('/next/:id', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(`SELECT activity_id, activity_code, activity_name, description, is_mandatory, is_active FROM MST_OnboardingActivity WHERE activity_id > :id ORDER BY activity_id ASC FETCH FIRST 1 ROWS ONLY`, { id: req.params.id }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Last record reached' });
    res.json({ success: true, data: Object.fromEntries(Object.entries(result.rows[0]).map(([k, v]) => [k.toLowerCase(), v])) });
  } catch (err) { res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.get('/previous/:id', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(`SELECT activity_id, activity_code, activity_name, description, is_mandatory, is_active FROM MST_OnboardingActivity WHERE activity_id < :id ORDER BY activity_id DESC FETCH FIRST 1 ROWS ONLY`, { id: req.params.id }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'First record reached' });
    res.json({ success: true, data: Object.fromEntries(Object.entries(result.rows[0]).map(([k, v]) => [k.toLowerCase(), v])) });
  } catch (err) { res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.get('/next-id', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(`SELECT NVL(MAX(activity_id), 0) + 1 AS next_id FROM MST_OnboardingActivity`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json({ success: true, next_id: result.rows[0].NEXT_ID });
  } catch (err) { res.status(500).json({ success: false });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.post('/', async (req, res) => {
  let connection;
  try {
    const { activity_code, activity_name, description, is_mandatory, is_active } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `INSERT INTO MST_OnboardingActivity (activity_code, activity_name, description, is_mandatory, is_active) VALUES (:activity_code, :activity_name, :description, :is_mandatory, :is_active)`,
      { activity_code, activity_name, description: description || null, is_mandatory: Number(is_mandatory), is_active: Number(is_active) }, { autoCommit: true }
    );
    res.status(201).json({ success: true, rowsAffected: result.rowsAffected });
  } catch (err) {
    if (err.errorNum === 1) return res.status(409).json({ success: false, message: 'Code already exists' });
    res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.put('/:id', async (req, res) => {
  let connection;
  try {
    const { activity_code, activity_name, description, is_mandatory, is_active } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `UPDATE MST_OnboardingActivity SET activity_code = :activity_code, activity_name = :activity_name, description = :description, is_mandatory = :is_mandatory, is_active = :is_active WHERE activity_id = :id`,
      { id: req.params.id, activity_code, activity_name, description: description || null, is_mandatory: Number(is_mandatory), is_active: Number(is_active) }, { autoCommit: true }
    );
    res.json({ success: true, rowsAffected: result.rowsAffected });
  } catch (err) {
    if (err.errorNum === 1) return res.status(409).json({ success: false, message: 'Code already exists' });
    res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

module.exports = router;
