const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    cancerType: {
      type: String,
      required: [true, 'Cancer type is required'],
      enum: [
        'Liver Cancer',
        'Lung Cancer',
        'Breast Cancer',
        'Brain Cancer',
        'Colon Cancer',
        'Skin Cancer',
        'Prostate Cancer',
        'Cervical Cancer',
        'Kidney Cancer',
        'Pancreatic Cancer',
        'Other',
      ],
    },
    tags: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ['active', 'completed', 'archived'],
      default: 'active',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    collaborators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    githubLink: {
      type: String,
      default: '',
    },
    paperLink: {
      type: String,
      default: '',
    },
    studyProtocol: {
      objective: { type: String, default: '' },
      hypothesis: { type: String, default: '' },
      studyType: { type: String, default: '' },
      inclusionCriteria: { type: String, default: '' },
      exclusionCriteria: { type: String, default: '' },
      datasetPlan: { type: String, default: '' },
      modelPlan: { type: String, default: '' },
      validationPlan: { type: String, default: '' },
      endpoints: { type: String, default: '' },
      ethicsNotes: { type: String, default: '' },
      statisticalPlan: { type: String, default: '' },
      protocolStatus: {
        type: String,
        enum: ['draft', 'ready', 'submitted', 'approved', 'needs_revision'],
        default: 'draft',
      },
      version: { type: String, default: 'v1.0' },
      lastUpdatedAt: { type: Date },
    },
    literatureBaselines: [
      {
        paperTitle: { type: String, default: '' },
        authors: { type: String, default: '' },
        year: { type: Number },
        venue: { type: String, default: '' },
        task: { type: String, default: '' },
        dataset: { type: String, default: '' },
        modelName: { type: String, default: '' },
        accuracy: { type: Number },
        f1Score: { type: Number },
        auc: { type: Number },
        reproducibilityNotes: { type: String, default: '' },
        link: { type: String, default: '' },
        notes: { type: String, default: '' },
      },
    ],
    reviewStatus: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'denied'],
      default: 'draft',
    },
    reviewRequestedAt: {
      type: Date,
    },
    reviewedAt: {
      type: Date,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewDecisionNote: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);
