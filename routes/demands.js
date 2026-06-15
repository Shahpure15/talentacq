const express = require('express');
const router = express.Router();
const { getConnection } = require('../db');
const oracledb = require('oracledb');

const demandReadOptions = {
  outFormat: oracledb.OUT_FORMAT_OBJECT,
  fetchInfo: {
    REMARKS: { type: oracledb.STRING }
  }
};

function mapRow(row) {
  return {
    demand_id: row.DEMAND_ID,
    demand_code: row.DEMAND_CODE,
    demand_type: row.DEMAND_TYPE,
    raised_by_employee_id: row.RAISED_BY_EMPLOYEE_ID,
    practice_id: row.PRACTICE_ID,
    role_id: row.ROLE_ID,
    number_of_positions: row.NUMBER_OF_POSITIONS,
    priority: row.PRIORITY,
    demand_status: row.DEMAND_STATUS,
    demand_date: row.DEMAND_DATE ? row.DEMAND_DATE.toISOString().slice(0, 10) : null,
    ta_reviewer_id: row.TA_REVIEWER_ID,
    remarks: row.REMARKS
  };
}

function toNullableNumber(value) {
  return value === '' || value === null || value === undefined ? null : Number(value);
}

async function fetchLookupOptions(connection, tableName, idColumn, labelChoices) {
  const metadataResult = await connection.execute(
    `SELECT column_name
     FROM user_tab_columns
     WHERE table_name = :table_name`,
    { table_name: tableName.toUpperCase() },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const availableColumns = new Set(metadataResult.rows.map(row => row.COLUMN_NAME));

  for (const choice of labelChoices) {
    if (Array.isArray(choice)) {
      const [firstColumn, secondColumn] = choice;
      if (availableColumns.has(firstColumn) && availableColumns.has(secondColumn)) {
        return connection.execute(
          `SELECT
             ${idColumn} AS value,
             TRIM(${firstColumn} || ' ' || ${secondColumn}) AS label
           FROM ${tableName}
           ORDER BY 2, 1`,
          [],
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
      }
      continue;
    }

    if (availableColumns.has(choice)) {
      return connection.execute(
        `SELECT
           ${idColumn} AS value,
           ${choice} AS label
         FROM ${tableName}
         ORDER BY 2, 1`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
    }
  }

  return connection.execute(
    `SELECT
       ${idColumn} AS value,
       TO_CHAR(${idColumn}) AS label
     FROM ${tableName}
     ORDER BY 1`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
}

router.get('/lookups', async (req, res) => {
  let connection;

  try {
    connection = await getConnection();

    const employeesResult = await fetchLookupOptions(connection, 'MST_Employee', 'employee_id', [
      'EMPLOYEE_NAME',
      'FULL_NAME',
      'NAME',
      ['FIRST_NAME', 'LAST_NAME'],
      'EMPLOYEE_CODE',
      'CODE'
    ]);

    const practicesResult = await fetchLookupOptions(connection, 'MST_Practice', 'practice_id', [
      'PRACTICE_NAME',
      'NAME',
      'PRACTICE_CODE',
      'CODE'
    ]);

    const rolesResult = await fetchLookupOptions(connection, 'MST_Role', 'role_id', [
      'ROLE_NAME',
      'NAME',
      'ROLE_CODE',
      'CODE'
    ]);

    res.json({
      success: true,
      data: {
        employees: employeesResult.rows,
        practices: practicesResult.rows,
        roles: rolesResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching lookup options:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lookup options',
      error: error.message
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Error closing connection:', closeError.message);
      }
    }
  }
});

router.get('/', async (req, res) => {
  let connection;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT
        demand_id,
        demand_code,
        demand_type,
        raised_by_employee_id,
        practice_id,
        role_id,
        number_of_positions,
        priority,
        demand_status,
        demand_date,
        ta_reviewer_id,
        remarks
       FROM TXN_Demand
       ORDER BY demand_id`,
      [],
      demandReadOptions
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows.map(mapRow)
    });
  } catch (error) {
    console.error('Error fetching demands:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch demands',
      error: error.message
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Error closing connection:', closeError.message);
      }
    }
  }
});

router.get('/code/:demand_code', async (req, res) => {
  let connection;
  const { demand_code } = req.params;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT
        demand_id,
        demand_code,
        demand_type,
        raised_by_employee_id,
        practice_id,
        role_id,
        number_of_positions,
        priority,
        demand_status,
        demand_date,
        ta_reviewer_id,
        remarks
       FROM TXN_Demand
       WHERE UPPER(TRIM(demand_code)) = UPPER(TRIM(:demand_code))`,
      { demand_code },
      demandReadOptions
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No record found with this demand code'
      });
    }

    res.json({
      success: true,
      data: mapRow(result.rows[0])
    });
  } catch (error) {
    console.error('Error fetching demand by code:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch record',
      error: error.message
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Error closing connection:', closeError.message);
      }
    }
  }
});

router.get('/next/:id', async (req, res) => {
  let connection;
  const { id } = req.params;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT
        demand_id,
        demand_code,
        demand_type,
        raised_by_employee_id,
        practice_id,
        role_id,
        number_of_positions,
        priority,
        demand_status,
        demand_date,
        ta_reviewer_id,
        remarks
       FROM TXN_Demand
       WHERE demand_id = (
         SELECT MIN(demand_id)
         FROM TXN_Demand
         WHERE demand_id > :id
       )`,
      { id },
      demandReadOptions
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No next record found — you are at the last entry'
      });
    }

    res.json({
      success: true,
      data: mapRow(result.rows[0])
    });
  } catch (error) {
    console.error('Error fetching next demand:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch next record',
      error: error.message
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Error closing connection:', closeError.message);
      }
    }
  }
});

// ── MST_DemandType routes ──

// GET all custom demand types
router.get('/demand-types', async (req, res) => {
  let connection;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT TYPE_VALUE, TYPE_LABEL FROM MST_DEMANDTYPE ORDER BY TYPE_LABEL`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      success: true,
      data: result.rows.map(row => ({
        TYPE_VALUE: row.TYPE_VALUE,
        TYPE_LABEL: row.TYPE_LABEL
      }))
    });
  } catch (error) {
    console.error('Error fetching demand types:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch demand types',
      error: error.message
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Error closing connection:', closeError.message);
      }
    }
  }
});

