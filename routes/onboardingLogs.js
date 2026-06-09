const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db');

router.get('/', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT log_id, onboarding_id, activity_id, assigned_to_employee_id, status, TO_CHAR(completion_date, 'YYYY-MM-DD') as completion_date, remarks FROM TXN_OnboardingActivityLog`,
      [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json({ success: true, data: result.rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase(), v]))) });
  } catch (err) { res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.post('/', async (req, res) => {
  let connection;
  try {
    const { onboarding_id, activity_id, assigned_to_employee_id, status, completion_date, remarks } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `INSERT INTO TXN_OnboardingActivityLog (onboarding_id, activity_id, assigned_to_employee_id, status, completion_date, remarks)
       VALUES (:onboarding_id, :activity_id, :assigned_to_employee_id, :status, TO_DATE(:completion_date, 'YYYY-MM-DD'), :remarks)`,
      {
        onboarding_id, activity_id, assigned_to_employee_id: assigned_to_employee_id || null,
        status: status || 'Pending', completion_date: completion_date || null, remarks: remarks || null
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
    const { onboarding_id, activity_id, assigned_to_employee_id, status, completion_date, remarks } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `UPDATE TXN_OnboardingActivityLog SET onboarding_id = :onboarding_id, activity_id = :activity_id, assigned_to_employee_id = :assigned_to_employee_id, status = :status, completion_date = TO_DATE(:completion_date, 'YYYY-MM-DD'), remarks = :remarks WHERE log_id = :id`,
      {
        id: req.params.id, onboarding_id, activity_id, assigned_to_employee_id: assigned_to_employee_id || null,
        status: status || 'Pending', completion_date: completion_date || null, remarks: remarks || null
      },
      { autoCommit: true }
    );
    res.json({ success: true, rowsAffected: result.rowsAffected });
  } catch (err) { res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

module.exports = router;
