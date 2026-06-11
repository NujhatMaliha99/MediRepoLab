const Project = require('../models/Project');
const Experiment = require('../models/Experiment');
const ReviewRequest = require('../models/ReviewRequest');
const { logActivity } = require('../utils/activityLogger');

const populateReview = query => query
  .populate('requester', 'name email institution')
  .populate('reviewer', 'name email')
  .populate('project', 'title cancerType reviewStatus')
  .populate('experiment', 'name modelName metrics.accuracy reviewStatus');

const getReviewRequests = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role !== 'admin') filter.requester = req.user._id;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.project) filter.project = req.query.project;

    const requests = await populateReview(
      ReviewRequest.find(filter).sort({ createdAt: -1 }).limit(100)
    );
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const submitExperimentReview = async (req, res) => {
  try {
    const experiment = await Experiment.findOne({
      _id: req.params.experimentId,
      createdBy: req.user._id,
    });

    if (!experiment) return res.status(404).json({ message: 'Experiment not found' });
    if (experiment.reviewStatus === 'pending') {
      return res.status(400).json({ message: 'This experiment is already waiting for review' });
    }

    const request = await ReviewRequest.create({
      requester: req.user._id,
      project: experiment.project,
      targetType: 'experiment',
      experiment: experiment._id,
      message: req.body.message || '',
      status: 'pending',
    });

    experiment.reviewStatus = 'pending';
    experiment.reviewRequestedAt = new Date();
    experiment.reviewDecisionNote = '';
    await experiment.save();

    await logActivity({
      user: req.user._id,
      project: experiment.project,
      entityType: 'experiment',
      entityId: experiment._id,
      action: 'updated',
      title: `Review requested: ${experiment.name}`,
      description: req.body.message || 'Experiment was submitted for admin/supervisor review.',
      changes: ['review status'],
    });

    const populated = await populateReview(ReviewRequest.findById(request._id));
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const submitProjectReview = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.projectId,
      owner: req.user._id,
    });

    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.reviewStatus === 'pending') {
      return res.status(400).json({ message: 'This project is already waiting for review' });
    }

    const request = await ReviewRequest.create({
      requester: req.user._id,
      project: project._id,
      targetType: 'project',
      message: req.body.message || '',
      status: 'pending',
    });

    project.reviewStatus = 'pending';
    project.reviewRequestedAt = new Date();
    project.reviewDecisionNote = '';
    await project.save();

    await logActivity({
      user: req.user._id,
      project: project._id,
      entityType: 'project',
      entityId: project._id,
      action: 'updated',
      title: `Project review requested: ${project.title}`,
      description: req.body.message || 'Project workspace was submitted for admin/supervisor review.',
      changes: ['project review status'],
    });

    const populated = await populateReview(ReviewRequest.findById(request._id));
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const decideReviewRequest = async (req, res) => {
  try {
    const { decision, decisionNote } = req.body;
    if (!['approved', 'denied'].includes(decision)) {
      return res.status(400).json({ message: 'Decision must be approved or denied' });
    }

    const request = await ReviewRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Review request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'This request has already been decided' });
    }

    request.status = decision;
    request.reviewer = req.user._id;
    request.decisionNote = decisionNote || '';
    request.decidedAt = new Date();
    await request.save();

    if (request.targetType === 'project') {
      const project = await Project.findById(request.project);
      if (!project) return res.status(404).json({ message: 'Project not found' });

      project.reviewStatus = decision;
      project.reviewedBy = req.user._id;
      project.reviewedAt = request.decidedAt;
      project.reviewDecisionNote = decisionNote || '';
      await project.save();

      await logActivity({
        user: req.user._id,
        project: project._id,
        entityType: 'project',
        entityId: project._id,
        action: 'updated',
        title: `Project review ${decision}: ${project.title}`,
        description: decisionNote || `Admin marked the project as ${decision}.`,
        changes: ['project review status'],
      });
    } else {
      const experiment = await Experiment.findById(request.experiment);
      if (!experiment) return res.status(404).json({ message: 'Experiment not found' });

      experiment.reviewStatus = decision;
      experiment.reviewedBy = req.user._id;
      experiment.reviewedAt = request.decidedAt;
      experiment.reviewDecisionNote = decisionNote || '';
      if (decision === 'approved') {
        experiment.reproducibilityChecklist = {
          ...(experiment.reproducibilityChecklist?.toObject ? experiment.reproducibilityChecklist.toObject() : experiment.reproducibilityChecklist),
          peerReviewed: true,
        };
      }
      await experiment.save();

      await logActivity({
        user: req.user._id,
        project: request.project,
        entityType: 'experiment',
        entityId: experiment._id,
        action: 'updated',
        title: `Review ${decision}: ${experiment.name}`,
        description: decisionNote || `Admin marked the experiment as ${decision}.`,
        changes: ['review status', ...(decision === 'approved' ? ['peer/supervisor reviewed'] : [])],
      });
    }

    const populated = await populateReview(ReviewRequest.findById(request._id));
    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { getReviewRequests, submitExperimentReview, submitProjectReview, decideReviewRequest };
