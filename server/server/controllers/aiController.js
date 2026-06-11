const Project = require('../models/Project');
const Dataset = require('../models/Dataset');
const Experiment = require('../models/Experiment');
const { logActivity } = require('../utils/activityLogger');

/**
 * @desc    Analyze research project or chat with AI copilot
 * @route   POST /api/ai/analyze
 * @access  Private
 */
const analyzeProject = async (req, res) => {
  try {
    const { projectId, mode, userMessage, chatHistory, clientApiKey } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }

    const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        code: 'MISSING_API_KEY',
        message: 'Gemini API Key is missing. Please configure it in the server .env or input it in the AI Copilot settings tab.'
      });
    }

    // Retrieve project context
    const project = await Project.findOne({ _id: projectId, owner: req.user._id });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const datasets = await Dataset.find({ project: projectId });
    const experiments = await Experiment.find({ project: projectId }).populate('dataset');

    // Create details summary for AI context
    const datasetInfo = datasets.map(d => {
      const risk = d.datasetRisk || {};
      const riskChecks = [
        risk.classBalanceDocumented ? 'class balance documented' : 'class balance missing',
        risk.missingDataAssessed ? 'missing data assessed' : 'missing data not assessed',
        risk.demographicBiasAssessed ? 'demographic bias assessed' : 'demographic bias not assessed',
        risk.deviceSourceBiasAssessed ? 'device/source bias assessed' : 'device/source bias not assessed',
        risk.annotationQualityDocumented ? 'annotation quality documented' : 'annotation quality missing',
        risk.leakageRiskChecked ? 'leakage checked' : 'leakage not checked',
        risk.licenseConsentDocumented ? 'license/consent documented' : 'license/consent missing',
      ].join('; ');
      return `- **${d.name}** (${d.format}, ${d.totalSamples} samples, source: ${d.source || d.sourceLink || 'N/A'}). Risk checks: ${riskChecks}. Notes: ${risk.riskNotes || d.limitations || 'none'}`;
    }).join('\n') || 'None linked';
    const experimentInfo = experiments.map(e => {
      const checklist = e.reproducibilityChecklist || {};
      const score = e.reproducibilityScore || 0;
      const missing = Object.entries(checklist.toObject ? checklist.toObject() : checklist)
        .filter(([, value]) => !value)
        .map(([key]) => key)
        .join(', ') || 'none';
      const artifacts = [
        `code: ${e.githubLink || 'none'}`,
        `notebook: ${e.notebookLink || 'none'}`,
        `model card: ${e.modelCardLink || 'none'}`,
        `environment file: ${e.environmentFileLink || 'none'}`,
        `requirements: ${e.requirementsLink || 'none'}`,
        `weights/checkpoint: ${e.weightsLink || 'none'}`,
        `protocol: ${e.protocolLink || 'none'}`,
        `artifact notes: ${e.artifactNotes || 'none'}`,
      ].join('; ');
      return `- **${e.name}**: template: ${e.experimentTemplate || 'custom'}, model: ${e.modelName} (${e.modelType}, ${e.framework}), dataset: ${e.dataset?.name || 'N/A'}, accuracy: ${e.metrics?.accuracy || 'N/A'}%, F1: ${e.metrics?.f1Score || 'N/A'}%, AUC: ${e.metrics?.auc || 'N/A'}, repro score: ${score}/100, missing reproducibility items: ${missing}, XAI: ${e.xaiMethod || 'None'}, artifacts: ${artifacts}, limitations: ${e.limitations || 'none'}, conclusions: ${e.conclusions || 'none'}`;
    }).join('\n') || 'None logged';

    let prompt = '';
    let systemInstruction = 'You are the MedReproLab AI Research Copilot, a world-class AI researcher specializing in medical imaging, oncology deep learning models, and scientific reproducibility. Keep your tone professional, academic, and actionable. Format all output using rich GitHub-flavored Markdown.';

    if (mode === 'methodology') {
      prompt = `
You are planning the research methodology for the following project:
**Project Title**: ${project.title}
**Cancer Focus / Area**: ${project.cancerType}
**Tags/Modality**: ${project.tags?.join(', ') || 'General'}
**Research Objective**: ${project.description}

**Current Linked Datasets**:
${datasetInfo}

**Current Logged Experiments**:
${experimentInfo}

Based on this, generate a highly detailed **Research Methodology Blueprint**. Address:
1. **Model Architectures**: Recommmend 2-3 specific model architectures (e.g. CNNs, ViTs, hybrid models) tailored to the cancer type and modality, explaining why they fit.
2. **Loss Functions & Optimization**: Suggest appropriate loss functions (e.g. Weighted Cross Entropy, Dice Loss) and optimizer configurations.
3. **Validation Strategy**: Recommend a rigorous evaluation and cross-validation schema to prevent overfitting.
4. **Modality-Specific Tips**: Provide standard preprocessing (e.g. HU windowing for CT, intensity normalization) or augmentations (e.g. affine transforms, elastic deformation) for this type of medical data.
`;
    } else if (mode === 'reproducibility') {
      prompt = `
You are analyzing the reproducibility of the following research project:
**Project Title**: ${project.title}
**Cancer Focus / Area**: ${project.cancerType}
**Research Objective**: ${project.description}

**Linked Datasets**:
${datasetInfo}

**Logged Experiments**:
${experimentInfo}

Analyze the reproducibility score and checklists of the logged experiments. Generate an **AI Reproducibility Consultant Audit**:
1. **Current State Assessment**: Summarize the overall state of reproducibility in this project.
2. **Critical Gaps**: Identify what parameters, environments, code repositories, or seed configurations are missing.
3. **Actionable Blueprint**: Provide a step-by-step list of specific actions the researcher can take in their code and configuration to achieve a perfect 100/100 reproducibility score.
4. **Importance for Publication**: Briefly explain why addressing these gaps is critical for peer review, MSc/PhD funding, and clinical trust.
`;
    } else if (mode === 'literature') {
      prompt = `
Recommend academic literature, reference codebases, and open datasets for this project:
**Project Title**: ${project.title}
**Cancer Focus / Area**: ${project.cancerType}
**Research Objective**: ${project.description}
**Tags/Modality**: ${project.tags?.join(', ') || 'General'}

Provide a structured **AI Literature & Data Reference Guide**:
1. **Open Datasets**: Recommend 2-3 prominent open-access medical databases relevant to this study (e.g. TCGA, LIDC-IDRI, BraTS, OASIS, Kaggle challenge sets).
2. **Key Publications**: Suggest 3 classic or state-of-the-art research papers (with titles and authors) that the researcher should read and cite.
3. **Reference Implementations**: Mention common public repositories or GitHub code libraries (e.g., nnU-Net, MONAI, TorchIO) they can leverage.
`;
    } else if (mode === 'summary') {
      prompt = `
Create an executive research summary for this MedReproLab project:
**Project Title**: ${project.title}
**Cancer Focus / Area**: ${project.cancerType}
**Research Objective**: ${project.description}
**Tags/Modality**: ${project.tags?.join(', ') || 'General'}

**Datasets**:
${datasetInfo}

**Experiments**:
${experimentInfo}

Write a concise **Project Summary** with:
1. Research aim and clinical motivation.
2. Dataset and experiment status.
3. Current best evidence.
4. Main risks or missing documentation.
5. Recommended next milestone.
`;
    } else if (mode === 'missingDocs') {
      prompt = `
Audit this project for missing documentation:
**Project Title**: ${project.title}
**Research Objective**: ${project.description}

**Datasets**:
${datasetInfo}

**Experiments**:
${experimentInfo}

Generate a **Missing Documentation Audit**:
1. Missing project-level materials.
2. Missing dataset risk/bias documentation.
3. Missing experiment reproducibility artifacts.
4. Missing XAI or clinical-review evidence.
5. Prioritized checklist ordered by publication impact.
`;
    } else if (mode === 'nextExperiment') {
      prompt = `
Suggest the next experiment for this project:
**Project Title**: ${project.title}
**Cancer Focus / Area**: ${project.cancerType}
**Research Objective**: ${project.description}

**Datasets**:
${datasetInfo}

**Existing Experiments**:
${experimentInfo}

Generate a **Next Experiment Recommendation**:
1. One primary next experiment with model architecture, template type, and rationale.
2. Hyperparameters to start with.
3. Evaluation metrics and expected comparison baseline.
4. Dataset/risk checks to complete before running.
5. Reproducibility artifacts to prepare.
`;
    } else if (mode === 'reportConclusion') {
      prompt = `
Draft publication-ready report conclusions for this project:
**Project Title**: ${project.title}
**Cancer Focus / Area**: ${project.cancerType}
**Research Objective**: ${project.description}

**Datasets**:
${datasetInfo}

**Experiments**:
${experimentInfo}

Write a **Report Conclusion Draft** with:
1. Main finding.
2. Evidence strength and limitations.
3. Dataset bias/risk caveats.
4. Reproducibility statement.
5. Future work paragraph.
Keep it suitable for an MSc thesis or research progress report.
`;
    } else if (mode === 'weakRepro') {
      prompt = `
Identify weak reproducibility areas in this project:
**Project Title**: ${project.title}

**Experiments**:
${experimentInfo}

Generate a **Weak Reproducibility Area Review**:
1. Lowest-confidence experiments and why.
2. Missing artifacts or fields.
3. Concrete fixes to improve each weak run.
4. Suggested wording for a reproducibility statement.
`;
    } else if (mode === 'datasetRisk') {
      prompt = `
Analyze dataset bias and clinical-risk concerns for this project:
**Project Title**: ${project.title}
**Cancer Focus / Area**: ${project.cancerType}

**Datasets**:
${datasetInfo}

**Experiments using these datasets**:
${experimentInfo}

Generate a **Dataset Risk Consultant Review**:
1. Highest-risk dataset issues.
2. Class imbalance, missing data, demographic bias, device/source bias, annotation quality, leakage, and license/consent concerns.
3. What should be documented before publication or supervisor review.
4. Practical mitigation steps.
`;
    } else {
      // mode === 'chat'
      // Parse chat history if any
      const historyCtx = chatHistory && chatHistory.length > 0 
        ? chatHistory.map(h => `${h.sender === 'user' ? 'Researcher' : 'AI Copilot'}: ${h.text}`).join('\n')
        : 'No previous chat history.';

      prompt = `
You are discussing a research project with the lead investigator.
**Project Title**: ${project.title}
**Cancer Focus / Area**: ${project.cancerType}
**Research Objective**: ${project.description}
**Linked Datasets**:
${datasetInfo}
**Logged Experiments**:
${experimentInfo}

**Chat History**:
${historyCtx}

**Researcher's Message**: ${userMessage}

Respond directly and professionally to the researcher's query. Suggest next steps or answer technical questions clearly and with academic depth.
`;
    }

    // Call Gemini API with automatic model fallback chain
    // Tries: gemini-2.5-flash → gemini-1.5-flash → gemini-1.5-pro
    const MODELS = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    let lastError = null;
    let replyText = null;

    for (const model of MODELS) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\n\n${prompt}` }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          const code = data?.error?.code;
          const msg  = data?.error?.message || 'Unknown error';
          console.warn(`[AI] Model ${model} failed (${code}): ${msg}`);
          // Only retry on overload/unavailable; surface auth/quota errors immediately
          if (code === 503 || code === 429) { lastError = msg; continue; }
          return res.status(500).json({ message: msg });
        }

        replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
        console.log(`[AI] Used model: ${model}`);
        break; // success
      } catch (fetchErr) {
        console.warn(`[AI] Fetch error for ${model}:`, fetchErr.message);
        lastError = fetchErr.message;
      }
    }

    if (!replyText) {
      return res.status(503).json({
        message: `All Gemini models are currently busy. Please try again in a moment. (${lastError})`
      });
    }

    res.json({ result: replyText });
  } catch (error) {
    console.error('AI Controller Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
};

const callClinicalGemini = async ({ apiKey, prompt, systemInstruction }) => {
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  let lastError = null;

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\n\n${prompt}` }] }],
            generationConfig: { temperature: 0.25, maxOutputTokens: 2200 },
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        const code = data?.error?.code;
        const msg = data?.error?.message || 'Unknown error';
        if (code === 503 || code === 429) {
          lastError = msg;
          continue;
        }
        const error = new Error(msg);
        error.statusCode = 500;
        throw error;
      }

      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
    } catch (error) {
      if (error.statusCode) throw error;
      lastError = error.message;
    }
  }

  const error = new Error(`All Gemini models are currently busy. Please try again in a moment. (${lastError})`);
  error.statusCode = 503;
  throw error;
};

