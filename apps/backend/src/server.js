require('dotenv').config();

const app = require('./app');
const { startResumeDispatcher } = require('./jobs/resumeDispatcher');
const { startAutoCloseDispatcher } = require('./jobs/autoCloseDispatcher');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`HireSphere API listening on port ${PORT}`);
});

startResumeDispatcher();
startAutoCloseDispatcher();
