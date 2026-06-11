/**
 * MedReproLab - Sample Data Seed Script
 * Run with: node seedSample.js
 * Creates: 1 demo user, 1 research project, 1 dataset, and 3 experiments
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// ── Models ──────────────────────────────────────────────────────────────────
const User       = require('./models/User');
const Project    = require('./models/Project');
const Dataset    = require('./models/Dataset');
const Experiment = require('./models/Experiment');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅  Connected to MongoDB');

  // ── 1. Demo User ────────────────────────────────────────────────────────
  // NOTE: Pass plaintext password — the User model's pre('save') hook hashes it.
  // Do NOT pre-hash here or the password will be double-hashed and unverifiable.
  const email = 'demo@medreprolab.ai';
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name:        'Dr. Ayasha Patel',
      email,
      password:    'Demo@1234',   // plaintext — model hashes it once via pre('save')
      institution: 'Harvard Medical School',
      role:        'researcher',
    });
    console.log('👤  Created demo user:', email);
  } else {
    console.log('👤  Demo user already exists:', email);
  }

  // ── 2. Project ──────────────────────────────────────────────────────────
  let project = await Project.findOne({ owner: user._id, title: /Liver Cancer/ });

  if (!project) {
    project = await Project.create({
      title:       'Deep Learning for Liver Cancer Detection via CT Imaging',
      description: `This project investigates the reproducibility of deep learning models applied 
to CT-scan-based liver cancer (hepatocellular carcinoma) detection. 
We benchmark CNN and Transformer architectures on the TCGA-LIHC cohort, 
apply Grad-CAM for XAI evidence, and rigorously document all experimental 
conditions to enable third-party reproduction.`,
      cancerType: 'Liver Cancer',
      status:     'active',
      tags:       ['CT Imaging', 'Deep Learning', 'HCC', 'TCGA', 'Grad-CAM', 'Reproducibility'],
      owner:      user._id,
      githubLink: 'https://github.com/example/liver-cancer-dl',
      paperLink:  'https://doi.org/10.1016/j.media.2024.example',
    });
    console.log('📁  Created project:', project.title);
  } else {
    console.log('📁  Project already exists:', project.title);
  }

  // ── 3. Dataset ──────────────────────────────────────────────────────────
  let dataset = await Dataset.findOne({ project: project._id });

  if (!dataset) {
    dataset = await Dataset.create({
      name:    'TCGA-LIHC CT Scan Dataset',
      version: 'v2.1',
      source:  'TCGA',
      sourceUrl: 'https://portal.gdc.cancer.gov/projects/TCGA-LIHC',
      totalSamples: 4248,
      classDistribution: {
        'Malignant (HCC)': 2891,
        'Benign':          1357,
      },
      imageSize: '224x224',
      format: 'DICOM',
      preprocessingSteps: [
        'DICOM to PNG conversion',
        'Hounsfield Unit windowing (W:400 L:40)',
        'Intensity normalisation [0,1]',
        'Resize to 224×224',
        'Train/Val/Test stratified split (70/15/15)',
      ],
      augmentationTechniques: [
        'Random horizontal flip',
        'Random rotation ±15°',
        'Gaussian noise σ=0.01',
        'Random brightness ±10%',
        'Cutout (16×16 patches)',
      ],
      description: 'TCGA Liver Hepatocellular Carcinoma CT imaging cohort, curated for deep-learning classification benchmarks.',
      licenseType: 'CC BY 4.0',
      project:     project._id,
      createdBy:   user._id,
    });
    console.log('🗂️   Created dataset:', dataset.name);
  } else {
    console.log('🗂️   Dataset already exists for this project.');
  }

  // ── 4. Experiments ──────────────────────────────────────────────────────
  const experimentDefs = [
    {
      name: 'EfficientNetB4 – Baseline',
      description: 'Transfer-learned EfficientNetB4 pretrained on ImageNet fine-tuned on TCGA-LIHC. Serves as the primary baseline for this benchmark.',
      modelName:  'EfficientNetB4',
      modelType:  'CNN',
      framework:  'TensorFlow',
      pretrained: true,
      hyperparameters: {
        learningRate: 0.0001,
        batchSize:    32,
        epochs:       60,
        optimizer:    'Adam',
        lossFunction: 'binary_crossentropy',
        dropout:      0.3,
      },
      trainTestSplit: { trainRatio: 0.7, validationRatio: 0.15, testRatio: 0.15, stratified: true, randomSeed: 42 },
      metrics: {
        accuracy:           95.4,
        precision:          94.8,
        recall:             96.1,
        f1Score:            95.4,
        auc:                0.987,
        loss:               0.142,
        validationAccuracy: 93.2,
        validationLoss:     0.198,
        testAccuracy:       93.8,
      },
      trainingEnvironment: {
        gpu:          'NVIDIA A100 80GB',
        cpu:          'AMD EPYC 7742 (64-core)',
        ram:          '256 GB DDR4',
        trainingTime: '3h 42m',
        os:           'Ubuntu 22.04 LTS',
      },
      xaiMethod:     'Grad-CAM',
      xaiEvidenceUrl: 'https://example.com/gradcam/efficientnetb4',
      xaiNotes: 'Grad-CAM heatmaps confirm that the model focuses on tumour margins and portal-vein regions, consistent with radiologist annotations.',
      reproducibilityChecklist: {
        codeAvailable:        true,
        dataAvailable:        true,
        seedFixed:            true,
        environmentDocumented: true,
        hyperparamsLogged:    true,
        resultsReproduced:    true,
        peerReviewed:         false,
        xaiProvided:          true,
      },
      preprocessingMethod: 'HU windowing + bilinear resize to 224×224 + per-channel ImageNet normalisation',
      limitations: 'Single-centre TCGA cohort; external validation on multi-centre data pending.',
      conclusions:  'EfficientNetB4 achieves SOTA performance on the TCGA-LIHC benchmark with strong interpretability via Grad-CAM.',
      githubLink:   'https://github.com/example/liver-cancer-dl/tree/efficientnet',
      notebookLink: 'https://colab.research.google.com/example/efficientnetb4-lihc',
      status:       'completed',
    },
    {
      name: 'Vision Transformer ViT-B/16 – Attention Baseline',
      description: 'ViT-B/16 pretrained on ImageNet-21k, fine-tuned with patch-level attention maps for XAI. Explores transformer-based detection on the same cohort.',
      modelName:  'ViT-B/16',
      modelType:  'Transformer',
      framework:  'PyTorch',
      pretrained: true,
      hyperparameters: {
        learningRate: 0.00005,
        batchSize:    16,
        epochs:       80,
        optimizer:    'AdamW',
        lossFunction: 'binary_crossentropy',
        dropout:      0.1,
      },
      trainTestSplit: { trainRatio: 0.7, validationRatio: 0.15, testRatio: 0.15, stratified: true, randomSeed: 42 },
      metrics: {
        accuracy:           94.1,
        precision:          93.7,
        recall:             94.6,
        f1Score:            94.1,
        auc:                0.981,
        loss:               0.179,
        validationAccuracy: 91.9,
        validationLoss:     0.221,
        testAccuracy:       92.4,
      },
      trainingEnvironment: {
        gpu:          'NVIDIA A100 80GB',
        cpu:          'AMD EPYC 7742 (64-core)',
        ram:          '256 GB DDR4',
        trainingTime: '6h 18m',
        os:           'Ubuntu 22.04 LTS',
      },
      xaiMethod:      'Attention Map',
      xaiEvidenceUrl: 'https://example.com/attention/vit-b16',
      xaiNotes: 'Attention roll-out highlights tumour-bearing patches. Head 4 shows highest alignment with radiologist ground-truth ROIs.',
      reproducibilityChecklist: {
        codeAvailable:         true,
        dataAvailable:         true,
        seedFixed:             true,
        environmentDocumented: true,
        hyperparamsLogged:     true,
        resultsReproduced:     false,
        peerReviewed:          false,
        xaiProvided:           true,
      },
      preprocessingMethod: 'HU windowing + resize to 224×224 + ViT patch tokenisation (16×16 patches)',
      limitations: 'Requires significantly more compute than CNN baselines; attention maps less spatially precise than Grad-CAM for diagnostic use.',
      conclusions:  'ViT-B/16 is competitive but does not surpass EfficientNetB4; attention maps offer complementary XAI insight.',
      githubLink:   'https://github.com/example/liver-cancer-dl/tree/vit',
      notebookLink: 'https://colab.research.google.com/example/vit-lihc',
      status:       'completed',
    },
    {
      name: 'ResNet50 + SHAP Explainability – Ablation',
      description: 'Ablation study using ResNet50 without pretraining to measure the impact of transfer learning. SHAP values added for feature attribution.',
      modelName:  'ResNet50',
      modelType:  'CNN',
      framework:  'TensorFlow',
      pretrained: false,
      hyperparameters: {
        learningRate: 0.001,
        batchSize:    64,
        epochs:       120,
        optimizer:    'SGD',
        lossFunction: 'binary_crossentropy',
        dropout:      0.5,
      },
      trainTestSplit: { trainRatio: 0.7, validationRatio: 0.15, testRatio: 0.15, stratified: true, randomSeed: 42 },
      metrics: {
        accuracy:           87.3,
        precision:          86.1,
        recall:             88.9,
        f1Score:            87.5,
        auc:                0.941,
        loss:               0.314,
        validationAccuracy: 84.7,
        validationLoss:     0.389,
        testAccuracy:       85.2,
      },
      trainingEnvironment: {
        gpu:          'NVIDIA RTX 3090 24GB',
        cpu:          'Intel Core i9-12900K',
        ram:          '64 GB DDR5',
        trainingTime: '11h 05m',
        os:           'Windows 11 (WSL2)',
      },
      xaiMethod:      'SHAP',
      xaiEvidenceUrl: 'https://example.com/shap/resnet50-ablation',
      xaiNotes: 'SHAP values reveal reliance on edge artefacts when trained from scratch, highlighting the importance of pretrained weights.',
      reproducibilityChecklist: {
        codeAvailable:         true,
        dataAvailable:         true,
        seedFixed:             true,
        environmentDocumented: true,
        hyperparamsLogged:     true,
        resultsReproduced:     true,
        peerReviewed:          true,
        xaiProvided:           true,
      },
      preprocessingMethod: 'HU windowing + resize to 224×224 + z-score normalisation (no ImageNet stats)',
      limitations: 'Training from scratch on medical imaging is data-hungry; performance gap clearly demonstrates value of pretraining.',
      conclusions:  'Confirms that transfer learning is critical; SHAP exposes dataset bias risks when pretraining is skipped.',
      githubLink:   'https://github.com/example/liver-cancer-dl/tree/resnet50-ablation',
      notebookLink: 'https://colab.research.google.com/example/resnet50-ablation',
      status:       'completed',
    },
  ];

  let createdCount = 0;
  for (const def of experimentDefs) {
    const existing = await Experiment.findOne({ project: project._id, name: def.name });
    if (!existing) {
      await Experiment.create({ ...def, project: project._id, dataset: dataset._id, createdBy: user._id });
      console.log(`🧪  Created experiment: ${def.name}`);
      createdCount++;
    } else {
      console.log(`🧪  Experiment already exists: ${def.name}`);
    }
  }

  console.log('\n──────────────────────────────────────────────');
  console.log('✅  Seed complete!');
  console.log('──────────────────────────────────────────────');
  console.log('📧  Login email   :', email);
  console.log('🔑  Login password: Demo@1234');
  console.log('📁  Project       :', project.title);
  console.log(`🧪  Experiments   : ${createdCount} created`);
  console.log('──────────────────────────────────────────────\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