const generateManuscript = async (req, res) => {
  try {
    const { projectId, draftType = 'full', targetVenue = 'MSc thesis chapter', clientApiKey } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }

    const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        code: 'MISSING_API_KEY',
        message: 'Gemini API Key is missing. Configure it in the server .env or save it locally in the Manuscript page.',
      });
    }

    const project = await Project.findOne({ _id: projectId, owner: req.user._id });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const datasets = await Dataset.find({ project: projectId });
    const experiments = await Experiment.find({ project: projectId }).populate('dataset');
    const bestExperiment = [...experiments].sort((a, b) => (b.metrics?.accuracy || 0) - (a.metrics?.accuracy || 0))[0];
    const protocol = project.studyProtocol || {};

    const datasetContext = datasets.map(dataset => (
      `- ${dataset.name}: ${dataset.totalSamples || 'N/A'} samples, format ${dataset.format || 'N/A'}, source ${dataset.source || dataset.sourceLink || 'N/A'}, limitations ${dataset.limitations || dataset.datasetRisk?.riskNotes || 'none'}`
    )).join('\n') || 'No datasets registered.';

    const experimentContext = experiments.map(experiment => (
      `- ${experiment.name}: ${experiment.modelName || 'N/A'} (${experiment.modelType || 'N/A'}, ${experiment.framework || 'N/A'}), dataset ${experiment.dataset?.name || 'N/A'}, accuracy ${experiment.metrics?.accuracy || 'N/A'}%, F1 ${experiment.metrics?.f1Score || 'N/A'}%, AUC ${experiment.metrics?.auc || 'N/A'}, reproducibility ${experiment.reproducibilityScore || 0}/100, XAI ${experiment.xaiMethod || 'None'}, limitations ${experiment.limitations || 'none'}, conclusions ${experiment.conclusions || 'none'}`
    )).join('\n') || 'No experiments logged.';

    const literatureContext = (project.literatureBaselines || []).map(item => (
      `- ${item.paperTitle || 'Untitled paper'} (${item.year || 'N/A'}), ${item.modelName || 'N/A'} on ${item.dataset || 'N/A'}: accuracy ${item.accuracy || 'N/A'}%, F1 ${item.f1Score || 'N/A'}%, AUC ${item.auc || 'N/A'}; notes: ${item.notes || item.reproducibilityNotes || 'none'}`
    )).join('\n') || 'No literature baselines recorded.';

    const sectionInstruction = {
      full: 'Generate a complete structured manuscript/thesis draft.',
      abstract: 'Generate only a polished abstract plus keywords.',
      methods: 'Generate only methodology, dataset, experimental setup, reproducibility, and XAI methods sections.',
      results: 'Generate only results, comparison against baselines, limitations, and conclusion sections.',
      thesis: 'Generate an MSc thesis-style chapter draft with academic subsection headings.',
    }[draftType] || 'Generate a complete structured manuscript/thesis draft.';

    const systemInstruction = `
You are MedReproLab Manuscript AI, an academic research writing assistant for medical AI reproducibility projects.
Do not invent exact results, dataset facts, clinical claims, citations, or approvals that are not present in the provided context.
When evidence is missing, write bracketed placeholders like [add external validation result] or [cite relevant baseline].
Use formal academic English and GitHub-flavored Markdown.
Keep the work research-focused, not patient diagnosis or clinical advice.
`;

    const prompt = `
${sectionInstruction}

Target format: ${targetVenue}

Project:
- Title: ${project.title}
- Research area: ${project.cancerType}
- Objective/description: ${project.description}
- Tags/modality: ${project.tags?.join(', ') || 'not specified'}
- Repository: ${project.githubLink || 'not provided'}
- Paper/preprint: ${project.paperLink || 'not provided'}

Study protocol:
- Version: ${protocol.version || 'v1.0'}
- Status: ${protocol.protocolStatus || 'draft'}
- Study type: ${protocol.studyType || 'not specified'}
- Objective: ${protocol.objective || project.description}
- Hypothesis: ${protocol.hypothesis || 'not specified'}
- Inclusion criteria: ${protocol.inclusionCriteria || 'not specified'}
- Exclusion criteria: ${protocol.exclusionCriteria || 'not specified'}
- Dataset plan: ${protocol.datasetPlan || 'not specified'}
- Model plan: ${protocol.modelPlan || 'not specified'}
- Validation plan: ${protocol.validationPlan || 'not specified'}
- Endpoints: ${protocol.endpoints || 'not specified'}
- Statistical plan: ${protocol.statisticalPlan || 'not specified'}
- Ethics/governance: ${protocol.ethicsNotes || 'not specified'}

Datasets:
${datasetContext}

Experiments:
${experimentContext}

Best current experiment:
${bestExperiment ? `${bestExperiment.name} using ${bestExperiment.modelName}; accuracy ${bestExperiment.metrics?.accuracy || 'N/A'}%, F1 ${bestExperiment.metrics?.f1Score || 'N/A'}%, AUC ${bestExperiment.metrics?.auc || 'N/A'}.` : 'No best experiment available.'}

Literature baselines:
${literatureContext}

Required output:
1. Use clear Markdown headings.
2. Include sections appropriate to the selected draft type.
3. Mark missing evidence with bracketed placeholders.
4. Include a reproducibility statement.
5. Include limitations and future work.
6. End with a short "What to verify before submission" checklist.
`;

    const result = await callClinicalGemini({ apiKey, prompt, systemInstruction });

    await logActivity({
      user: req.user._id,
      project: project._id,
      entityType: 'report',
      entityId: project._id,
      action: 'generated',
      title: `AI manuscript draft generated: ${project.title}`,
      description: `Generated a ${draftType} manuscript draft for ${targetVenue}.`,
      changes: ['AI manuscript draft'],
    });

    res.json({ result });
  } catch (error) {
    console.error('AI Manuscript Error:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Internal Server Error' });
  }
};

