const Activity = require('../models/Activity');

const FIELD_LABELS = {
  title: 'title',
  description: 'description',
  cancerType: 'research area',
  githubLink: 'code repository',
  paperLink: 'paper link',
  studyProtocol: 'study protocol',
  literatureBaselines: 'literature baselines',
  name: 'name',
  project: 'project',
  dataset: 'dataset',
  modelName: 'model name',
  modelType: 'model type',
  framework: 'framework',
  experimentTemplate: 'experiment template',
  notebookLink: 'notebook link',
  modelCardLink: 'model card',
  environmentFileLink: 'environment file',
  requirementsLink: 'requirements file',
  weightsLink: 'weights/checkpoint',
  protocolLink: 'protocol link',
  artifactNotes: 'artifact notes',
  xaiMethod: 'XAI method',
  xaiEvidenceUrl: 'XAI evidence',
  datasetRisk: 'dataset risk checklist',
  reproducibilityChecklist: 'reproducibility checklist',
  metrics: 'metrics',
  hyperparameters: 'hyperparameters',
  limitations: 'limitations',
  conclusions: 'conclusions',
};

const getChangedFields = body => (
  Object.keys(body || {})
    .filter(key => !['_id', '__v', 'createdAt', 'updatedAt', 'owner', 'createdBy'].includes(key))
    .map(key => FIELD_LABELS[key] || key)
);

const logActivity = async payload => {
  try {
    if (!payload?.user || !payload?.title || !payload?.entityType || !payload?.action) return;
    await Activity.create(payload);
  } catch (error) {
    console.error('Activity logging failed:', error.message);
  }
};

module.exports = { getChangedFields, logActivity };
