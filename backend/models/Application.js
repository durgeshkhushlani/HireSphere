const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  answers: [{
    question: String,
    answer: String,
  }],
  resume: {
    type: String,
    required: [true, 'Resume is required'],
  },
}, { timestamps: true });

// Prevent duplicate applications
applicationSchema.index({ studentId: 1, companyId: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
