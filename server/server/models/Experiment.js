const mongoose = require('mongoose');

const experimentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Experiment name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    experimentTemplate: {
      type: String,
      default: '',
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    dataset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dataset',
    },

    // Model Architecture
    modelName: {
      type: String,
      required: [true, 'Model name is required'],
      // e.g. "MobileNetV3", "ResNet50", "EfficientNetB0", "ViT-B/16"
    },
    modelType: {
      type: String,
      enum: ['CNN', 'Transformer', 'RNN', 'Hybrid', 'Classical ML', 'Other'],
      default: 'CNN',
    },
    framework: {
      type: String,
      enum: ['TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn', 'Other'],
      default: 'TensorFlow',
    },
    pretrained: {
      type: Boolean,
      default: true,
    },

    // Hyperparameters
    hyperparameters: {
      learningRate: { type: Number, default: 0.001 },
      batchSize: { type: Number, default: 32 },
      epochs: { type: Number, default: 50 },
      optimizer: { type: String, default: 'Adam' },
      lossFunction: { type: String, default: 'categorical_crossentropy' },
      dropout: { type: Number, default: 0 },
      additionalParams: { type: Map, of: mongoose.Schema.Types.Mixed },
    },

    // Data Split
    trainTestSplit: {
      trainRatio: { type: Number, default: 0.7 },
      validationRatio: { type: Number, default: 0.15 },
      testRatio: { type: Number, default: 0.15 },
      stratified: { type: Boolean, default: true },
      randomSeed: { type: Number, default: 42 },
    },

    // Performance Metrics
    metrics: {
      accuracy: { type: Number, min: 0, max: 100 },
      precision: { type: Number, min: 0, max: 100 },
      recall: { type: Number, min: 0, max: 100 },
      f1Score: { type: Number, min: 0, max: 100 },
      auc: { type: Number, min: 0, max: 1 },
      loss: { type: Number },
      validationAccuracy: { type: Number },
      validationLoss: { type: Number },
      testAccuracy: { type: Number },
    },

    // Training Environment
    trainingEnvironment: {
      gpu: { type: String, default: '' },
      cpu: { type: String, default: '' },
      ram: { type: String, default: '' },
      trainingTime: { type: String, default: '' }, // e.g. "2h 15m"
      os: { type: String, default: '' },
    },

    // XAI / Explainability
    xaiMethod: {
      type: String,
      enum: ['Grad-CAM', 'SHAP', 'LIME', 'Integrated Gradients', 'Attention Map', 'None', 'Other'],
      default: 'None',
    },
    xaiEvidenceUrl: {
      type: String,
      default: '',
    },
    xaiNotes: {
      type: String,
      default: '',
    },

    // Reproducibility Checklist
    reproducibilityChecklist: {
      codeAvailable: { type: Boolean, default: false },
      dataAvailable: { type: Boolean, default: false },
      seedFixed: { type: Boolean, default: false },
      environmentDocumented: { type: Boolean, default: false },
      hyperparamsLogged: { type: Boolean, default: false },
      resultsReproduced: { type: Boolean, default: false },
      peerReviewed: { type: Boolean, default: false },
      xaiProvided: { type: Boolean, default: false },
    },

    // Research Context
    preprocessingMethod: {
      type: String,
      default: '',
    },
    limitations: {
      type: String,
      default: '',
    },
    conclusions: {
      type: String,
      default: '',
    },
    githubLink: {
      type: String,
      default: '',
    },
    notebookLink: {
      type: String,
      default: '',
    },
    modelCardLink: {
      type: String,
      default: '',
    },
    environmentFileLink: {
      type: String,
      default: '',
    },
    requirementsLink: {
      type: String,
      default: '',
    },
    weightsLink: {
      type: String,
      default: '',
    },
    protocolLink: {
      type: String,
      default: '',
    },
    artifactNotes: {
      type: String,
      default: '',
    },

    status: {
      type: String,
      enum: ['running', 'completed', 'failed', 'cancelled'],
      default: 'completed',
    },
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

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Virtual: reproducibility score (0-100)
experimentSchema.virtual('reproducibilityScore').get(function () {
  const checklist = this.reproducibilityChecklist;
  if (!checklist) return 0;
  const fields = Object.values(checklist.toObject ? checklist.toObject() : checklist);
  const trueCount = fields.filter(Boolean).length;
  return Math.round((trueCount / fields.length) * 100);
});

experimentSchema.set('toJSON', { virtuals: true });
experimentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Experiment', experimentSchema);
