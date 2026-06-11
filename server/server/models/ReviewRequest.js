const mongoose = require('mongoose');

const reviewRequestSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['project', 'experiment'],
      default: 'experiment',
      index: true,
    },
    experiment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Experiment',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'denied'],
      default: 'pending',
      index: true,
    },
    message: {
      type: String,
      default: '',
    },
    decisionNote: {
      type: String,
      default: '',
    },
    decidedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReviewRequest', reviewRequestSchema);
