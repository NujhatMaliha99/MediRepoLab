const express = require('express');
const {
  createClinicalCase,
  getClinicalCase,
  getClinicalCases,
  updateClinicalCaseAppointment,
  updateClinicalCaseReview,
  updatePatientCaseResponse,
} = require('../controllers/clinicalCaseController');
const { adminOnly, protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/').get(getClinicalCases).post(createClinicalCase);
router.get('/:id', getClinicalCase);
router.patch('/:id/patient-response', updatePatientCaseResponse);
router.patch('/:id/review', adminOnly, updateClinicalCaseReview);
router.patch('/:id/appointment', adminOnly, updateClinicalCaseAppointment);

module.exports = router;
