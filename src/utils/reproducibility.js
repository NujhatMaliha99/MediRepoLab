export const REPRO_CHECKLIST_ITEMS = [
  { key: 'codeAvailable', label: 'Code repository linked', suggestion: 'Attach a public repository, notebook, or code archive.' },
  { key: 'dataAvailable', label: 'Dataset source provided', suggestion: 'Link the dataset source and document access requirements.' },
  { key: 'seedFixed', label: 'Random seed recorded', suggestion: 'Record the random seed used for data split and training.' },
  { key: 'environmentDocumented', label: 'Environment details documented', suggestion: 'Add GPU/CPU, OS, library versions, or an environment file.' },
  { key: 'hyperparamsLogged', label: 'Hyperparameters recorded', suggestion: 'Fill learning rate, batch size, epochs, optimizer, and loss function.' },
  { key: 'resultsReproduced', label: 'Results are reproducible', suggestion: 'Mark reproduction only after rerunning or independently verifying results.' },
  { key: 'peerReviewed', label: 'Peer/supervisor reviewed', suggestion: 'Ask a supervisor or collaborator to review the experiment record.' },
  { key: 'xaiProvided', label: 'XAI evidence provided', suggestion: 'Attach Grad-CAM, SHAP, LIME, or other explainability evidence.' },
];

export const getReproScore = experiment => Number(experiment?.reproducibilityScore || 0);

export const getReproGrade = score => {
  if (score >= 85) {
    return {
      label: 'Excellent',
      badgeClass: 'badge-green',
      color: 'var(--accent-green)',
      summary: 'Strong enough for thesis, reviewer, or funding documentation.',
    };
  }
  if (score >= 70) {
    return {
      label: 'Good',
      badgeClass: 'badge-cyan',
      color: 'var(--accent-cyan)',
      summary: 'Mostly reproducible, with a few documentation gaps to close.',
    };
  }
  if (score >= 50) {
    return {
      label: 'Needs Work',
      badgeClass: 'badge-orange',
      color: 'var(--accent-orange)',
      summary: 'Usable internally, but missing key evidence for external review.',
    };
  }
  return {
    label: 'At Risk',
    badgeClass: 'badge-red',
    color: 'var(--accent-red)',
    summary: 'Too many missing details for reliable reproduction.',
  };
};

export const getMissingReproItems = experiment => {
  const checklist = experiment?.reproducibilityChecklist || {};
  return REPRO_CHECKLIST_ITEMS.filter(item => !checklist[item.key]);
};

export const getReproSuggestions = (experiment, limit = 4) => {
  const missing = getMissingReproItems(experiment);
  if (!missing.length) {
    return ['Keep the record current when datasets, code, or environment details change.'];
  }
  return missing.slice(0, limit).map(item => item.suggestion);
};

export const getAverageReproScore = experiments => {
  if (!experiments?.length) return 0;
  return Math.round(experiments.reduce((sum, experiment) => sum + getReproScore(experiment), 0) / experiments.length);
};

export const getProjectReproSummary = experiments => {
  const average = getAverageReproScore(experiments);
  const grade = getReproGrade(average);
  const atRisk = (experiments || []).filter(experiment => getReproScore(experiment) < 50).length;
  return { average, grade, atRisk };
};
