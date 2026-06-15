const express = require('express');
const router = express.Router();
const { getConnection } = require('../db');
const oracledb = require('oracledb');

// ─── HELPER: safely read CLOB or string ──────────────────────
async function readClob(val) {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val.getData) {
    return await val.getData();
  }
  return String(val);
}

// ─── HELPER: safely convert a row with possible CLOBs ────────
async function safeRow(row) {
  if (!row) return null;
  const clean = {};
  for (const key of Object.keys(row)) {
    clean[key] = await readClob(row[key]);
  }
  return clean;
}

// ─── DROPDOWNS ───────────────────────────────────────────────

router.get('/dropdowns', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();

    const [demands, roles, grades, practices, employees] = await Promise.all([
      connection.execute(
        `SELECT demand_id, demand_code FROM TXN_Demand ORDER BY demand_code`,
        [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
      ),
      connection.execute(
        `SELECT role_id, role_title FROM MST_Role WHERE is_active = 1 ORDER BY role_title`,
        [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
      ),
      connection.execute(
        `SELECT grade_id, grade_name FROM MST_Grade WHERE is_active = 1 ORDER BY grade_name`,
        [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
      ),
      connection.execute(
        `SELECT practice_id, practice_name FROM MST_Practice WHERE is_active = 1 ORDER BY practice_name`,
        [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
      ),
      connection.execute(
        `SELECT employee_id, first_name || ' ' || last_name AS full_name
         FROM MST_Employee WHERE is_active = 1 ORDER BY first_name`,
        [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    ]);

    res.status(200).json({
      success: true,
      data: {
        demands:   demands.rows,
        roles:     roles.rows,
        grades:    grades.rows,
        practices: practices.rows,
        employees: employees.rows
      }
    });

  } catch (err) {
    console.error('❌ dropdowns error:', err.message);
    res.status(500).json({ success: false, message: String(err.message || err) });
  } finally {
    if (connection) await connection.close();
  }
});

// ─── GET BY CODE ─────────────────────────────────────────────

router.get('/code/:code', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT * FROM TXN_SRF WHERE UPPER(srf_code) = UPPER(:code)`,
      { code: req.params.code },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'SRF not found' });
    }
    const row = await safeRow(result.rows[0]);
    res.status(200).json({ success: true, data: row });
  } catch (err) {
    console.error('❌ getByCode error:', err.message);
    res.status(500).json({ success: false, message: String(err.message || err) });
  } finally {
    if (connection) await connection.close();
  }
});

// ─── GET NEXT ────────────────────────────────────────────────

router.get('/next/:id', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT * FROM TXN_SRF WHERE srf_id > :id ORDER BY srf_id ASC FETCH FIRST 1 ROWS ONLY`,
      { id: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No next record' });
    }
    const row = await safeRow(result.rows[0]);
    res.status(200).json({ success: true, data: row });
  } catch (err) {
    console.error('❌ getNext error:', err.message);
    res.status(500).json({ success: false, message: String(err.message || err) });
  } finally {
    if (connection) await connection.close();
  }
});

// ─── GET PREV ────────────────────────────────────────────────

router.get('/prev/:id', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT * FROM TXN_SRF WHERE srf_id < :id ORDER BY srf_id DESC FETCH FIRST 1 ROWS ONLY`,
      { id: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No previous record' });
    }
    const row = await safeRow(result.rows[0]);
    res.status(200).json({ success: true, data: row });
  } catch (err) {
    console.error('❌ getPrev error:', err.message);
    res.status(500).json({ success: false, message: String(err.message || err) });
  } finally {
    if (connection) await connection.close();
  }
});
// ─── GET ALL ─────────────────────────────────────────────────

router.get('/', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT * FROM TXN_SRF ORDER BY srf_id`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const rows = await Promise.all(result.rows.map(safeRow));
    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('❌ getAll error:', err.message);
    res.status(500).json({ success: false, message: String(err.message || err) });
  } finally {
    if (connection) await connection.close();
  }
});

// ─── GET BY ID ───────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT * FROM TXN_SRF WHERE srf_id = :id`,
      { id: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'SRF not found' });
    }
    const row = await safeRow(result.rows[0]);
    res.status(200).json({ success: true, data: row });
  } catch (err) {
    console.error('❌ getById error:', err.message);
    res.status(500).json({ success: false, message: String(err.message || err) });
  } finally {
    if (connection) await connection.close();
  }
});

// ─── POST CREATE ─────────────────────────────────────────────

