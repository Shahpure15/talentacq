const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db');

router.get('/', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT interview_id, application_id, round_id, interviewer_employee_id, TO_CHAR(interview_date, 'YYYY-MM-DD"T"HH24:MI') as interview_date, status, score, feedback FROM TXN_Interview`,
      [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json({ success: true, data: result.rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase(), v]))) });
  } catch (err) { res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.get('/application/:appId', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT interview_id, application_id, round_id, interviewer_employee_id, TO_CHAR(interview_date, 'YYYY-MM-DD"T"HH24:MI') as interview_date, status, score, feedback FROM TXN_Interview WHERE application_id = :appId`,
      { appId: req.params.appId }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json({ success: true, data: result.rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase(), v]))) });
  } catch (err) { res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.post('/', async (req, res) => {
  let connection;
  try {
    const { application_id, round_id, interviewer_employee_id, interview_date, status, score, feedback } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `INSERT INTO TXN_Interview (application_id, round_id, interviewer_employee_id, interview_date, status, score, feedback)
       VALUES (:application_id, :round_id, :interviewer_employee_id, TO_TIMESTAMP(:interview_date, 'YYYY-MM-DD"T"HH24:MI'), :status, :score, :feedback)`,
      {
        application_id, round_id, interviewer_employee_id: interviewer_employee_id || null,
        interview_date: interview_date || null, status: status || 'Scheduled',
        score: score ? Number(score) : null, feedback: feedback || null
      },
      { autoCommit: true }
    );
    res.status(201).json({ success: true, rowsAffected: result.rowsAffected });
  } catch (err) { res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.put('/:id', async (req, res) => {
  let connection;
  try {
    const { application_id, round_id, interviewer_employee_id, interview_date, status, score, feedback } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `UPDATE TXN_Interview SET application_id = :application_id, round_id = :round_id, interviewer_employee_id = :interviewer_employee_id, interview_date = TO_TIMESTAMP(:interview_date, 'YYYY-MM-DD"T"HH24:MI'), status = :status, score = :score, feedback = :feedback WHERE interview_id = :id`,
      {
        id: req.params.id, application_id, round_id, interviewer_employee_id: interviewer_employee_id || null,
        interview_date: interview_date || null, status: status || 'Scheduled',
        score: score ? Number(score) : null, feedback: feedback || null
      },
      { autoCommit: true }
    );
    res.json({ success: true, rowsAffected: result.rowsAffected });
  } catch (err) { res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

module.exports = router;
