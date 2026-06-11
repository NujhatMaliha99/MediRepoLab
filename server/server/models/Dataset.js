const mongoose = require('mongoose');

const datasetSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Dataset name is required'],
      trim: true,
    },
    version: {
      type: String,
      default: 'v1.0',
    },
    source: {
      type: String,
      required: [true, 'Data source is required'],
      // e.g. "Kaggle", "TCGA", "NIH", "Custom", etc.
    },
    sourceUrl: {
      type: String,
      default: '',
    },
    sourceLink: {
      type: String,
      default: '',
    },
    totalSamples: {
      type: Number,
      default: 0,
    },
    classDistribution: {
      type: Map,
      of: Number,
      default: {},
    },
    classes: [{ type: String, trim: true }],
    imageSize: {
      type: String,
      default: '',
      // e.g. "224x224"
    },
    format: {
      type: String,
      enum: ['JPEG', 'PNG', 'DICOM', 'NIfTI', 'CSV', 'HDF5', 'Other'],
      default: 'JPEG',
    },
    preprocessingSteps: [{ type: String }],
    augmentationTechniques: [{ type: String }],
    description: {
      type: String,
      default: '',
    },
    limitations: {
      type: String,
      default: '',
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    licenseType: {
      type: String,
      default: 'Public',
    },
    datasetRisk: {
      classBalanceDocumented: { type: Boolean, default: false },
      missingDataAssessed: { type: Boolean, default: false },
      demographicBiasAssessed: { type: Boolean, default: false },
      deviceSourceBiasAssessed: { type: Boolean, default: false },
      annotationQualityDocumented: { type: Boolean, default: false },
      leakageRiskChecked: { type: Boolean, default: false },
      licenseConsentDocumented: { type: Boolean, default: false },
      demographicScope: { type: String, default: '' },
      deviceSource: { type: String, default: '' },
      missingDataNotes: { type: String, default: '' },
      annotationQuality: { type: String, default: '' },
      leakageNotes: { type: String, default: '' },
      riskNotes: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Dataset', datasetSchema);
