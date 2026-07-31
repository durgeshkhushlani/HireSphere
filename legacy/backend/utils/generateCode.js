const crypto = require('crypto');

const generateUniversityCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

module.exports = generateUniversityCode;
