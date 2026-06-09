const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db');

router.get('/', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT srf_id, srf_number, demand_id, role_id, vacancies, min_experience_years, max_experience_years, required_skills, TO_CHAR(target_date, 'YYYY-MM-DD') as target_date, status FROM TXN_SRF`,
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
      `SELECT srf_id, srf_number, demand_id, role_id, vacancies, min_experience_years, max_experience_years, required_skills, TO_CHAR(target_date, 'YYYY-MM-DD') as target_date, status FROM TXN_SRF WHERE srf_number = :code`,
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
      `SELECT srf_id, srf_number, demand_id, role_id, vacancies, min_experience_years, max_experience_years, required_skills, TO_CHAR(target_date, 'YYYY-MM-DD') as target_date, status FROM TXN_SRF WHERE srf_id > :id ORDER BY srf_id ASC FETCH FIRST 1 ROWS ONLY`,
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
      `SELECT srf_id, srf_number, demand_id, role_id, vacancies, min_experience_years, max_experience_years, required_skills, TO_CHAR(target_date, 'YYYY-MM-DD') as target_date, status FROM TXN_SRF WHERE srf_id < :id ORDER BY srf_id DESC FETCH FIRST 1 ROWS ONLY`,
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
    const result = await connection.execute(`SELECT NVL(MAX(srf_id), 0) + 1 AS next_id FROM TXN_SRF`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json({ success: true, next_id: result.rows[0].NEXT_ID });
  } catch (err) { res.status(500).json({ success: false });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.post('/', async (req, res) => {
  let connection;
  try {
    const { srf_number, demand_id, role_id, vacancies, min_experience_years, max_experience_years, required_skills, target_date, status } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `INSERT INTO TXN_SRF (srf_number, demand_id, role_id, vacancies, min_experience_years, max_experience_years, required_skills, target_date, status)
       VALUES (:srf_number, :demand_id, :role_id, :vacancies, :min_experience_years, :max_experience_years, :required_skills, TO_DATE(:target_date, 'YYYY-MM-DD'), :status)`,
      {
        srf_number, demand_id: demand_id || null, role_id: role_id || null,
        vacancies: vacancies ? Number(vacancies) : null,
        min_experience_years: min_experience_years ? Number(min_experience_years) : null,
        max_experience_years: max_experience_years ? Number(max_experience_years) : null,
        required_skills: required_skills || null, target_date: target_date || null,
        status: status || 'Open'
      },
      { autoCommit: true }
    );
    res.status(201).json({ success: true, rowsAffected: result.rowsAffected });
  } catch (err) {
    if (err.errorNum === 1) return res.status(409).json({ success: false, message: 'SRF Number already exists' });
    res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

router.put('/:id', async (req, res) => {
  let connection;
  try {
    const { srf_number, demand_id, role_id, vacancies, min_experience_years, max_experience_years, required_skills, target_date, status } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `UPDATE TXN_SRF SET srf_number = :srf_number, demand_id = :demand_id, role_id = :role_id, vacancies = :vacancies, min_experience_years = :min_experience_years, max_experience_years = :max_experience_years, required_skills = :required_skills, target_date = TO_DATE(:target_date, 'YYYY-MM-DD'), status = :status WHERE srf_id = :id`,
      {
        id: req.params.id, srf_number, demand_id: demand_id || null, role_id: role_id || null,
        vacancies: vacancies ? Number(vacancies) : null,
        min_experience_years: min_experience_years ? Number(min_experience_years) : null,
        max_experience_years: max_experience_years ? Number(max_experience_years) : null,
        required_skills: required_skills || null, target_date: target_date || null,
        status: status || 'Open'
      },
      { autoCommit: true }
    );
    res.json({ success: true, rowsAffected: result.rowsAffected });
  } catch (err) {
    if (err.errorNum === 1) return res.status(409).json({ success: false, message: 'SRF Number already exists' });
    res.status(500).json({ success: false, message: err.message });
  } finally { if (connection) try { await connection.close(); } catch (e) {} }
});

module.exports = router;
