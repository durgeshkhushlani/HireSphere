const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = '7d';

function signToken(payload, options = {}) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN, ...options });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { signToken, verifyToken };
