const Admin = require('../models/Admin');
const Student = require('../models/Student');

// GET /api/admin/students
const getStudents = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user._id);
    const students = await Student.find({ universityCode: admin.universityCode }).select('-password');
    res.json(students);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/admin/profile
const getProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user._id).select('-password');
    res.json(admin);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/admin/profile
const updateProfile = async (req, res) => {
  try {
    const { name, universityName } = req.body;
    const admin = await Admin.findById(req.user._id);

    if (name) admin.name = name;
    if (universityName) admin.universityName = universityName;

    await admin.save();

    res.json({
      id: admin._id,
      name: admin.name,
      email: admin.email,
      universityName: admin.universityName,
      universityCode: admin.universityCode,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getStudents, getProfile, updateProfile };