router.post('/', async (req, res) => {
  let connection;
  const {
    srf_code, demand_id, role_id, grade_id, practice_id,
    hiring_manager_id, budget_min, budget_max, currency_code,
    target_join_date, number_of_positions, key_skills,
    srf_status, approval_date, ta_owner_id
  } = req.body;

  if (!srf_code)            return res.status(400).json({ success: false, message: 'SRF Code is required' });
  if (!target_join_date)    return res.status(400).json({ success: false, message: 'Target Join Date is required' });
  if (!number_of_positions) return res.status(400).json({ success: false, message: 'Number of Positions is required' });
  if (!srf_status)          return res.status(400).json({ success: false, message: 'SRF Status is required' });

  try {
    connection = await getConnection();
    await connection.execute(
      `INSERT INTO TXN_SRF (
        srf_code, demand_id, role_id, grade_id, practice_id,
        hiring_manager_id, budget_min, budget_max, currency_code,
        target_join_date, number_of_positions, key_skills,
        srf_status, approval_date, ta_owner_id
      ) VALUES (
        :srf_code, :demand_id, :role_id, :grade_id, :practice_id,
        :hiring_manager_id, :budget_min, :budget_max, :currency_code,
        TO_DATE(:target_join_date, 'YYYY-MM-DD'), :number_of_positions,
        :key_skills, :srf_status,
        TO_DATE(:approval_date, 'YYYY-MM-DD'), :ta_owner_id
      )`,
      {
        srf_code,
        demand_id:          demand_id         || null,
        role_id:            role_id           || null,
        grade_id:           grade_id          || null,
        practice_id:        practice_id       || null,
        hiring_manager_id:  hiring_manager_id || null,
        budget_min:         budget_min        || null,
        budget_max:         budget_max        || null,
        currency_code:      currency_code     || 'INR',
        target_join_date,
        number_of_positions: Number(number_of_positions),
        key_skills:         key_skills        || null,
        srf_status,
        approval_date:      approval_date     || null,
        ta_owner_id:        ta_owner_id       || null
      },
      { autoCommit: true }
    );
    res.status(201).json({ success: true, message: 'SRF created successfully' });
  } catch (err) {
    console.error('❌ createSRF error:', err.message);
    res.status(500).json({ success: false, message: String(err.message || err) });
  } finally {
    if (connection) await connection.close();
  }
});

// ─── PUT UPDATE ──────────────────────────────────────────────

router.put('/:id', async (req, res) => {
  let connection;
  const {
    srf_code, demand_id, role_id, grade_id, practice_id,
    hiring_manager_id, budget_min, budget_max, currency_code,
    target_join_date, number_of_positions, key_skills,
    srf_status, approval_date, ta_owner_id
  } = req.body;

  try {
    connection = await getConnection();
    await connection.execute(
      `UPDATE TXN_SRF SET
        srf_code            = :srf_code,
        demand_id           = :demand_id,
        role_id             = :role_id,
        grade_id            = :grade_id,
        practice_id         = :practice_id,
        hiring_manager_id   = :hiring_manager_id,
        budget_min          = :budget_min,
        budget_max          = :budget_max,
        currency_code       = :currency_code,
        target_join_date    = TO_DATE(:target_join_date, 'YYYY-MM-DD'),
        number_of_positions = :number_of_positions,
        key_skills          = :key_skills,
        srf_status          = :srf_status,
        approval_date       = TO_DATE(:approval_date, 'YYYY-MM-DD'),
        ta_owner_id         = :ta_owner_id,
        updated_at          = CURRENT_TIMESTAMP
       WHERE srf_id = :id`,
      {
        srf_code,
        demand_id:           demand_id         || null,
        role_id:             role_id           || null,
        grade_id:            grade_id          || null,
        practice_id:         practice_id       || null,
        hiring_manager_id:   hiring_manager_id || null,
        budget_min:          budget_min        || null,
        budget_max:          budget_max        || null,
        currency_code:       currency_code     || 'INR',
        target_join_date,
        number_of_positions: Number(number_of_positions),
        key_skills:          key_skills        || null,
        srf_status,
        approval_date:       approval_date     || null,
        ta_owner_id:         ta_owner_id       || null,
        id:                  req.params.id
      },
      { autoCommit: true }
    );
    res.status(200).json({ success: true, message: 'SRF updated successfully' });
  } catch (err) {
    console.error('❌ updateSRF error:', err.message);
    res.status(500).json({ success: false, message: String(err.message || err) });
  } finally {
    if (connection) await connection.close();
  }
});

// ─── DELETE ──────────────────────────────────────────────────

router.delete('/:id', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(
      `DELETE FROM TXN_SRF WHERE srf_id = :id`,
      { id: req.params.id },
      { autoCommit: true }
    );
    res.status(200).json({ success: true, message: 'SRF deleted successfully' });
  } catch (err) {
    console.error('❌ deleteSRF error:', err.message);
    res.status(500).json({ success: false, message: String(err.message || err) });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;