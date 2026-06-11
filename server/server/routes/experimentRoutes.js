const express = require('express');
const router = express.Router();
const {
  getExperiments,
  getExperiment,
  createExperiment,
  updateExperiment,
  deleteExperiment,
  compareExperiments,
} = require('../controllers/experimentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/compare', compareExperiments);
router.route('/').get(getExperiments).post(createExperiment);
router.route('/:id').get(getExperiment).put(updateExperiment).delete(deleteExperiment);

module.exports = router;
