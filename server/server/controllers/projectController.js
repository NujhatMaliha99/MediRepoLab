const Project = require('../models/Project');
const Experiment = require('../models/Experiment');
const Dataset = require('../models/Dataset');
const { getChangedFields, logActivity } = require('../utils/activityLogger');

// @desc    Get all projects for logged-in user
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.user._id })
      .populate('owner', 'name email')
      .sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get approved projects visible to all researchers
// @route   GET /api/projects/published
// @access  Private
const getPublishedProjects = async (req, res) => {
  try {
    const projects = await Project.find({ reviewStatus: 'approved' })
      .populate('owner', 'name email institution role')
      .sort({ reviewedAt: -1, updatedAt: -1, createdAt: -1 });

    const projectIds = projects.map(project => project._id);

    const [datasetCounts, experimentStats] = await Promise.all([
      Dataset.aggregate([
        { $match: { project: { $in: projectIds } } },
        { $group: { _id: '$project', count: { $sum: 1 }, samples: { $sum: '$totalSamples' } } },
      ]),
      Experiment.aggregate([
        { $match: { project: { $in: projectIds } } },
        {
          $group: {
            _id: '$project',
            count: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            bestAccuracy: { $max: '$metrics.accuracy' },
            bestF1: { $max: '$metrics.f1Score' },
            bestAuc: { $max: '$metrics.auc' },
          },
        },
      ]),
    ]);

    const datasetMap = new Map(datasetCounts.map(item => [String(item._id), item]));
    const experimentMap = new Map(experimentStats.map(item => [String(item._id), item]));

    const enrichedProjects = projects.map(project => {
      const projectObject = project.toObject();
      const datasetSummary = datasetMap.get(String(project._id)) || {};
      const experimentSummary = experimentMap.get(String(project._id)) || {};

      return {
        ...projectObject,
        publicStats: {
          datasetCount: datasetSummary.count || 0,
          totalSamples: datasetSummary.samples || 0,
          experimentCount: experimentSummary.count || 0,
          completedExperiments: experimentSummary.completed || 0,
          bestAccuracy: experimentSummary.bestAccuracy || null,
          bestF1: experimentSummary.bestF1 || null,
          bestAuc: experimentSummary.bestAuc || null,
        },
      };
    });

    res.json(enrichedProjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
const getProject = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      $or: [{ owner: req.user._id }, { reviewStatus: 'approved' }],
    }).populate('owner', 'name email institution role');

    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create project
// @route   POST /api/projects
// @access  Private
const createProject = async (req, res) => {
  try {
    const project = await Project.create({ ...req.body, owner: req.user._id });
    await logActivity({
      user: req.user._id,
      project: project._id,
      entityType: 'project',
      entityId: project._id,
      action: 'created',
      title: `Project created: ${project.title}`,
      description: `${req.user.name || 'A researcher'} created the project workspace.`,
      changes: getChangedFields(req.body),
    });
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
const updateProject = async (req, res) => {
  try {
    const updateBody = { ...req.body };
    if (updateBody.studyProtocol) {
      updateBody.studyProtocol = {
        ...updateBody.studyProtocol,
        lastUpdatedAt: new Date(),
      };
    }
    const changes = getChangedFields(updateBody);
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      updateBody,
      { new: true, runValidators: true }
    );
    if (!project) return res.status(404).json({ message: 'Project not found' });
    await logActivity({
      user: req.user._id,
      project: project._id,
      entityType: 'project',
      entityId: project._id,
      action: 'updated',
      title: `Project updated: ${project.title}`,
      description: changes.length ? `Updated ${changes.join(', ')}.` : 'Project metadata was updated.',
      changes,
    });
    res.json(project);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Cascade delete experiments (datasets are kept for reference)
    await Experiment.deleteMany({ project: req.params.id });
    await logActivity({
      user: req.user._id,
      project: project._id,
      entityType: 'project',
      entityId: project._id,
      action: 'deleted',
      title: `Project deleted: ${project.title}`,
      description: 'Project workspace and linked experiments were deleted.',
    });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/projects/stats
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const totalProjects = await Project.countDocuments({ owner: req.user._id });
    const totalExperiments = await Experiment.countDocuments({ createdBy: req.user._id });
    const completedExperiments = await Experiment.countDocuments({
      createdBy: req.user._id,
      status: 'completed',
    });

    // Get top performing experiments by accuracy
    const topExperiments = await Experiment.find({ createdBy: req.user._id, 'metrics.accuracy': { $exists: true } })
      .sort({ 'metrics.accuracy': -1 })
      .limit(5)
      .populate('project', 'title')
      .select('name modelName metrics.accuracy metrics.f1Score project');

    // Model type distribution
    const modelDistribution = await Experiment.aggregate([
      { $match: { createdBy: req.user._id } },
      { $group: { _id: '$modelType', count: { $sum: 1 } } },
    ]);

    // Cancer type distribution from projects
    const cancerDistribution = await Project.aggregate([
      { $match: { owner: req.user._id } },
      { $group: { _id: '$cancerType', count: { $sum: 1 } } },
    ]);

    res.json({
      totalProjects,
      totalExperiments,
      completedExperiments,
      topExperiments,
      modelDistribution,
      cancerDistribution,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProjects,
  getPublishedProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getDashboardStats,
};
