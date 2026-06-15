const express = require('express');
const router = express.Router();
const { getConnection } = require('../db');
const oracledb = require('oracledb');

router.get('/', async (req, res) => {
  let connection;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT
        activity_id,
        activity_code,
        activity_name,
        phase,
        owner_type,
        sla_days,
        is_active
       FROM MST_OnboardingActivity
       ORDER BY activity_id`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const rows = result.rows.map(row => ({
      activity_id: row.ACTIVITY_ID,
      activity_code: row.ACTIVITY_CODE,
      activity_name: row.ACTIVITY_NAME,
      phase: row.PHASE,
      owner_type: row.OWNER_TYPE,
      sla_days: row.SLA_DAYS,
      is_active: row.IS_ACTIVE
    }));

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching onboarding activities:', error.message);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch onboarding activities',
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

router.get('/code/:activity_code', async (req, res) => {
  let connection;
  const { activity_code } = req.params;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT
        activity_id,
        activity_code,
        activity_name,
        phase,
        owner_type,
        sla_days,
        is_active
       FROM MST_OnboardingActivity
       WHERE UPPER(activity_code) = UPPER(:activity_code)`,
      { activity_code },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No record found with this activity code'
      });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        activity_id: row.ACTIVITY_ID,
        activity_code: row.ACTIVITY_CODE,
        activity_name: row.ACTIVITY_NAME,
        phase: row.PHASE,
        owner_type: row.OWNER_TYPE,
        sla_days: row.SLA_DAYS,
        is_active: row.IS_ACTIVE
      }
    });
  } catch (error) {
    console.error('Error fetching by code:', error.message);
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
        activity_id,
        activity_code,
        activity_name,
        phase,
        owner_type,
        sla_days,
        is_active
       FROM MST_OnboardingActivity
       WHERE activity_id = (
         SELECT MIN(activity_id)
         FROM MST_OnboardingActivity
         WHERE activity_id > :id
       )`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No next record found — you are at the last entry'
      });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        activity_id: row.ACTIVITY_ID,
        activity_code: row.ACTIVITY_CODE,
        activity_name: row.ACTIVITY_NAME,
        phase: row.PHASE,
        owner_type: row.OWNER_TYPE,
        sla_days: row.SLA_DAYS,
        is_active: row.IS_ACTIVE
      }
    });
  } catch (error) {
    console.error('Error fetching next record:', error.message);
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

router.post('/', async (req, res) => {
  let connection;

  const { activity_code, activity_name, phase, owner_type, sla_days } = req.body;

  if (!activity_code || !activity_name || !phase || !owner_type) {
    return res.status(400).json({
      success: false,
      message: 'activity_code, activity_name, phase and owner_type are all required'
    });
  }

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `INSERT INTO MST_OnboardingActivity
        (activity_code, activity_name, phase, owner_type, sla_days)
       VALUES
        (:activity_code, :activity_name, :phase, :owner_type, :sla_days)`,
      {
        activity_code,
        activity_name,
        phase,
        owner_type,
        sla_days: sla_days === '' || sla_days === null || sla_days === undefined ? null : Number(sla_days)
      },
      { autoCommit: true }
    );

    res.status(201).json({
      success: true,
      message: 'Onboarding activity created successfully',
      rowsAffected: result.rowsAffected
    });
  } catch (error) {
    console.error('Error creating onboarding activity:', error.message);

    if (error.errorNum === 1) {
      return res.status(409).json({
        success: false,
        message: 'activity_code already exists — it must be unique'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create onboarding activity',
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
  const { activity_code, activity_name, phase, owner_type, sla_days, is_active } = req.body;

  if (!activity_code || !activity_name || !phase || !owner_type || is_active === undefined) {
    return res.status(400).json({
      success: false,
      message: 'activity_code, activity_name, phase, owner_type and is_active are all required'
    });
  }

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `UPDATE MST_OnboardingActivity
       SET activity_code = :activity_code,
           activity_name = :activity_name,
           phase         = :phase,
           owner_type    = :owner_type,
           sla_days      = :sla_days,
           is_active     = :is_active
       WHERE activity_id = :id`,
      {
        activity_code,
        activity_name,
        phase,
        owner_type,
        sla_days: sla_days === '' || sla_days === null || sla_days === undefined ? null : Number(sla_days),
        is_active,
        id
      },
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({
        success: false,
        message: `No onboarding activity found with id ${id}`
      });
    }

    res.json({
      success: true,
      message: `Onboarding activity ${id} updated successfully`
    });
  } catch (error) {
    console.error('Error updating onboarding activity:', error.message);

    if (error.errorNum === 1) {
      return res.status(409).json({
        success: false,
        message: 'activity_code already exists — it must be unique'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update onboarding activity',
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
      `DELETE FROM MST_OnboardingActivity WHERE activity_id = :id`,
      { id },
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({
        success: false,
        message: `No onboarding activity found with id ${id}`
      });
    }

    res.json({
      success: true,
      message: `Onboarding activity ${id} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting onboarding activity:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete onboarding activity',
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