const express = require('express');
const router = express.Router();
const { analyzeProject, generateManuscript } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.post('/analyze', protect, analyzeProject);
router.post('/manuscript', protect, generateManuscript);

module.exports = router;
