const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db');

router.get('/', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT candidate_id, candidate_code, first_name, last_name, email, phone, resume_url, current_employer, current_ctc, expected_ctc, notice_period_days, source_type, status FROM TXN_Candidate`,
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
      `SELECT candidate_id, candidate_code, first_name, last_name, email, phone, resume_url, current_employer, current_ctc, expected_ctc, notice_period_days, source_type, status FROM TXN_Candidate WHERE candidate_code = :code`,
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
      `SELECT candidate_id, candidate_code, first_name, last_name, email, phone, resume_url, current_employer, current_ctc, expected_ctc, notice_period_days, source_type, status FROM TXN_Candidate WHERE candidate_id > :id ORDER BY candidate_id ASC FETCH FIRST 1 ROWS ONLY`,
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
      `SELECT candidate_id, candidate_code, first_name, last_name, email, phone, resume_url, current_employer, current_ctc, expected_ctc, notice_period_days, source_type, status FROM TXN_Candidate WHERE candidate_id < :id ORDER BY candidate_id DESC FETCH FIRST 1 ROWS ONLY`,
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
    const result = await connection.execute(`SELECT NVL(MAX(candidate_id), 0) + 1 AS next_id FROM TXN_Candidate`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json({ success: true, next_id: result.rows[0].NEXT_ID });
  } catch (err) { res.status(500).json({ success: false });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.post('/', async (req, res) => {
  let connection;
  try {
    const { candidate_code, first_name, last_name, email, phone, resume_url, current_employer, current_ctc, expected_ctc, notice_period_days, source_type, status } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `INSERT INTO TXN_Candidate (candidate_code, first_name, last_name, email, phone, resume_url, current_employer, current_ctc, expected_ctc, notice_period_days, source_type, status)
       VALUES (:candidate_code, :first_name, :last_name, :email, :phone, :resume_url, :current_employer, :current_ctc, :expected_ctc, :notice_period_days, :source_type, :status)`,
      {
        candidate_code, first_name, last_name: last_name || null, email: email || null, phone: phone || null, resume_url: resume_url || null,
        current_employer: current_employer || null, current_ctc: current_ctc ? Number(current_ctc) : null,
        expected_ctc: expected_ctc ? Number(expected_ctc) : null, notice_period_days: notice_period_days ? Number(notice_period_days) : null,
        source_type: source_type || null, status: status || 'Active'
      },
      { autoCommit: true }
    );
    res.status(201).json({ success: true, rowsAffected: result.rowsAffected });
  } catch (err) {
    if (err.errorNum === 1) return res.status(409).json({ success: false, message: 'Candidate Code already exists' });
    res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.put('/:id', async (req, res) => {
  let connection;
  try {
    const { candidate_code, first_name, last_name, email, phone, resume_url, current_employer, current_ctc, expected_ctc, notice_period_days, source_type, status } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `UPDATE TXN_Candidate SET candidate_code = :candidate_code, first_name = :first_name, last_name = :last_name, email = :email, phone = :phone, resume_url = :resume_url, current_employer = :current_employer, current_ctc = :current_ctc, expected_ctc = :expected_ctc, notice_period_days = :notice_period_days, source_type = :source_type, status = :status WHERE candidate_id = :id`,
      {
        id: req.params.id, candidate_code, first_name, last_name: last_name || null, email: email || null, phone: phone || null, resume_url: resume_url || null,
        current_employer: current_employer || null, current_ctc: current_ctc ? Number(current_ctc) : null,
        expected_ctc: expected_ctc ? Number(expected_ctc) : null, notice_period_days: notice_period_days ? Number(notice_period_days) : null,
        source_type: source_type || null, status: status || 'Active'
      },
      { autoCommit: true }
    );
    res.json({ success: true, rowsAffected: result.rowsAffected });
  } catch (err) {
    if (err.errorNum === 1) return res.status(409).json({ success: false, message: 'Candidate Code already exists' });
    res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

module.exports = router;
