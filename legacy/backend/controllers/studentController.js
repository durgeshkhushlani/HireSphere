const Student = require('../models/Student');

// GET /api/student/profile
const getProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.user._id).select('-password');
    res.json(student);
  } catch (error) {
    console.error('Get student profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/student/profile
const updateProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.user._id);
    const { name } = req.body;

    if (name) student.name = name;

    // If a new resume was uploaded
    if (req.file) {
      student.resume = req.file.filename;
    }

    await student.save();

    res.json({
      id: student._id,
      name: student.name,
      email: student.email,
      universityCode: student.universityCode,
      resume: student.resume,
    });
  } catch (error) {
    console.error('Update student profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getProfile, updateProfile };
