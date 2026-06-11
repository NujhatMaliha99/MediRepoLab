const Activity = require('../models/Activity');
const Project = require('../models/Project');
const { logActivity } = require('../utils/activityLogger');

const getActivities = async (req, res) => {
  try {
    const filter = { user: req.user._id };
    if (req.query.project) filter.project = req.query.project;
    if (req.query.entityType) filter.entityType = req.query.entityType;

    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const activities = await Activity.find(filter)
      .populate('user', 'name email')
      .populate('project', 'title')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const logReportGenerated = async (req, res) => {
  try {
    const { projectId, title, description, options } = req.body;
    if (!projectId) return res.status(400).json({ message: 'Project ID is required' });

    const project = await Project.findOne({ _id: projectId, owner: req.user._id });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    await logActivity({
      user: req.user._id,
      project: project._id,
      entityType: 'report',
      entityId: project._id,
      action: 'generated',
      title: title || `Report generated for ${project.title}`,
      description: description || 'A research report PDF was generated.',
      metadata: { options: options || {} },
    });

    res.status(201).json({ message: 'Activity logged' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { getActivities, logReportGenerated };
