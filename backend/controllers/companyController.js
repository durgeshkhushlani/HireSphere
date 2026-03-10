const Company = require('../models/Company');
const Student = require('../models/Student');
const Admin = require('../models/Admin');
const sendEmail = require('../utils/sendEmail');

// POST /api/companies
const createCompany = async (req, res) => {
  try {
    const { name, role, description, formQuestions } = req.body;
    const admin = await Admin.findById(req.user._id);

    const company = await Company.create({
      name,
      role,
      description,
      formQuestions: formQuestions || [],
      createdByAdmin: admin._id,
      universityCode: admin.universityCode,
    });

    // Notify all students in this university pool
    const students = await Student.find({ universityCode: admin.universityCode });
    const studentEmails = students.map((s) => s.email);

    if (studentEmails.length > 0) {
      await sendEmail(
        studentEmails.join(','),
        `New Placement Opportunity: ${name} — ${role}`,
        `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6c63ff;">🎯 New Company Listed on HireSphere!</h2>
          <h3 style="color: #e0e0e0;">${name} — ${role}</h3>
          <p>${description}</p>
          <p style="margin-top: 15px;">Log in to your HireSphere dashboard to apply now!</p>
          <a href="${process.env.CLIENT_URL}" style="display: inline-block; padding: 12px 24px; background: #6c63ff; color: white; text-decoration: none; border-radius: 8px; margin-top: 10px;">Go to Dashboard</a>
          <hr style="margin: 20px 0; border-color: #eee;" />
          <p style="color: #999; font-size: 12px;">This is an automated email from HireSphere. Please do not reply.</p>
        </div>
        `
      );
    }

    res.status(201).json(company);
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/companies  — filtered by universityCode
const getCompanies = async (req, res) => {
  try {
    let universityCode;

    if (req.user.role === 'admin') {
      const admin = await Admin.findById(req.user._id);
      universityCode = admin.universityCode;
    } else {
      const student = await Student.findById(req.user._id);
      universityCode = student.universityCode;
    }

    const companies = await Company.find({ universityCode }).sort({ createdAt: -1 });
    res.json(companies);
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/companies/:id
const getCompanyById = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    res.json(company);
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createCompany, getCompanies, getCompanyById };
