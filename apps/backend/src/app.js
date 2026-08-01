const express = require('express');
const cors = require('cors');
const universitiesRouter = require('./routes/universities.routes');
const authRouter = require('./routes/auth.routes');
const companiesRouter = require('./routes/companies.routes');
const drivesRouter = require('./routes/drives.routes');
const applicationsRouter = require('./routes/applications.routes');
const placementsRouter = require('./routes/placements.routes');
const ApiError = require('./lib/ApiError');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/universities', universitiesRouter);
app.use('/api/auth', authRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/drives', drivesRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/placements', placementsRouter);

// Express 5 forwards rejected promises from async handlers here automatically,
// so controllers don't need their own try/catch.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