const clinicalTriage = async (req, res) => {
  try {
    const {
      age,
      sex,
      symptoms,
      duration,
      severity,
      medicalHistory,
      medications,
      allergies,
      vitals,
      clientApiKey,
    } = req.body;

    if (!symptoms || symptoms.trim().length < 8) {
      return res.status(400).json({ message: 'Please describe the symptoms in more detail.' });
    }

    const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        code: 'MISSING_API_KEY',
        message: 'Gemini API Key is missing. Configure it in the server .env.',
      });
    }

    const systemInstruction = `
You are MedReproLab Clinical Triage AI, a medical safety assistant for educational triage only.
Never present a final diagnosis, certainty, or treatment prescription.
Provide possible causes to discuss with a licensed clinician, urgency level, red flags, useful questions, and next steps.
If symptoms suggest emergency risk, clearly recommend emergency care now.
Avoid medication dosages, invasive instructions, or reassurance that could delay care.
Format with concise Markdown headings.
`;

    const prompt = `
Patient-reported information:
- Age: ${age || 'not provided'}
- Sex: ${sex || 'not provided'}
- Main symptoms: ${symptoms}
- Duration/onset: ${duration || 'not provided'}
- Severity: ${severity || 'not provided'}
- Medical history: ${medicalHistory || 'not provided'}
- Current medications: ${medications || 'not provided'}
- Allergies: ${allergies || 'not provided'}
- Vitals or measurements: ${vitals || 'not provided'}

Return:
1. **Safety Notice**: say this is not a diagnosis.
2. **Urgency Level**: Emergency / Same-day care / Routine appointment / Self-care monitoring, with rationale.
3. **Red Flags**: symptoms that require urgent/emergency care.
4. **Possible Conditions to Discuss With a Clinician**: 3-6 possibilities, with why they might fit and what information is missing.
5. **Next Best Steps**: practical non-prescriptive steps, including what clinician or service to contact.
6. **Questions a Clinician May Ask**.
`;

    const result = await callClinicalGemini({ apiKey, prompt, systemInstruction });
    res.json({ result });
  } catch (error) {
    console.error('Clinical Triage Error:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Internal Server Error' });
  }
};

module.exports = { analyzeProject, generateManuscript, clinicalTriage };
