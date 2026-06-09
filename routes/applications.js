const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db');

router.get('/', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT application_id, application_code, candidate_id, srf_id, TO_CHAR(application_date, 'YYYY-MM-DD') as application_date, current_stage, resume_parsed_score, recruiter_comments, status FROM TXN_Application`,
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
      `SELECT application_id, application_code, candidate_id, srf_id, TO_CHAR(application_date, 'YYYY-MM-DD') as application_date, current_stage, resume_parsed_score, recruiter_comments, status FROM TXN_Application WHERE application_code = :code`,
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
      `SELECT application_id, application_code, candidate_id, srf_id, TO_CHAR(application_date, 'YYYY-MM-DD') as application_date, current_stage, resume_parsed_score, recruiter_comments, status FROM TXN_Application WHERE application_id > :id ORDER BY application_id ASC FETCH FIRST 1 ROWS ONLY`,
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
      `SELECT application_id, application_code, candidate_id, srf_id, TO_CHAR(application_date, 'YYYY-MM-DD') as application_date, current_stage, resume_parsed_score, recruiter_comments, status FROM TXN_Application WHERE application_id < :id ORDER BY application_id DESC FETCH FIRST 1 ROWS ONLY`,
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
    const result = await connection.execute(`SELECT NVL(MAX(application_id), 0) + 1 AS next_id FROM TXN_Application`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json({ success: true, next_id: result.rows[0].NEXT_ID });
  } catch (err) { res.status(500).json({ success: false });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.post('/', async (req, res) => {
  let connection;
  try {
    const { application_code, candidate_id, srf_id, application_date, current_stage, resume_parsed_score, recruiter_comments, status } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `INSERT INTO TXN_Application (application_code, candidate_id, srf_id, application_date, current_stage, resume_parsed_score, recruiter_comments, status)
       VALUES (:application_code, :candidate_id, :srf_id, TO_DATE(:application_date, 'YYYY-MM-DD'), :current_stage, :resume_parsed_score, :recruiter_comments, :status)`,
      {
        application_code, candidate_id: candidate_id || null, srf_id: srf_id || null,
        application_date: application_date || null, current_stage: current_stage || null,
        resume_parsed_score: resume_parsed_score ? Number(resume_parsed_score) : null,
        recruiter_comments: recruiter_comments || null, status: status || 'Applied'
      },
      { autoCommit: true }
    );
    res.status(201).json({ success: true, rowsAffected: result.rowsAffected });
  } catch (err) {
    if (err.errorNum === 1) return res.status(409).json({ success: false, message: 'Application Code already exists' });
    res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.put('/:id', async (req, res) => {
  let connection;
  try {
    const { application_code, candidate_id, srf_id, application_date, current_stage, resume_parsed_score, recruiter_comments, status } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `UPDATE TXN_Application SET application_code = :application_code, candidate_id = :candidate_id, srf_id = :srf_id, application_date = TO_DATE(:application_date, 'YYYY-MM-DD'), current_stage = :current_stage, resume_parsed_score = :resume_parsed_score, recruiter_comments = :recruiter_comments, status = :status WHERE application_id = :id`,
      {
        id: req.params.id, application_code, candidate_id: candidate_id || null, srf_id: srf_id || null,
        application_date: application_date || null, current_stage: current_stage || null,
        resume_parsed_score: resume_parsed_score ? Number(resume_parsed_score) : null,
        recruiter_comments: recruiter_comments || null, status: status || 'Applied'
      },
      { autoCommit: true }
    );
    res.json({ success: true, rowsAffected: result.rowsAffected });
  } catch (err) {
    if (err.errorNum === 1) return res.status(409).json({ success: false, message: 'Application Code already exists' });
    res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

module.exports = router;
