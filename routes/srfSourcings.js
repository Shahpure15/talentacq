const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db');

router.get('/', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT sourcing_id, srf_id, channel_id, sourcing_reference, vendor_id, referrer_employee_id, posting_url, TO_CHAR(activation_date, 'YYYY-MM-DD') as activation_date, TO_CHAR(deactivation_date, 'YYYY-MM-DD') as deactivation_date, status FROM TXN_SRF_Sourcing`,
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
      `SELECT sourcing_id, srf_id, channel_id, sourcing_reference, vendor_id, referrer_employee_id, posting_url, TO_CHAR(activation_date, 'YYYY-MM-DD') as activation_date, TO_CHAR(deactivation_date, 'YYYY-MM-DD') as deactivation_date, status FROM TXN_SRF_Sourcing WHERE sourcing_reference = :code`,
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
      `SELECT sourcing_id, srf_id, channel_id, sourcing_reference, vendor_id, referrer_employee_id, posting_url, TO_CHAR(activation_date, 'YYYY-MM-DD') as activation_date, TO_CHAR(deactivation_date, 'YYYY-MM-DD') as deactivation_date, status FROM TXN_SRF_Sourcing WHERE sourcing_id > :id ORDER BY sourcing_id ASC FETCH FIRST 1 ROWS ONLY`,
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
      `SELECT sourcing_id, srf_id, channel_id, sourcing_reference, vendor_id, referrer_employee_id, posting_url, TO_CHAR(activation_date, 'YYYY-MM-DD') as activation_date, TO_CHAR(deactivation_date, 'YYYY-MM-DD') as deactivation_date, status FROM TXN_SRF_Sourcing WHERE sourcing_id < :id ORDER BY sourcing_id DESC FETCH FIRST 1 ROWS ONLY`,
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
    const result = await connection.execute(`SELECT NVL(MAX(sourcing_id), 0) + 1 AS next_id FROM TXN_SRF_Sourcing`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json({ success: true, next_id: result.rows[0].NEXT_ID });
  } catch (err) { res.status(500).json({ success: false });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.post('/', async (req, res) => {
  let connection;
  try {
    const { srf_id, channel_id, sourcing_reference, vendor_id, referrer_employee_id, posting_url, activation_date, deactivation_date, status } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `INSERT INTO TXN_SRF_Sourcing (srf_id, channel_id, sourcing_reference, vendor_id, referrer_employee_id, posting_url, activation_date, deactivation_date, status)
       VALUES (:srf_id, :channel_id, :sourcing_reference, :vendor_id, :referrer_employee_id, :posting_url, TO_DATE(:activation_date, 'YYYY-MM-DD'), TO_DATE(:deactivation_date, 'YYYY-MM-DD'), :status)`,
      {
        srf_id: srf_id || null, channel_id: channel_id || null, sourcing_reference: sourcing_reference || null,
        vendor_id: vendor_id || null, referrer_employee_id: referrer_employee_id || null, posting_url: posting_url || null,
        activation_date: activation_date || null, deactivation_date: deactivation_date || null, status: status || 'Active'
      },
      { autoCommit: true }
    );
    res.status(201).json({ success: true, rowsAffected: result.rowsAffected });
  } catch (err) {
    if (err.errorNum === 1) return res.status(409).json({ success: false, message: 'Reference already exists' });
    res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.put('/:id', async (req, res) => {
  let connection;
  try {
    const { srf_id, channel_id, sourcing_reference, vendor_id, referrer_employee_id, posting_url, activation_date, deactivation_date, status } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `UPDATE TXN_SRF_Sourcing SET srf_id = :srf_id, channel_id = :channel_id, sourcing_reference = :sourcing_reference, vendor_id = :vendor_id, referrer_employee_id = :referrer_employee_id, posting_url = :posting_url, activation_date = TO_DATE(:activation_date, 'YYYY-MM-DD'), deactivation_date = TO_DATE(:deactivation_date, 'YYYY-MM-DD'), status = :status WHERE sourcing_id = :id`,
      {
        id: req.params.id, srf_id: srf_id || null, channel_id: channel_id || null, sourcing_reference: sourcing_reference || null,
        vendor_id: vendor_id || null, referrer_employee_id: referrer_employee_id || null, posting_url: posting_url || null,
        activation_date: activation_date || null, deactivation_date: deactivation_date || null, status: status || 'Active'
      },
      { autoCommit: true }
    );
    res.json({ success: true, rowsAffected: result.rowsAffected });
  } catch (err) {
    if (err.errorNum === 1) return res.status(409).json({ success: false, message: 'Reference already exists' });
    res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

module.exports = router;
