const express = require('express');
const router = express.Router();
const { getConnection } = require('../db');
const oracledb = require('oracledb');

// ─── GET all rejection reasons ────────────────────────────────────────────────

router.get('/', async (req, res) => {
  let connection;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT 
        reason_id,
        reason_code,
        reason_description,
        applicable_stage,
        is_active
       FROM MST_RejectionReason
       ORDER BY reason_id`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

const rows = result.rows.map(row => ({
  reason_id:          row.REASON_ID,
  reason_code:        row.REASON_CODE,
  reason_description: row.REASON_DESCRIPTION,
  applicable_stage:   row.APPLICABLE_STAGE,
  is_active:          row.IS_ACTIVE
}));

res.json({
  success: true,
  count: rows.length,
  data: rows
});

  } catch (error) {
    console.error('Error fetching rejection reasons:', error.message);
    // ↑ log full error on SERVER side for debugging

    res.status(500).json({
      success: false,
      message: 'Failed to fetch rejection reasons',
      error: error.message
      // ↑ only send the plain text message to client
      // never send the whole error object — causes circular JSON crash
    });

  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Error closing connection:', closeError.message);
        // ↑ wrapping close() in its own try/catch is best practice
        // if close() itself throws, we don't want to crash the app
      }
    }
  }
});

// ─── GET single reason by reason_code ────────────────────────────────────────
// URL: GET http://localhost:3000/api/rejection-reasons/code/REJ001

router.get('/code/:reason_code', async (req, res) => {
  let connection;

  const { reason_code } = req.params;
  // Captures reason_code from the URL.
  // If URL is /code/REJ001 → reason_code = "REJ001"

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT 
        reason_id,
        reason_code,
        reason_description,
        applicable_stage,
        is_active
       FROM MST_RejectionReason
       WHERE UPPER(reason_code) = UPPER(:reason_code)`,
      // UPPER() on both sides makes search case-insensitive.
      // REJ001 = rej001 = Rej001 → all match.
      { reason_code },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No record found with this reason code'
      });
      // 404 = Not Found — frontend uses this to know it's a new entry.
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        reason_id:          row.REASON_ID,
        reason_code:        row.REASON_CODE,
        reason_description: row.REASON_DESCRIPTION,
        applicable_stage:   row.APPLICABLE_STAGE,
        is_active:          row.IS_ACTIVE
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

// ─── GET next record after current reason_id ─────────────────────────────────
// URL: GET http://localhost:3000/api/rejection-reasons/next/5

