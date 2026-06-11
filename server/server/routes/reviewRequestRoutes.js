const express = require('express');
const {
  decideReviewRequest,
  getReviewRequests,
  submitExperimentReview,
  submitProjectReview,
} = require('../controllers/reviewRequestController');
const { adminOnly, protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getReviewRequests);
router.post('/experiments/:experimentId', submitExperimentReview);
router.post('/projects/:projectId', submitProjectReview);
router.patch('/:id/decision', adminOnly, decideReviewRequest);

module.exports = router;
