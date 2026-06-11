const ClinicalCase = require('../models/ClinicalCase');

const getClinicalCases = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role !== 'admin') filter.createdBy = req.user._id;
    if (req.query.status) filter.urgencyLevel = req.query.status;
    if (req.query.appointmentStatus) filter['appointment.status'] = req.query.appointmentStatus;
    if (req.query.appointments === 'true') filter['appointment.status'] = { $ne: 'none' };

    const cases = await ClinicalCase.find(filter)
      .populate('createdBy', 'name email institution')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(150);

    res.json(cases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getClinicalCase = async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.role !== 'admin') filter.createdBy = req.user._id;

    const clinicalCase = await ClinicalCase.findOne(filter)
      .populate('createdBy', 'name email institution')
      .populate('reviewedBy', 'name email');

    if (!clinicalCase) return res.status(404).json({ message: 'Clinical case not found' });
    res.json(clinicalCase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createClinicalCase = async (req, res) => {
  try {
    const clinicalCase = await ClinicalCase.create({
      ...req.body,
      createdBy: req.user._id,
      urgencyLevel: req.body.redFlagged ? 'urgent' : req.body.urgencyLevel || 'needs_review',
    });

    res.status(201).json(clinicalCase);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateClinicalCaseReview = async (req, res) => {
  try {
    const { urgencyLevel, adminNotes, followUpPlan } = req.body;
    const allowed = ['new', 'needs_review', 'urgent', 'reviewed', 'resolved'];
    if (urgencyLevel && !allowed.includes(urgencyLevel)) {
      return res.status(400).json({ message: 'Invalid case status' });
    }

    const clinicalCase = await ClinicalCase.findByIdAndUpdate(
      req.params.id,
      {
        ...(urgencyLevel ? { urgencyLevel } : {}),
        ...(adminNotes !== undefined ? { adminNotes } : {}),
        ...(followUpPlan ? { followUpPlan } : {}),
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
      },
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email institution')
      .populate('reviewedBy', 'name email');

    if (!clinicalCase) return res.status(404).json({ message: 'Clinical case not found' });
    res.json(clinicalCase);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updatePatientCaseResponse = async (req, res) => {
  try {
    const clinicalCase = await ClinicalCase.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!clinicalCase) return res.status(404).json({ message: 'Clinical case not found' });

    if (req.body.acknowledgeInstructions) {
      clinicalCase.patientResponse.instructionsAcknowledgedAt = new Date();
    }

    if (req.body.requestAppointment) {
      clinicalCase.patientResponse.appointmentRequested = true;
      clinicalCase.patientResponse.appointmentRequestedAt = new Date();
      clinicalCase.appointment.status = 'pending';
      clinicalCase.appointment.requestedAt = clinicalCase.patientResponse.appointmentRequestedAt;
      if (clinicalCase.urgencyLevel === 'reviewed') clinicalCase.urgencyLevel = 'needs_review';
    }

    if (req.body.patientNote !== undefined) {
      clinicalCase.patientResponse.patientNote = req.body.patientNote;
    }

    await clinicalCase.save();
    res.json(clinicalCase);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateClinicalCaseAppointment = async (req, res) => {
  try {
    const {
      status,
      scheduledFor,
      doctorName,
      department,
      location,
      telemedicineLink,
      adminNote,
    } = req.body;

    const allowed = ['pending', 'scheduled', 'denied', 'completed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid appointment status' });
    }

    const update = {
      'appointment.status': status,
      'appointment.doctorName': doctorName || '',
      'appointment.department': department || '',
      'appointment.location': location || '',
      'appointment.telemedicineLink': telemedicineLink || '',
      'appointment.adminNote': adminNote || '',
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
    };

    if (scheduledFor) update['appointment.scheduledFor'] = scheduledFor;
    if (status === 'completed') update['appointment.completedAt'] = new Date();

    const clinicalCase = await ClinicalCase.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email institution')
      .populate('reviewedBy', 'name email');

    if (!clinicalCase) return res.status(404).json({ message: 'Clinical case not found' });
    res.json(clinicalCase);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getClinicalCases,
  getClinicalCase,
  createClinicalCase,
  updateClinicalCaseReview,
  updatePatientCaseResponse,
  updateClinicalCaseAppointment,
};
