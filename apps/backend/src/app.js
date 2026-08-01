const express = require('express');
const cors = require('cors');
const universitiesRouter = require('./routes/universities.routes');
const authRouter = require('./routes/auth.routes');
const companiesRouter = require('./routes/companies.routes');
const drivesRouter = require('./routes/drives.routes');
const applicationsRouter = require('./routes/applications.routes');

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

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
