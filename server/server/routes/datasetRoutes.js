const express = require('express');
const router = express.Router();
const {
  getDatasets,
  getDataset,
  createDataset,
  updateDataset,
  deleteDataset,
} = require('../controllers/datasetController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/').get(getDatasets).post(createDataset);
router.route('/:id').get(getDataset).put(updateDataset).delete(deleteDataset);

module.exports = router;
