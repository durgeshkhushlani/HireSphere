const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const generateUniversityCode = require('../utils/generateCode');
const sendEmail = require('../utils/sendEmail');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// POST /api/auth/admin/signup
const adminSignup = async (req, res) => {
  try {
    const { name, universityName, email, password } = req.body;

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin with this email already exists' });
    }

    const universityCode = generateUniversityCode();

    const admin = await Admin.create({
      name,
      universityName,
      email,
      password,
      universityCode,
    });

    // Send university code via email
    await sendEmail(
      email,
      'Welcome to HireSphere — Your University Secret Code',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6c63ff;">Welcome to HireSphere, ${name}!</h2>
        <p>Your university <strong>${universityName}</strong> has been registered successfully.</p>
        <p>Your <strong>University Secret Code</strong> is:</p>
        <div style="background: #1a1a2e; color: #6c63ff; padding: 15px 25px; border-radius: 8px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 3px;">
          ${universityCode}
        </div>
        <p style="margin-top: 15px;">Share this code with your students so they can register on the platform.</p>
        <hr style="margin: 20px 0; border-color: #eee;" />
        <p style="color: #999; font-size: 12px;">This is an automated email from HireSphere. Please do not reply.</p>
      </div>
      `
    );

    const token = generateToken(admin._id, 'admin');

    res.status(201).json({
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        universityName: admin.universityName,
        universityCode: admin.universityCode,
        role: 'admin',
      },
    });
  } catch (error) {
    console.error('Admin signup error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
};

// POST /api/auth/admin/login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(admin._id, 'admin');

    res.json({
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        universityName: admin.universityName,
        universityCode: admin.universityCode,
        role: 'admin',
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// POST /api/auth/student/signup
const studentSignup = async (req, res) => {
  try {
    const { name, email, password, universityCode } = req.body;

    // Validate university code
    const admin = await Admin.findOne({ universityCode });
    if (!admin) {
      return res.status(400).json({ message: 'Invalid university code. Please contact your placement cell.' });
    }

    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({ message: 'Student with this email already exists' });
    }

    const student = await Student.create({
      name,
      email,
      password,
      universityCode,
    });

    const token = generateToken(student._id, 'student');

    res.status(201).json({
      token,
      user: {
        id: student._id,
        name: student.name,
        email: student.email,
        universityCode: student.universityCode,
        role: 'student',
      },
    });
  } catch (error) {
    console.error('Student signup error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
};

// POST /api/auth/student/login
const studentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await student.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(student._id, 'student');

    res.json({
      token,
      user: {
        id: student._id,
        name: student.name,
        email: student.email,
        universityCode: student.universityCode,
        role: 'student',
      },
    });
  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

module.exports = { adminSignup, adminLogin, studentSignup, studentLogin };
