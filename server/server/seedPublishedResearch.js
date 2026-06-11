const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const Project = require('./models/Project');
const Dataset = require('./models/Dataset');
const Experiment = require('./models/Experiment');

async function seedPublishedResearch() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/medreprolab';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  let researcher = await User.findOne({ email: 'nabila.rahman@medreprolab.ai' });
  if (!researcher) {
    researcher = await User.create({
      name: 'Dr. Nabila Rahman',
      email: 'nabila.rahman@medreprolab.ai',
      password: 'Demo@1234',
      institution: 'Dhaka Medical AI Research Unit',
      role: 'researcher',
      bio: 'Medical imaging researcher focused on reproducible CT and MRI validation pipelines.',
    });
  }

  let project = await Project.findOne({
    owner: researcher._id,
    title: 'Lung Nodule CT External Validation Study',
  });

  if (!project) {
    project = await Project.create({
      title: 'Lung Nodule CT External Validation Study',
      description:
        'Approved multi-center CT research workspace comparing CNN and transformer pipelines for lung nodule malignancy risk classification with dataset risk review, XAI evidence, and external validation artifacts.',
      cancerType: 'Lung Cancer',
      tags: ['CT', 'Lung Nodules', 'External Validation', 'Transformer', 'Grad-CAM'],
      status: 'completed',
      owner: researcher._id,
      githubLink: 'https://github.com/example/lung-nodule-ct-validation',
      paperLink: 'https://doi.org/10.1000/medreprolab.lung.2026',
      reviewStatus: 'approved',
      reviewRequestedAt: new Date('2026-05-28T10:00:00Z'),
      reviewedAt: new Date('2026-06-02T15:30:00Z'),
      reviewDecisionNote: 'Approved for public research browsing after complete validation and artifact review.',
      studyProtocol: {
        objective: 'Validate reproducible deep learning models for lung nodule malignancy risk classification across CT cohorts.',
        hypothesis: 'External validation plus documented preprocessing will improve reproducibility confidence for CT nodule AI models.',
        studyType: 'Retrospective multi-center CT classification study',
        inclusionCriteria: 'De-identified CT scans with radiologist-reviewed nodule annotations and malignancy outcome labels.',
        exclusionCriteria: 'Incomplete slice metadata, duplicate patient records, uncertain labels, and scans with severe reconstruction artifacts.',
        datasetPlan: 'Train on public LIDC-IDRI derived cohorts and test on a separate institutional validation cohort.',
        modelPlan: 'Compare 3D ResNet, EfficientNet slice aggregation, and ViT feature fusion with fixed seeds.',
        validationPlan: 'Patient-level train/validation/test split plus external holdout evaluation.',
        endpoints: 'Primary endpoint: AUC. Secondary endpoints: F1, sensitivity, specificity, and reproducibility score.',
        ethicsNotes: 'Public and de-identified institutional validation data with research-use documentation.',
        statisticalPlan: 'Bootstrap confidence intervals for AUC and paired comparison between top models.',
        protocolStatus: 'approved',
        version: 'v1.1',
        lastUpdatedAt: new Date('2026-05-27T09:00:00Z'),
      },
    });
    console.log(`Created project: ${project.title}`);
  } else {
    console.log(`Project already exists: ${project.title}`);
  }

  let dataset = await Dataset.findOne({ project: project._id, name: 'LIDC-IDRI Curated CT Nodule Cohort' });
  if (!dataset) {
    dataset = await Dataset.create({
      name: 'LIDC-IDRI Curated CT Nodule Cohort',
      version: 'v2.1-public-holdout',
      source: 'LIDC-IDRI / Institutional holdout',
      sourceUrl: 'https://wiki.cancerimagingarchive.net/pages/viewpage.action?pageId=1966254',
      totalSamples: 1018,
      classDistribution: {
        benign: 632,
        malignant: 386,
      },
      classes: ['benign', 'malignant'],
      imageSize: '512x512 CT slices',
      format: 'DICOM',
      preprocessingSteps: [
        'Patient-level deduplication',
        'Lung window normalization',
        'Nodule-centered crop extraction',
        'External cohort holdout split',
      ],
      augmentationTechniques: ['Rotation', 'Elastic transform', 'Intensity jitter'],
      description: 'Curated lung CT nodule dataset with documented patient-level splitting and external holdout validation.',
      limitations: 'Institutional holdout metadata is summarized only; scanner vendors are documented at site level.',
      project: project._id,
      createdBy: researcher._id,
      licenseType: 'Public research dataset plus IRB-approved holdout summary',
      datasetRisk: {
        classBalanceDocumented: true,
        missingDataAssessed: true,
        demographicBiasAssessed: true,
        deviceSourceBiasAssessed: true,
        annotationQualityDocumented: true,
        leakageRiskChecked: true,
        licenseConsentDocumented: true,
        demographicScope: 'Age and sex summary available for train and external holdout cohorts.',
        deviceSource: 'Mixed Siemens, GE, and Philips CT scanners across public and institutional cohorts.',
        missingDataNotes: 'Excluded records with missing malignancy outcome or slice thickness metadata.',
        annotationQuality: 'Nodule annotations reviewed by radiologists and mapped to patient-level labels.',
        leakageNotes: 'Strict patient-level split with duplicate series audit.',
        riskNotes: 'Main residual risk is site-specific reconstruction shift in the holdout cohort.',
      },
    });
    console.log(`Created dataset: ${dataset.name}`);
  } else {
    console.log(`Dataset already exists: ${dataset.name}`);
  }

  const experiment = await Experiment.findOne({ project: project._id, name: 'ViT Fusion External Holdout Run' });
  if (!experiment) {
    await Experiment.create({
      name: 'ViT Fusion External Holdout Run',
      description: 'Transformer fusion model evaluated on a locked external holdout CT cohort.',
      experimentTemplate: 'classification',
      project: project._id,
      dataset: dataset._id,
      modelName: 'ViT-B/16 Fusion',
      modelType: 'Transformer',
      framework: 'PyTorch',
      pretrained: true,
      hyperparameters: {
        learningRate: 0.00008,
        batchSize: 16,
        epochs: 70,
        optimizer: 'AdamW',
        lossFunction: 'weighted binary cross entropy',
        dropout: 0.25,
      },
      trainTestSplit: {
        trainRatio: 0.7,
        validationRatio: 0.15,
        testRatio: 0.15,
        stratified: true,
        randomSeed: 42,
      },
      metrics: {
        accuracy: 91.4,
        precision: 89.8,
        recall: 88.7,
        f1Score: 89.2,
        auc: 0.96,
        validationAccuracy: 90.7,
        testAccuracy: 91.4,
      },
      trainingEnvironment: {
        gpu: 'NVIDIA A100 40GB',
        cpu: 'AMD EPYC 7742',
        ram: '128GB',
        trainingTime: '4h 45m',
        os: 'Ubuntu 22.04',
      },
      xaiMethod: 'Grad-CAM',
      xaiEvidenceUrl: 'https://example.com/lung-nodule-gradcam-panel',
      xaiNotes: 'Attention and Grad-CAM overlays reviewed against radiologist-marked nodule regions.',
      reproducibilityChecklist: {
        codeAvailable: true,
        dataAvailable: true,
        seedFixed: true,
        environmentDocumented: true,
        hyperparamsLogged: true,
        resultsReproduced: true,
        peerReviewed: true,
        xaiProvided: true,
      },
      preprocessingMethod: 'Lung windowing, nodule crop extraction, z-score normalization, external holdout lock.',
      limitations: 'External cohort remains smaller than the public development cohort.',
      conclusions: 'Transformer fusion improved AUC while preserving strong reproducibility documentation.',
      githubLink: 'https://github.com/example/lung-nodule-ct-validation',
      notebookLink: 'https://colab.research.google.com/example/lung-nodule-vIT',
      modelCardLink: 'https://example.com/model-cards/lung-vIT-fusion',
      environmentFileLink: 'https://example.com/env/lung-vIT.yml',
      requirementsLink: 'https://example.com/requirements/lung-vIT.txt',
      status: 'completed',
      reviewStatus: 'approved',
      reviewRequestedAt: new Date('2026-05-28T10:00:00Z'),
      reviewedAt: new Date('2026-06-02T15:30:00Z'),
      reviewDecisionNote: 'Experiment accepted with complete artifact and XAI evidence.',
      createdBy: researcher._id,
    });
    console.log('Created experiment: ViT Fusion External Holdout Run');
  } else {
    console.log(`Experiment already exists: ${experiment.name}`);
  }

  await mongoose.disconnect();
  console.log('Published research seed complete.');
}

seedPublishedResearch().catch(async error => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
