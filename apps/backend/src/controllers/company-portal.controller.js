const companyPortalService = require('../services/company-portal.service');

async function login(req, res) {
  const session = await companyPortalService.login(req.body);
  res.json(session);
}

module.exports = { login };
