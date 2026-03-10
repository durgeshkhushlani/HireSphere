const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middlewares/authMiddleware');
const { createCompany, getCompanies, getCompanyById } = require('../controllers/companyController');

router.use(protect);

router.post('/', requireRole('admin'), createCompany);
router.get('/', getCompanies);
router.get('/:id', getCompanyById);

module.exports = router;
