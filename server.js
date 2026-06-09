const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const { initializePool } = require('./db');
const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Master Tables
app.use('/api/grades',                require('./routes/grades'));
app.use('/api/practices',             require('./routes/practices'));
app.use('/api/roles',                 require('./routes/roles'));
app.use('/api/employees',             require('./routes/employees'));
app.use('/api/vendors',               require('./routes/vendors'));
app.use('/api/sourcing-channels',     require('./routes/sourcingChannels'));
app.use('/api/demand-types',          require('./routes/demandTypes'));
app.use('/api/interview-rounds',      require('./routes/interviewRounds'));
app.use('/api/rejection-reasons',     require('./routes/rejectionReasons'));
app.use('/api/onboarding-activities', require('./routes/onboardingActivities'));

// Transaction Tables
app.use('/api/demands',               require('./routes/demands'));
app.use('/api/srfs',                  require('./routes/srfs'));
app.use('/api/srf-sourcings',         require('./routes/srfSourcings'));
app.use('/api/candidates',            require('./routes/candidates'));
app.use('/api/applications',          require('./routes/applications'));
app.use('/api/interviews',            require('./routes/interviews'));
app.use('/api/offers',                require('./routes/offers'));
app.use('/api/onboardings',           require('./routes/onboardings'));
app.use('/api/onboarding-logs',       require('./routes/onboardingLogs'));

app.get('/health', (req, res) => {
  res.json({ status: 'running', timestamp: new Date() });
});

async function startServer() {
  try {
    await initializePool();
    app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}
startServer();