// POST add a new custom demand type
router.post('/demand-types', async (req, res) => {
  let connection;
  const { type_value, type_label } = req.body;

  if (!type_value || !type_label) {
    return res.status(400).json({ success: false, message: 'type_value and type_label are required.' });
  }

  try {
    connection = await getConnection();

    await connection.execute(
      `INSERT INTO MST_DEMANDTYPE (TYPE_VALUE, TYPE_LABEL) VALUES (:1, :2)`,
      [type_value, type_label],
      { autoCommit: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error creating demand type:', error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Error closing connection:', closeError.message);
      }
    }
  }
});

router.post('/', async (req, res) => {
  let connection;

  const {
    demand_code,
    demand_type,
    raised_by_employee_id,
    practice_id,
    role_id,
    number_of_positions,
    priority,
    demand_status,
    demand_date,
    ta_reviewer_id,
    remarks
  } = req.body;

  if (!demand_code || !demand_type || !number_of_positions || !priority || !demand_status || !demand_date) {
    return res.status(400).json({
      success: false,
      message: 'demand_code, demand_type, number_of_positions, priority, demand_status and demand_date are all required'
    });
  }

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `INSERT INTO TXN_Demand
        (demand_code, demand_type, raised_by_employee_id, practice_id, role_id,
         number_of_positions, priority, demand_status, demand_date, ta_reviewer_id, remarks)
       VALUES
        (:demand_code, :demand_type, :raised_by_employee_id, :practice_id, :role_id,
         :number_of_positions, :priority, :demand_status, TO_DATE(:demand_date, 'YYYY-MM-DD'), :ta_reviewer_id, :remarks)`,
      {
        demand_code,
        demand_type,
        raised_by_employee_id: toNullableNumber(raised_by_employee_id),
        practice_id: toNullableNumber(practice_id),
        role_id: toNullableNumber(role_id),
        number_of_positions: Number(number_of_positions),
        priority,
        demand_status,
        demand_date,
        ta_reviewer_id: toNullableNumber(ta_reviewer_id),
        remarks: remarks === '' || remarks === undefined ? null : remarks
      },
      { autoCommit: true }
    );

    res.status(201).json({
      success: true,
      message: 'Demand created successfully',
      rowsAffected: result.rowsAffected
    });
  } catch (error) {
    console.error('Error creating demand:', error.message);

    if (error.errorNum === 1) {
      return res.status(409).json({
        success: false,
        message: 'demand_code already exists — it must be unique'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create demand',
      error: error.message
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Error closing connection:', closeError.message);
      }
    }
  }
});

router.put('/:id', async (req, res) => {
  let connection;

  const { id } = req.params;
  const {
    demand_code,
    demand_type,
    raised_by_employee_id,
    practice_id,
    role_id,
    number_of_positions,
    priority,
    demand_status,
    demand_date,
    ta_reviewer_id,
    remarks
  } = req.body;

  if (!demand_code || !demand_type || !number_of_positions || !priority || !demand_status || !demand_date) {
    return res.status(400).json({
      success: false,
      message: 'demand_code, demand_type, number_of_positions, priority, demand_status and demand_date are all required'
    });
  }

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `UPDATE TXN_Demand
       SET demand_code           = :demand_code,
           demand_type           = :demand_type,
           raised_by_employee_id = :raised_by_employee_id,
           practice_id           = :practice_id,
           role_id               = :role_id,
           number_of_positions   = :number_of_positions,
           priority              = :priority,
           demand_status         = :demand_status,
           demand_date           = TO_DATE(:demand_date, 'YYYY-MM-DD'),
           ta_reviewer_id        = :ta_reviewer_id,
           remarks               = :remarks,
           updated_at            = CURRENT_TIMESTAMP
       WHERE demand_id = :id`,
      {
        demand_code,
        demand_type,
        raised_by_employee_id: toNullableNumber(raised_by_employee_id),
        practice_id: toNullableNumber(practice_id),
        role_id: toNullableNumber(role_id),
        number_of_positions: Number(number_of_positions),
        priority,
        demand_status,
        demand_date,
        ta_reviewer_id: toNullableNumber(ta_reviewer_id),
        remarks: remarks === '' || remarks === undefined ? null : remarks,
        id
      },
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({
        success: false,
        message: `No demand found with id ${id}`
      });
    }

    res.json({
      success: true,
      message: `Demand ${id} updated successfully`
    });
  } catch (error) {
    console.error('Error updating demand:', error.message);

    if (error.errorNum === 1) {
      return res.status(409).json({
        success: false,
        message: 'demand_code already exists — it must be unique'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update demand',
      error: error.message
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Error closing connection:', closeError.message);
      }
    }
  }
});

router.delete('/:id', async (req, res) => {
  let connection;
  const { id } = req.params;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `DELETE FROM TXN_Demand WHERE demand_id = :id`,
      { id },
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({
        success: false,
        message: `No demand found with id ${id}`
      });
    }

    res.json({
      success: true,
      message: `Demand ${id} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting demand:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete demand',
      error: error.message
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Error closing connection:', closeError.message);
      }
    }
  }
});

module.exports = router;