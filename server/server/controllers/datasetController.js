const Dataset = require('../models/Dataset');
const Project = require('../models/Project');
const { getChangedFields, logActivity } = require('../utils/activityLogger');

// @desc    Get all datasets (optionally filter by project)
// @route   GET /api/datasets
// @access  Private
const getDatasets = async (req, res) => {
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

    const datasets = await Dataset.find(filter)
      .populate('project', 'title cancerType')
      .sort({ createdAt: -1 });
    res.json(datasets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single dataset
// @route   GET /api/datasets/:id
// @access  Private
const getDataset = async (req, res) => {
  try {
    const dataset = await Dataset.findById(req.params.id).populate('project', 'title cancerType owner reviewStatus');

    const isOwner = String(dataset?.createdBy) === String(req.user._id);
    const isApprovedProject = dataset?.project?.reviewStatus === 'approved';
    if (!dataset || (!isOwner && !isApprovedProject)) {
      return res.status(404).json({ message: 'Dataset not found' });
    }
    res.json(dataset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create dataset
// @route   POST /api/datasets
// @access  Private
const createDataset = async (req, res) => {
  try {
    const dataset = await Dataset.create({ ...req.body, createdBy: req.user._id });
    await logActivity({
      user: req.user._id,
      project: dataset.project,
      entityType: 'dataset',
      entityId: dataset._id,
      action: 'created',
      title: `Dataset added: ${dataset.name}`,
      description: `${dataset.totalSamples || 'Unknown'} samples registered for this project.`,
      changes: getChangedFields(req.body),
    });
    res.status(201).json(dataset);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update dataset
// @route   PUT /api/datasets/:id
// @access  Private
const updateDataset = async (req, res) => {
  try {
    const changes = getChangedFields(req.body);
    const dataset = await Dataset.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!dataset) return res.status(404).json({ message: 'Dataset not found' });
    await logActivity({
      user: req.user._id,
      project: dataset.project,
      entityType: 'dataset',
      entityId: dataset._id,
      action: 'updated',
      title: `Dataset updated: ${dataset.name}`,
      description: changes.length ? `Updated ${changes.join(', ')}.` : 'Dataset documentation was updated.',
      changes,
    });
    res.json(dataset);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete dataset
// @route   DELETE /api/datasets/:id
// @access  Private
const deleteDataset = async (req, res) => {
  try {
    const dataset = await Dataset.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });
    if (!dataset) return res.status(404).json({ message: 'Dataset not found' });
    await logActivity({
      user: req.user._id,
      project: dataset.project,
      entityType: 'dataset',
      entityId: dataset._id,
      action: 'deleted',
      title: `Dataset deleted: ${dataset.name}`,
      description: 'Dataset record was removed from the registry.',
    });
    res.json({ message: 'Dataset deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getDatasets, getDataset, createDataset, updateDataset, deleteDataset };
