const mongoose = require('mongoose');

const clinicalCaseSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    patientLabel: {
      type: String,
      default: 'Patient case',
      trim: true,
    },
    age: { type: String, default: '' },
    sex: { type: String, default: '' },
    symptoms: { type: String, required: true },
    duration: { type: String, default: '' },
    severity: { type: String, default: '' },
    medicalHistory: { type: String, default: '' },
    medications: { type: String, default: '' },
    allergies: { type: String, default: '' },
    vitals: { type: String, default: '' },
    triageOutput: { type: String, required: true },
    urgencyLevel: {
      type: String,
      enum: ['new', 'needs_review', 'urgent', 'reviewed', 'resolved'],
      default: 'needs_review',
      index: true,
    },
    redFlagged: {
      type: Boolean,
      default: false,
    },
    adminNotes: {
      type: String,
      default: '',
    },
    followUpPlan: {
      impression: { type: String, default: '' },
      recommendedDepartment: { type: String, default: '' },
      suggestedTests: { type: String, default: '' },
      followUpDate: { type: Date },
      appointmentNeeded: { type: Boolean, default: false },
      patientInstructions: { type: String, default: '' },
    },
    patientResponse: {
      instructionsAcknowledgedAt: { type: Date },
      appointmentRequested: { type: Boolean, default: false },
      appointmentRequestedAt: { type: Date },
      patientNote: { type: String, default: '' },
    },
    appointment: {
      status: {
        type: String,
        enum: ['none', 'pending', 'scheduled', 'denied', 'completed'],
        default: 'none',
        index: true,
      },
      requestedAt: { type: Date },
      scheduledFor: { type: Date },
      doctorName: { type: String, default: '' },
      department: { type: String, default: '' },
      location: { type: String, default: '' },
      telemedicineLink: { type: String, default: '' },
      adminNote: { type: String, default: '' },
      completedAt: { type: Date },
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ClinicalCase', clinicalCaseSchema);
