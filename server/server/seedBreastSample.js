const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const Project = require('./models/Project');
const Dataset = require('./models/Dataset');
const Experiment = require('./models/Experiment');

const email = 'demo@medreprolab.ai';

async function seedBreastSample() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name: 'Dr. Ayasha Patel',
      email,
      password: 'Demo@1234',
      institution: 'Harvard Medical School',
      role: 'researcher',
    });
  }

  let project = await Project.findOne({ owner: user._id, title: 'Breast Histopathology Reproducibility Benchmark' });
  if (!project) {
    project = await Project.create({
      title: 'Breast Histopathology Reproducibility Benchmark',
      description:
        'A complete reproducibility benchmark for invasive ductal carcinoma detection on breast histopathology patches. The workspace includes protocol documentation, dataset risk review, literature baselines, model comparison, XAI evidence, and report-ready research artifacts.',
      cancerType: 'Breast Cancer',
      status: 'active',
      tags: ['Histopathology', 'IDC', 'Patch Classification', 'XAI', 'External Validation'],
      owner: user._id,
      githubLink: 'https://github.com/example/breast-histo-repro-benchmark',
      paperLink: 'https://doi.org/10.1109/tmi.2025.example',
      reviewStatus: 'approved',
      reviewRequestedAt: new Date('2026-05-20T09:30:00Z'),
      reviewedAt: new Date('2026-05-23T14:00:00Z'),
      reviewDecisionNote: 'Approved as a complete reproducibility demonstration project.',
      studyProtocol: {
        objective: 'Evaluate reproducible AI pipelines for invasive ductal carcinoma detection from breast histopathology image patches.',
        hypothesis: 'A pretrained CNN with stain normalization and external holdout validation will improve F1 score while preserving reproducibility quality.',
        studyType: 'Retrospective image classification benchmark',
        inclusionCriteria: 'H&E breast histopathology patches with verified benign or IDC labels and patient-level split metadata.',
        exclusionCriteria: 'Patches with severe scanner artefacts, missing labels, duplicate patient identifiers, or uncertain annotation provenance.',
        datasetPlan: 'Use IDC patch data for training and validation, then evaluate an external holdout subset for distribution-shift review.',
        modelPlan: 'Compare DenseNet, EfficientNet, and compact ViT pipelines with shared preprocessing, fixed seeds, and artifact capture.',
        validationPlan: 'Stratified patient-level split with external holdout testing; compare accuracy, F1, AUC, calibration, and reproducibility score.',
        endpoints: 'Primary endpoint: macro F1. Secondary endpoints: AUC, calibration error, artifact completeness, and XAI localization quality.',
        ethicsNotes: 'Public de-identified research data; records document license, data provenance, and research-only use.',
        statisticalPlan: 'Report mean metrics across fixed seeds and compare top models using paired bootstrap confidence intervals.',
        protocolStatus: 'approved',
        version: 'v1.2',
        lastUpdatedAt: new Date('2026-05-18T12:00:00Z'),
      },
      literatureBaselines: [
        {
          paperTitle: 'Deep learning for invasive ductal carcinoma detection in whole slide images',
          authors: 'Cruz-Roa et al.',
          year: 2014,
          venue: 'SPIE Medical Imaging',
          task: 'IDC patch classification',
          dataset: 'Breast histopathology patches',
          modelName: 'CNN baseline',
          accuracy: 84.2,
          f1Score: 82.8,
          auc: 0.91,
          reproducibilityNotes: 'Dataset public, but environment and seed documentation limited.',
          link: 'https://doi.org/10.1117/12.2043872',
          notes: 'Useful lower-bound baseline for modern transfer learning comparison.',
        },
        {
          paperTitle: 'Stain-normalized CNNs for breast cancer histology classification',
          authors: 'Rakhlin et al.',
          year: 2018,
          venue: 'MICCAI Workshop',
          task: 'Breast histology classification',
          dataset: 'BACH and patch cohorts',
          modelName: 'Ensemble CNN',
          accuracy: 87.6,
          f1Score: 86.9,
          auc: 0.94,
          reproducibilityNotes: 'Strong method description; limited executable artifact availability.',
          link: 'https://arxiv.org/abs/1802.00752',
          notes: 'Supports the stain normalization design choice.',
        },
      ],
    });
    console.log(`Created project: ${project.title}`);
  } else {
    console.log(`Project already exists: ${project.title}`);
  }

  let dataset = await Dataset.findOne({ project: project._id, name: 'IDC Histopathology Patch Dataset' });
  if (!dataset) {
    dataset = await Dataset.create({
      name: 'IDC Histopathology Patch Dataset',
      version: 'v3.0-curated',
      source: 'Kaggle / Public pathology archive',
      sourceUrl: 'https://www.kaggle.com/datasets/paultimothymooney/breast-histopathology-images',
      totalSamples: 277524,
      classDistribution: {
        'IDC positive': 78786,
        'IDC negative': 198738,
      },
      classes: ['IDC positive', 'IDC negative'],
      imageSize: '50x50',
      format: 'PNG',
      preprocessingSteps: [
        'Patient-level deduplication',
        'Macenko stain normalization',
        'Background patch filtering',
        'Class imbalance audit',
        'Stratified patient-level train/validation/test split',
      ],
      augmentationTechniques: [
        'Random horizontal and vertical flips',
        'Color jitter for stain variance',
        'Random rotation by 0, 90, 180, or 270 degrees',
        'MixUp alpha 0.2 for training only',
      ],
      description: 'Curated breast histopathology patch dataset for invasive ductal carcinoma detection and reproducibility benchmarking.',
      limitations: 'Class imbalance is substantial; demographic metadata is limited; scanner source variation requires external validation.',
      project: project._id,
      createdBy: user._id,
      licenseType: 'Research / public dataset terms',
      datasetRisk: {
        classBalanceDocumented: true,
        missingDataAssessed: true,
        demographicBiasAssessed: false,
        deviceSourceBiasAssessed: true,
        annotationQualityDocumented: true,
        leakageRiskChecked: true,
        licenseConsentDocumented: true,
        demographicScope: 'Patient demographics are incomplete in the public patch release.',
        deviceSource: 'Mixed pathology scanner sources; site-level metadata partially available.',
        missingDataNotes: 'No missing labels after curation; incomplete patient-level demographic attributes remain.',
        annotationQuality: 'Labels derived from pathology annotations and reviewed at patient split level.',
        leakageNotes: 'Patient-level split prevents adjacent patch leakage across train and test partitions.',
        riskNotes: 'Main residual risk is demographic under-documentation; external cohort testing is recommended.',
      },
    });
    console.log(`Created dataset: ${dataset.name}`);
  } else {
    console.log(`Dataset already exists: ${dataset.name}`);
  }

  const experiments = [
    {
      name: 'DenseNet121 + Macenko Normalization',
      description: 'Primary reproducible benchmark using pretrained DenseNet121 with stain normalization and patient-level split validation.',
      experimentTemplate: 'classification',
      modelName: 'DenseNet121',
      modelType: 'CNN',
      framework: 'PyTorch',
      pretrained: true,
      hyperparameters: { learningRate: 0.0002, batchSize: 128, epochs: 45, optimizer: 'AdamW', lossFunction: 'weighted_cross_entropy', dropout: 0.25 },
      trainTestSplit: { trainRatio: 0.72, validationRatio: 0.14, testRatio: 0.14, stratified: true, randomSeed: 2026 },
      metrics: { accuracy: 91.8, precision: 89.9, recall: 90.7, f1Score: 90.3, auc: 0.962, loss: 0.216, validationAccuracy: 90.5, validationLoss: 0.241, testAccuracy: 91.1 },
      trainingEnvironment: { gpu: 'NVIDIA RTX 4090 24GB', cpu: 'AMD Ryzen 9 7950X', ram: '128 GB DDR5', trainingTime: '2h 36m', os: 'Ubuntu 22.04 LTS' },
      xaiMethod: 'Grad-CAM',
      xaiEvidenceUrl: 'https://example.com/xai/breast-densenet-gradcam',
      xaiNotes: 'Grad-CAM highlights epithelial regions and avoids background-heavy tissue patches in most positive cases.',
      reproducibilityChecklist: { codeAvailable: true, dataAvailable: true, seedFixed: true, environmentDocumented: true, hyperparamsLogged: true, resultsReproduced: true, peerReviewed: true, xaiProvided: true },
      preprocessingMethod: 'Macenko stain normalization, patient-level split, weighted sampling, and patch tensor conversion.',
      limitations: 'External validation still shows lower recall on high-stain-variance patches.',
      conclusions: 'DenseNet121 is the strongest candidate with high F1, strong XAI alignment, and complete reproducibility artifacts.',
      githubLink: 'https://github.com/example/breast-histo-repro-benchmark/tree/densenet121',
      notebookLink: 'https://colab.research.google.com/example/breast-densenet121',
      modelCardLink: 'https://example.com/model-cards/breast-densenet121',
      environmentFileLink: 'https://github.com/example/breast-histo-repro-benchmark/blob/main/environment.yml',
      requirementsLink: 'https://github.com/example/breast-histo-repro-benchmark/blob/main/requirements.txt',
      weightsLink: 'https://example.com/weights/breast-densenet121.pt',
      protocolLink: 'https://example.com/protocols/breast-histo-v1.2',
      artifactNotes: 'Full artifact package includes code, model card, fixed seed logs, conda environment, requirements, and trained weights.',
      status: 'completed',
      reviewStatus: 'approved',
      reviewRequestedAt: new Date('2026-05-19T10:00:00Z'),
      reviewedAt: new Date('2026-05-21T11:00:00Z'),
      reviewDecisionNote: 'Approved with complete artifact package.',
    },
    {
      name: 'EfficientNetV2-S External Holdout',
      description: 'Compact CNN pipeline optimized for external holdout robustness and stain variance sensitivity testing.',
      experimentTemplate: 'classification',
      modelName: 'EfficientNetV2-S',
      modelType: 'CNN',
      framework: 'TensorFlow',
      pretrained: true,
      hyperparameters: { learningRate: 0.00015, batchSize: 96, epochs: 55, optimizer: 'Adam', lossFunction: 'focal_loss', dropout: 0.35 },
      trainTestSplit: { trainRatio: 0.7, validationRatio: 0.15, testRatio: 0.15, stratified: true, randomSeed: 2026 },
      metrics: { accuracy: 90.6, precision: 88.4, recall: 89.8, f1Score: 89.1, auc: 0.954, loss: 0.238, validationAccuracy: 89.2, validationLoss: 0.267, testAccuracy: 89.7 },
      trainingEnvironment: { gpu: 'NVIDIA A6000 48GB', cpu: 'Intel Xeon Gold 6338', ram: '192 GB', trainingTime: '3h 14m', os: 'Ubuntu 22.04 LTS' },
      xaiMethod: 'Integrated Gradients',
      xaiEvidenceUrl: 'https://example.com/xai/breast-efficientnet-ig',
      xaiNotes: 'Integrated gradients shows sharper focus around ductal structures but more sensitivity to stain normalization than DenseNet.',
      reproducibilityChecklist: { codeAvailable: true, dataAvailable: true, seedFixed: true, environmentDocumented: true, hyperparamsLogged: true, resultsReproduced: true, peerReviewed: false, xaiProvided: true },
      preprocessingMethod: 'Macenko normalization with TensorFlow augmentation and focal-loss class imbalance handling.',
      limitations: 'Artifact package is complete except formal peer review sign-off.',
      conclusions: 'EfficientNetV2-S is a strong deployment-minded alternative with slightly lower F1 than DenseNet121.',
      githubLink: 'https://github.com/example/breast-histo-repro-benchmark/tree/efficientnetv2',
      notebookLink: 'https://colab.research.google.com/example/breast-efficientnetv2',
      modelCardLink: 'https://example.com/model-cards/breast-efficientnetv2',
      environmentFileLink: 'https://github.com/example/breast-histo-repro-benchmark/blob/main/tf-environment.yml',
      requirementsLink: 'https://github.com/example/breast-histo-repro-benchmark/blob/main/tf-requirements.txt',
      weightsLink: 'https://example.com/weights/breast-efficientnetv2.h5',
      protocolLink: 'https://example.com/protocols/breast-histo-v1.2',
      artifactNotes: 'Good artifact coverage; peer review record pending.',
      status: 'completed',
      reviewStatus: 'pending',
      reviewRequestedAt: new Date('2026-05-22T09:15:00Z'),
    },
    {
      name: 'Compact ViT Patch Attention Study',
      description: 'Transformer experiment studying whether patch-level attention provides useful interpretability on small histology patches.',
      experimentTemplate: 'xai-study',
      modelName: 'Compact ViT',
      modelType: 'Transformer',
      framework: 'PyTorch',
      pretrained: true,
      hyperparameters: { learningRate: 0.00008, batchSize: 64, epochs: 70, optimizer: 'AdamW', lossFunction: 'weighted_cross_entropy', dropout: 0.1 },
      trainTestSplit: { trainRatio: 0.72, validationRatio: 0.14, testRatio: 0.14, stratified: true, randomSeed: 2026 },
      metrics: { accuracy: 88.9, precision: 86.2, recall: 88.0, f1Score: 87.1, auc: 0.936, loss: 0.284, validationAccuracy: 87.6, validationLoss: 0.312, testAccuracy: 88.1 },
      trainingEnvironment: { gpu: 'NVIDIA RTX 4090 24GB', cpu: 'AMD Ryzen 9 7950X', ram: '128 GB DDR5', trainingTime: '5h 48m', os: 'Ubuntu 22.04 LTS' },
      xaiMethod: 'Attention Map',
      xaiEvidenceUrl: 'https://example.com/xai/breast-compact-vit-attention',
      xaiNotes: 'Attention maps are visually useful but less stable than Grad-CAM across stain perturbation tests.',
      reproducibilityChecklist: { codeAvailable: true, dataAvailable: true, seedFixed: true, environmentDocumented: true, hyperparamsLogged: true, resultsReproduced: false, peerReviewed: false, xaiProvided: true },
      preprocessingMethod: 'Patch tokenization after Macenko normalization; attention rollout saved for selected positive and negative patches.',
      limitations: 'Lower reproducibility because repeated runs vary more than CNN pipelines.',
      conclusions: 'Compact ViT is useful as an interpretability comparison but not the leading reproducible model.',
      githubLink: 'https://github.com/example/breast-histo-repro-benchmark/tree/compact-vit',
      notebookLink: 'https://colab.research.google.com/example/breast-compact-vit',
      modelCardLink: 'https://example.com/model-cards/breast-compact-vit',
      environmentFileLink: 'https://github.com/example/breast-histo-repro-benchmark/blob/main/vit-environment.yml',
      requirementsLink: 'https://github.com/example/breast-histo-repro-benchmark/blob/main/vit-requirements.txt',
      protocolLink: 'https://example.com/protocols/breast-histo-v1.2',
      artifactNotes: 'Weights are intentionally withheld until repeated-run variance is resolved.',
      status: 'completed',
      reviewStatus: 'draft',
    },
  ];

  let createdExperiments = 0;
  for (const experiment of experiments) {
    const existing = await Experiment.findOne({ project: project._id, name: experiment.name });
    if (!existing) {
      await Experiment.create({
        ...experiment,
        project: project._id,
        dataset: dataset._id,
        createdBy: user._id,
      });
      createdExperiments += 1;
      console.log(`Created experiment: ${experiment.name}`);
    } else {
      console.log(`Experiment already exists: ${experiment.name}`);
    }
  }

  console.log('Seed complete');
  console.log(`Project: ${project.title}`);
  console.log(`New experiments: ${createdExperiments}`);
  await mongoose.disconnect();
}

seedBreastSample()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Seed failed:', error.message);
    process.exit(1);
  });
