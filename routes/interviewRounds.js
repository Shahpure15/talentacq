const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db');

router.get('/', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(`SELECT round_id, round_code, round_name, is_elimination, is_active FROM MST_InterviewRound`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json({ success: true, data: result.rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase(), v]))) });
  } catch (err) { res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.get('/code/:code', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(`SELECT round_id, round_code, round_name, is_elimination, is_active FROM MST_InterviewRound WHERE round_code = :code`, { code: req.params.code }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: Object.fromEntries(Object.entries(result.rows[0]).map(([k, v]) => [k.toLowerCase(), v])) });
  } catch (err) { res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.get('/next/:id', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(`SELECT round_id, round_code, round_name, is_elimination, is_active FROM MST_InterviewRound WHERE round_id > :id ORDER BY round_id ASC FETCH FIRST 1 ROWS ONLY`, { id: req.params.id }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Last record reached' });
    res.json({ success: true, data: Object.fromEntries(Object.entries(result.rows[0]).map(([k, v]) => [k.toLowerCase(), v])) });
  } catch (err) { res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.get('/previous/:id', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(`SELECT round_id, round_code, round_name, is_elimination, is_active FROM MST_InterviewRound WHERE round_id < :id ORDER BY round_id DESC FETCH FIRST 1 ROWS ONLY`, { id: req.params.id }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'First record reached' });
    res.json({ success: true, data: Object.fromEntries(Object.entries(result.rows[0]).map(([k, v]) => [k.toLowerCase(), v])) });
  } catch (err) { res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.get('/next-id', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(`SELECT NVL(MAX(round_id), 0) + 1 AS next_id FROM MST_InterviewRound`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json({ success: true, next_id: result.rows[0].NEXT_ID });
  } catch (err) { res.status(500).json({ success: false });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.post('/', async (req, res) => {
  let connection;
  try {
    const { round_code, round_name, is_elimination, is_active } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `INSERT INTO MST_InterviewRound (round_code, round_name, is_elimination, is_active) VALUES (:round_code, :round_name, :is_elimination, :is_active)`,
      { round_code, round_name, is_elimination: Number(is_elimination), is_active: Number(is_active) }, { autoCommit: true }
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
    const { round_code, round_name, is_elimination, is_active } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `UPDATE MST_InterviewRound SET round_code = :round_code, round_name = :round_name, is_elimination = :is_elimination, is_active = :is_active WHERE round_id = :id`,
      { id: req.params.id, round_code, round_name, is_elimination: Number(is_elimination), is_active: Number(is_active) }, { autoCommit: true }
    );
    res.json({ success: true, rowsAffected: result.rowsAffected });
  } catch (err) {
    if (err.errorNum === 1) return res.status(409).json({ success: false, message: 'Code already exists' });
    res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

module.exports = router;
