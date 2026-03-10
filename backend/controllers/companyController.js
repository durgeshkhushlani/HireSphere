const Company = require('../models/Company');
const Student = require('../models/Student');
const Admin = require('../models/Admin');
const sendEmail = require('../utils/sendEmail');

// POST /api/companies
const createCompany = async (req, res) => {
  try {
    const { name, role, description, formQuestions, lastDate } = req.body;
    const admin = await Admin.findById(req.user._id);

    const company = await Company.create({
      name,
      role,
      description,
      lastDate,
      formQuestions: formQuestions || [],
      createdByAdmin: admin._id,
      universityCode: admin.universityCode,
    });

    // Notify all students in this university pool
    const students = await Student.find({ universityCode: admin.universityCode });
    const studentEmails = students.map((s) => s.email);

    if (studentEmails.length > 0) {
      const formattedDate = new Date(lastDate).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      });

      await sendEmail(
        studentEmails.join(','),
        `New Placement Opportunity — ${name}`,
        `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 30px; background: #1a1a2e; border-radius: 12px;">
          <h2 style="color: #a78bfa; margin: 0 0 10px;">New Company Listed on HireSphere</h2>
          <p style="color: #e2e8f0; font-size: 15px; margin: 0 0 6px;"><strong>${name}</strong> is hiring for the role of <strong>${role}</strong>.</p>
          <p style="color: #f87171; font-size: 14px; margin: 0 0 20px;">📅 Last date to apply: <strong>${formattedDate}</strong></p>
          <p style="color: #94a3b8; font-size: 14px; margin: 0 0 20px;">Log in to your dashboard to view details and apply before the deadline.</p>
          <a href="${process.env.CLIENT_URL}" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #7c3aed, #a78bfa); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Open Dashboard</a>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #2d2d4a;" />
          <p style="color: #64748b; font-size: 11px; margin: 0;">This is an automated notification from HireSphere.</p>
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

// PUT /api/companies/:id
const updateCompany = async (req, res) => {
  try {
    const { name, role, description, formQuestions, lastDate } = req.body;
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Verify the admin owns this company
    if (company.createdByAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this company' });
    }

    if (name) company.name = name;
    if (role) company.role = role;
    if (description) company.description = description;
    if (lastDate) company.lastDate = lastDate;
    if (formQuestions) company.formQuestions = formQuestions;

    await company.save();
    res.json(company);
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createCompany, getCompanies, getCompanyById, updateCompany };
