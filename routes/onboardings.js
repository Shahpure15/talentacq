const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db');

router.get('/', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT onboarding_id, candidate_id, offer_id, TO_CHAR(start_date, 'YYYY-MM-DD') as start_date, TO_CHAR(expected_completion_date, 'YYYY-MM-DD') as expected_completion_date, status FROM TXN_Onboarding`,
      [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json({ success: true, data: result.rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase(), v]))) });
  } catch (err) { res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.post('/', async (req, res) => {
  let connection;
  try {
    const { candidate_id, offer_id, start_date, expected_completion_date, status } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `INSERT INTO TXN_Onboarding (candidate_id, offer_id, start_date, expected_completion_date, status)
       VALUES (:candidate_id, :offer_id, TO_DATE(:start_date, 'YYYY-MM-DD'), TO_DATE(:expected_completion_date, 'YYYY-MM-DD'), :status)`,
      {
        candidate_id, offer_id: offer_id || null, start_date: start_date || null,
        expected_completion_date: expected_completion_date || null, status: status || 'In Progress'
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
    const { candidate_id, offer_id, start_date, expected_completion_date, status } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `UPDATE TXN_Onboarding SET candidate_id = :candidate_id, offer_id = :offer_id, start_date = TO_DATE(:start_date, 'YYYY-MM-DD'), expected_completion_date = TO_DATE(:expected_completion_date, 'YYYY-MM-DD'), status = :status WHERE onboarding_id = :id`,
      {
        id: req.params.id, candidate_id, offer_id: offer_id || null, start_date: start_date || null,
        expected_completion_date: expected_completion_date || null, status: status || 'In Progress'
      },
      { autoCommit: true }
    );
    res.json({ success: true, rowsAffected: result.rowsAffected });
  } catch (err) { res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

module.exports = router;
