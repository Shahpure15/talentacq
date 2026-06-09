const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db');

router.get('/', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT demand_id, demand_code, TO_CHAR(demand_date, 'YYYY-MM-DD') as demand_date, practice_id, demand_type_id, grade_id, position_count, TO_CHAR(target_date, 'YYYY-MM-DD') as target_date, status FROM TXN_Demand`,
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
      `SELECT demand_id, demand_code, TO_CHAR(demand_date, 'YYYY-MM-DD') as demand_date, practice_id, demand_type_id, grade_id, position_count, TO_CHAR(target_date, 'YYYY-MM-DD') as target_date, status FROM TXN_Demand WHERE demand_code = :code`,
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
      `SELECT demand_id, demand_code, TO_CHAR(demand_date, 'YYYY-MM-DD') as demand_date, practice_id, demand_type_id, grade_id, position_count, TO_CHAR(target_date, 'YYYY-MM-DD') as target_date, status FROM TXN_Demand WHERE demand_id > :id ORDER BY demand_id ASC FETCH FIRST 1 ROWS ONLY`,
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
      `SELECT demand_id, demand_code, TO_CHAR(demand_date, 'YYYY-MM-DD') as demand_date, practice_id, demand_type_id, grade_id, position_count, TO_CHAR(target_date, 'YYYY-MM-DD') as target_date, status FROM TXN_Demand WHERE demand_id < :id ORDER BY demand_id DESC FETCH FIRST 1 ROWS ONLY`,
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
    const result = await connection.execute(`SELECT NVL(MAX(demand_id), 0) + 1 AS next_id FROM TXN_Demand`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json({ success: true, next_id: result.rows[0].NEXT_ID });
  } catch (err) { res.status(500).json({ success: false });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.post('/', async (req, res) => {
  let connection;
  try {
    const { demand_code, demand_date, practice_id, demand_type_id, grade_id, position_count, target_date, status } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `INSERT INTO TXN_Demand (demand_code, demand_date, practice_id, demand_type_id, grade_id, position_count, target_date, status)
       VALUES (:demand_code, TO_DATE(:demand_date, 'YYYY-MM-DD'), :practice_id, :demand_type_id, :grade_id, :position_count, TO_DATE(:target_date, 'YYYY-MM-DD'), :status)`,
      {
        demand_code, demand_date: demand_date || null,
        practice_id: practice_id || null, demand_type_id: demand_type_id || null, grade_id: grade_id || null,
        position_count: position_count ? Number(position_count) : null, target_date: target_date || null,
        status: status || 'Open'
      },
      { autoCommit: true }
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
    const { demand_code, demand_date, practice_id, demand_type_id, grade_id, position_count, target_date, status } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `UPDATE TXN_Demand SET demand_code = :demand_code, demand_date = TO_DATE(:demand_date, 'YYYY-MM-DD'), practice_id = :practice_id, demand_type_id = :demand_type_id, grade_id = :grade_id, position_count = :position_count, target_date = TO_DATE(:target_date, 'YYYY-MM-DD'), status = :status WHERE demand_id = :id`,
      {
        id: req.params.id, demand_code, demand_date: demand_date || null,
        practice_id: practice_id || null, demand_type_id: demand_type_id || null, grade_id: grade_id || null,
        position_count: position_count ? Number(position_count) : null, target_date: target_date || null,
        status: status || 'Open'
      },
      { autoCommit: true }
    );
    res.json({ success: true, rowsAffected: result.rowsAffected });
  } catch (err) {
    if (err.errorNum === 1) return res.status(409).json({ success: false, message: 'Code already exists' });
    res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

module.exports = router;
