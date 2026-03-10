const Application = require('../models/Application');
const Company = require('../models/Company');
const Student = require('../models/Student');
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');

// POST /api/applications
const submitApplication = async (req, res) => {
  try {
    const { companyId, answers } = req.body;
    const studentId = req.user._id;

    // Check if already applied
    const existing = await Application.findOne({ studentId, companyId });
    if (existing) {
      return res.status(400).json({ message: 'You have already applied to this company' });
    }

    // Check company exists
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    let resumePath = '';
    if (req.file) {
      resumePath = req.file.filename;
    } else {
      // use student's profile resume
      const student = await Student.findById(studentId);
      if (student.resume) {
        resumePath = student.resume;
      } else {
        return res.status(400).json({ message: 'Please upload a resume' });
      }
    }

    const parsedAnswers = typeof answers === 'string' ? JSON.parse(answers) : answers;

    const application = await Application.create({
      studentId,
      companyId,
      answers: parsedAnswers || [],
      resume: resumePath,
    });

    res.status(201).json(application);
  } catch (error) {
    console.error('Submit application error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/applications/company/:companyId
const getApplicationsByCompany = async (req, res) => {
  try {
    const applications = await Application.find({ companyId: req.params.companyId })
      .populate('studentId', 'name email')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/applications/company/:companyId/download
const downloadResumes = async (req, res) => {
  try {
    const applications = await Application.find({ companyId: req.params.companyId });

    if (applications.length === 0) {
      return res.status(404).json({ message: 'No applications found' });
    }

    const company = await Company.findById(req.params.companyId);
    const zipFileName = `${company.name.replace(/\s+/g, '_')}_resumes.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    const uploadsDir = path.join(__dirname, '..', 'uploads', 'resumes');

    for (const app of applications) {
      const filePath = path.join(uploadsDir, app.resume);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: app.resume });
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('Download resumes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/applications/student — get current student's applications
const getStudentApplications = async (req, res) => {
  try {
    const applications = await Application.find({ studentId: req.user._id })
      .populate('companyId', 'name role')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    console.error('Get student applications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { submitApplication, getApplicationsByCompany, downloadResumes, getStudentApplications };
