const express = require('express');
const cors = require('cors');
const universitiesRouter = require('./routes/universities.routes');
const authRouter = require('./routes/auth.routes');
const companiesRouter = require('./routes/companies.routes');
const drivesRouter = require('./routes/drives.routes');
const applicationsRouter = require('./routes/applications.routes');
const placementsRouter = require('./routes/placements.routes');
const programsRouter = require('./routes/programs.routes');
const universityProgramsRouter = require('./routes/university-programs.routes');
const chatRouter = require('./routes/chat.routes');
const studentsRouter = require('./routes/students.routes');
const demoRouter = require('./routes/demo.routes');
const bugReportsRouter = require('./routes/bug-reports.routes');
const notificationsRouter = require('./routes/notifications.routes');
const companyPortalRouter = require('./routes/company-portal.routes');
const adoptionRequestsRouter = require('./routes/adoption-requests.routes');
const ApiError = require('./lib/ApiError');

const app = express();

// Restricted to the real frontend origins — FRONTEND_URL is the same env var
// already used to build links in outgoing emails, kept as the source of
// truth here too. The literal Vercel URL is also listed directly as a
// fallback in case that env var is ever unset/mistyped on the host. Local
// dev origins are always allowed since there's nothing sensitive to protect
// there. No Origin header at all (server-to-server calls, curl, health
// checks) is allowed through, since CORS only ever matters to browsers.
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://hiresphere-university.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
  })
);
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
app.use('/api/programs', programsRouter);
app.use('/api/university-programs', universityProgramsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/students', studentsRouter);
app.use('/api/demo', demoRouter);
app.use('/api/bug-reports', bugReportsRouter);
app.use('/api/notification-recipients', notificationsRouter);
app.use('/api/company-portal', companyPortalRouter);
app.use('/api/adoption-requests', adoptionRequestsRouter);

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
