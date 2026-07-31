const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
  },
  lastDate: {
    type: Date,
    required: [true, 'Last date to apply is required'],
  },
  formQuestions: [{
    type: String,
  }],
  createdByAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
  universityCode: {
    type: String,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
