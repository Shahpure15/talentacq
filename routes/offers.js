const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db');

router.get('/', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT offer_id, application_id, TO_CHAR(offer_date, 'YYYY-MM-DD') as offer_date, offered_ctc, TO_CHAR(joining_date, 'YYYY-MM-DD') as joining_date, status, TO_CHAR(valid_till, 'YYYY-MM-DD') as valid_till FROM TXN_Offer`,
      [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json({ success: true, data: result.rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase(), v]))) });
  } catch (err) { res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.post('/', async (req, res) => {
  let connection;
  try {
    const { application_id, offer_date, offered_ctc, joining_date, status, valid_till } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `INSERT INTO TXN_Offer (application_id, offer_date, offered_ctc, joining_date, status, valid_till)
       VALUES (:application_id, TO_DATE(:offer_date, 'YYYY-MM-DD'), :offered_ctc, TO_DATE(:joining_date, 'YYYY-MM-DD'), :status, TO_DATE(:valid_till, 'YYYY-MM-DD'))`,
      {
        application_id, offer_date: offer_date || null, offered_ctc: offered_ctc ? Number(offered_ctc) : null,
        joining_date: joining_date || null, status: status || 'Pending', valid_till: valid_till || null
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
    const { application_id, offer_date, offered_ctc, joining_date, status, valid_till } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `UPDATE TXN_Offer SET application_id = :application_id, offer_date = TO_DATE(:offer_date, 'YYYY-MM-DD'), offered_ctc = :offered_ctc, joining_date = TO_DATE(:joining_date, 'YYYY-MM-DD'), status = :status, valid_till = TO_DATE(:valid_till, 'YYYY-MM-DD') WHERE offer_id = :id`,
      {
        id: req.params.id, application_id, offer_date: offer_date || null, offered_ctc: offered_ctc ? Number(offered_ctc) : null,
        joining_date: joining_date || null, status: status || 'Pending', valid_till: valid_till || null
      },
      { autoCommit: true }
    );
    res.json({ success: true, rowsAffected: result.rowsAffected });
  } catch (err) { res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

module.exports = router;
