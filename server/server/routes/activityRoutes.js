const express = require('express');
const { getActivities, logReportGenerated } = require('../controllers/activityController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getActivities);
router.post('/report-generated', logReportGenerated);

module.exports = router;
