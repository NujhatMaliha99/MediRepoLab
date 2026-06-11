const Experiment = require('../models/Experiment');
const Project = require('../models/Project');
const { getChangedFields, logActivity } = require('../utils/activityLogger');

// @desc    Get all experiments
// @route   GET /api/experiments
// @access  Private
const getExperiments = async (req, res) => {
  try {
    let filter = { createdBy: req.user._id };
    if (req.query.project) {
      const project = await Project.findOne({
        _id: req.query.project,
        $or: [{ owner: req.user._id }, { reviewStatus: 'approved' }],
      }).select('_id');

      if (!project) return res.status(404).json({ message: 'Project not found' });
      filter = { project: req.query.project };
    }
    if (req.query.status) filter.status = req.query.status;

    const experiments = await Experiment.find(filter)
      .populate('project', 'title cancerType')
      .populate('dataset', 'name version')
      .sort({ createdAt: -1 });
    res.json(experiments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single experiment
// @route   GET /api/experiments/:id
// @access  Private
const getExperiment = async (req, res) => {
  try {
    const experiment = await Experiment.findById(req.params.id)
      .populate('project', 'title cancerType description owner reviewStatus')
      .populate('dataset', 'name version source totalSamples');

    const isOwner = String(experiment?.createdBy) === String(req.user._id);
    const isApprovedProject = experiment?.project?.reviewStatus === 'approved';
    if (!experiment || (!isOwner && !isApprovedProject)) {
      return res.status(404).json({ message: 'Experiment not found' });
    }
    res.json(experiment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create experiment
// @route   POST /api/experiments
// @access  Private
const createExperiment = async (req, res) => {
  try {
    const experiment = await Experiment.create({ ...req.body, createdBy: req.user._id });
    await logActivity({
      user: req.user._id,
      project: experiment.project,
      entityType: 'experiment',
      entityId: experiment._id,
      action: 'created',
      title: `Experiment logged: ${experiment.name}`,
      description: `${experiment.modelName} run recorded with ${experiment.metrics?.accuracy || 0}% accuracy.`,
      changes: getChangedFields(req.body),
    });
    res.status(201).json(experiment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update experiment
// @route   PUT /api/experiments/:id
// @access  Private
const updateExperiment = async (req, res) => {
  try {
    const changes = getChangedFields(req.body);
    const experiment = await Experiment.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    )
      .populate('project', 'title cancerType')
      .populate('dataset', 'name version');

    if (!experiment) return res.status(404).json({ message: 'Experiment not found' });
    await logActivity({
      user: req.user._id,
      project: experiment.project?._id || experiment.project,
      entityType: 'experiment',
      entityId: experiment._id,
      action: 'updated',
      title: `Experiment updated: ${experiment.name}`,
      description: changes.length ? `Updated ${changes.join(', ')}.` : 'Experiment record was updated.',
      changes,
    });
    res.json(experiment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete experiment
// @route   DELETE /api/experiments/:id
// @access  Private
const deleteExperiment = async (req, res) => {
  try {
    const experiment = await Experiment.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });
    if (!experiment) return res.status(404).json({ message: 'Experiment not found' });
    await logActivity({
      user: req.user._id,
      project: experiment.project,
      entityType: 'experiment',
      entityId: experiment._id,
      action: 'deleted',
      title: `Experiment deleted: ${experiment.name}`,
      description: 'Experiment record was removed.',
    });
    res.json({ message: 'Experiment deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Compare multiple experiments
// @route   POST /api/experiments/compare
// @access  Private
const compareExperiments = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || ids.length < 2) {
      return res.status(400).json({ message: 'Please provide at least 2 experiment IDs to compare' });
    }

    const experiments = await Experiment.find({
      _id: { $in: ids },
      createdBy: req.user._id,
    })
      .populate('project', 'title cancerType')
      .populate('dataset', 'name version');

    if (experiments.length < 2) {
      return res.status(404).json({ message: 'Not enough experiments found' });
    }

    // Build comparison summary
    const comparison = experiments.map((exp) => ({
      _id: exp._id,
      name: exp.name,
      modelName: exp.modelName,
      modelType: exp.modelType,
      framework: exp.framework,
      metrics: exp.metrics,
      hyperparameters: exp.hyperparameters,
      xaiMethod: exp.xaiMethod,
      reproducibilityScore: exp.reproducibilityScore,
      project: exp.project,
      dataset: exp.dataset,
      trainTestSplit: exp.trainTestSplit,
    }));

    // Find best experiment by accuracy
    const best = comparison.reduce((prev, curr) =>
      (curr.metrics?.accuracy || 0) > (prev.metrics?.accuracy || 0) ? curr : prev
    );

    res.json({ experiments: comparison, best: best._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getExperiments,
  getExperiment,
  createExperiment,
  updateExperiment,
  deleteExperiment,
  compareExperiments,
};
