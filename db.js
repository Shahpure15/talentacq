const oracledb = require('oracledb');
require('dotenv').config();

async function initializePool() {
  await oracledb.createPool({
    user:          process.env.DB_USER,
    password:      process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECTION_STRING,
    poolMin:       2,
    poolMax:       10,
    poolIncrement: 1,
    poolTimeout:   60
  });
  console.log('Oracle pool created successfully');
}

async function getConnection() {
  return await oracledb.getConnection();
}

module.exports = { initializePool, getConnection };