router.get('/next/:id', async (req, res) => {
  let connection;

  const { id } = req.params;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT 
        reason_id,
        reason_code,
        reason_description,
        applicable_stage,
        is_active
       FROM MST_RejectionReason
       WHERE reason_id = (
         SELECT MIN(reason_id) 
         FROM MST_RejectionReason 
         WHERE reason_id > :id
       )`,
      // MIN(reason_id) WHERE reason_id > current → gets the very next record.
      // If no next record exists → inner SELECT returns NULL → outer returns nothing.
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
        reason_id:          row.REASON_ID,
        reason_code:        row.REASON_CODE,
        reason_description: row.REASON_DESCRIPTION,
        applicable_stage:   row.APPLICABLE_STAGE,
        is_active:          row.IS_ACTIVE
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
// ─── POST — Create a new rejection reason ─────────────────────────────────────
// URL: POST http://localhost:3000/api/rejection-reasons
// Body: { "reason_code": "REJ002", "reason_description": "Bad attitude", "applicable_stage": "Interview" }

router.post('/', async (req, res) => {
  let connection;

  const { reason_code, reason_description, applicable_stage } = req.body;
  // Destructuring — pulls these three fields out of req.body.
  // If frontend sends { "reason_code": "REJ002", ... }
  // then reason_code = "REJ002", reason_description = "...", applicable_stage = "..."
  // If removed → we'd have to write req.body.reason_code everywhere → messy.

  // Basic validation — never trust data coming from outside
  if (!reason_code || !reason_description || !applicable_stage) {
    return res.status(400).json({
      success: false,
      message: 'reason_code, reason_description and applicable_stage are all required'
    });
    // status 400 = "Bad Request" — the client sent incomplete data.
    // return here is important — stops the function immediately.
    // Without return → code continues running after sending response → crash.
  }

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `INSERT INTO MST_RejectionReason 
        (reason_code, reason_description, applicable_stage)
       VALUES 
        (:reason_code, :reason_description, :applicable_stage)`,
      // :reason_code, :reason_description, :applicable_stage are BIND VARIABLES.
      // Oracle replaces them with actual values at runtime.
      // This prevents SQL Injection attacks — never concatenate user input into SQL.
      // Example of what NOT to do: "INSERT INTO ... VALUES ('" + reason_code + "')"
      // A hacker could send reason_code = "'; DROP TABLE MST_RejectionReason; --"
      // Bind variables make that impossible.
      {
        reason_code:        reason_code,
        reason_description: reason_description,
        applicable_stage:   applicable_stage
      },
      { autoCommit: true }
      // autoCommit: true means Oracle automatically runs COMMIT after INSERT.
      // Without this → data is inserted but not saved permanently → disappears on disconnect.
      // In SQL*Plus you had to type COMMIT manually — this does it automatically.
    );

    res.status(201).json({
      success: true,
      message: 'Rejection reason created successfully',
      rowsAffected: result.rowsAffected
      // rowsAffected tells us how many rows were inserted — should always be 1.
    });
    // status 201 = "Created" — more specific than 200, means a resource was created.

  } catch (error) {
    console.error('Error creating rejection reason:', error.message);

    // Handle Oracle specific errors
    if (error.errorNum === 1) {
      // ORA-00001 = unique constraint violated → duplicate reason_code
      return res.status(409).json({
        success: false,
        message: 'reason_code already exists — it must be unique'
      });
      // status 409 = "Conflict" — the data conflicts with existing data.
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create rejection reason',
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


// ─── PUT — Update an existing rejection reason ────────────────────────────────
// URL: PUT http://localhost:3000/api/rejection-reasons/1
// Body: { "reason_description": "Updated description", "applicable_stage": "Offer" }

router.put('/:id', async (req, res) => {
  let connection;

  const { id } = req.params;
  // req.params.id captures the :id from the URL.
  // If URL is /api/rejection-reasons/5 → id = "5"

  const { reason_code, reason_description, applicable_stage, is_active } = req.body;

  if (!reason_code || !reason_description || !applicable_stage || is_active === undefined) {
    return res.status(400).json({
      success: false,
      message: 'reason_code, reason_description, applicable_stage and is_active are all required'
    });
  }

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `UPDATE MST_RejectionReason
       SET reason_code        = :reason_code,
           reason_description = :reason_description,
           applicable_stage   = :applicable_stage,
           is_active          = :is_active
       WHERE reason_id = :id`,
      {
        reason_code,
        reason_description,
        applicable_stage,
        is_active,
        id
      },
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({
        success: false,
        message: `No rejection reason found with id ${id}`
      });
      // rowsAffected = 0 means WHERE clause matched nothing → that ID doesn't exist.
      // status 404 = "Not Found".
    }

    res.json({
      success: true,
      message: `Rejection reason ${id} updated successfully`
    });

  } catch (error) {
    console.error('Error updating rejection reason:', error.message);

    if (error.errorNum === 1) {
      return res.status(409).json({
        success: false,
        message: 'reason_code already exists — it must be unique'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update rejection reason',
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


// ─── DELETE — Remove a rejection reason ───────────────────────────────────────
// URL: DELETE http://localhost:3000/api/rejection-reasons/1

router.delete('/:id', async (req, res) => {
  let connection;

  const { id } = req.params;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `DELETE FROM MST_RejectionReason WHERE reason_id = :id`,
      { id },
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({
        success: false,
        message: `No rejection reason found with id ${id}`
      });
    }

    res.json({
      success: true,
      message: `Rejection reason ${id} deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting rejection reason:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete rejection reason',
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