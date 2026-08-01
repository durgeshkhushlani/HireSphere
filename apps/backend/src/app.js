const express = require('express');
const cors = require('cors');
const universitiesRouter = require('./routes/universities.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/universities', universitiesRouter);

module.exports = app;
