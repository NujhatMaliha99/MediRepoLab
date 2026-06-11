export const ARTIFACT_ITEMS = [
  { key: 'githubLink', label: 'Code repository', shortLabel: 'Code', suggestion: 'Attach the GitHub or source repository used for this run.' },
  { key: 'notebookLink', label: 'Notebook', shortLabel: 'Notebook', suggestion: 'Attach a Colab, Jupyter, or experiment notebook.' },
  { key: 'modelCardLink', label: 'Model card', shortLabel: 'Model Card', suggestion: 'Add a model card describing intended use, limits, and evaluation data.' },
  { key: 'environmentFileLink', label: 'Environment YAML', shortLabel: 'Env', suggestion: 'Link an environment.yml, Dockerfile, or runtime specification.' },
  { key: 'requirementsLink', label: 'Requirements file', shortLabel: 'Requirements', suggestion: 'Link requirements.txt or package lock metadata.' },
  { key: 'weightsLink', label: 'Weights/checkpoint', shortLabel: 'Weights', suggestion: 'Attach the trained weights, checkpoint, or release artifact.' },
  { key: 'protocolLink', label: 'Protocol or model card notes', shortLabel: 'Protocol', suggestion: 'Link the training protocol, preregistration, or experiment plan.' },
];

export const getExperimentArtifacts = experiment => (
  ARTIFACT_ITEMS.map(item => ({
    ...item,
    value: experiment?.[item.key] || '',
    present: Boolean(experiment?.[item.key]),
  }))
);

export const getArtifactReadiness = experiment => {
  const artifacts = getExperimentArtifacts(experiment);
  const presentCount = artifacts.filter(item => item.present).length;
  const total = artifacts.length;
  const percent = total ? Math.round((presentCount / total) * 100) : 0;

  if (percent >= 85) {
    return { percent, presentCount, total, label: 'Complete', badgeClass: 'badge-green', color: 'var(--accent-green)' };
  }
  if (percent >= 55) {
    return { percent, presentCount, total, label: 'Strong', badgeClass: 'badge-cyan', color: 'var(--accent-cyan)' };
  }
  if (percent >= 25) {
    return { percent, presentCount, total, label: 'Partial', badgeClass: 'badge-orange', color: 'var(--accent-orange)' };
  }
  return { percent, presentCount, total, label: 'Missing', badgeClass: 'badge-red', color: 'var(--accent-red)' };
};

export const getArtifactSuggestions = (experiment, limit = 3) => {
  const missing = getExperimentArtifacts(experiment).filter(item => !item.present);
  if (!missing.length) return ['Artifact package is complete. Keep links current as new runs are published.'];
  return missing.slice(0, limit).map(item => item.suggestion);
};

export const getProjectArtifactSummary = experiments => {
  const runs = experiments || [];
  if (!runs.length) {
    const empty = getArtifactReadiness({});
    return { average: 0, grade: empty, completeCount: 0, missingCount: 0 };
  }
  const readiness = runs.map(getArtifactReadiness);
  const average = Math.round(readiness.reduce((sum, item) => sum + item.percent, 0) / readiness.length);
  const grade = getArtifactReadiness(Object.fromEntries(
    ARTIFACT_ITEMS.map(item => [item.key, average >= 85 ? 'covered' : ''])
  ));
  return {
    average,
    grade: {
      ...grade,
      percent: average,
      label: average >= 85 ? 'Complete' : average >= 55 ? 'Strong' : average >= 25 ? 'Partial' : 'Missing',
      badgeClass: average >= 85 ? 'badge-green' : average >= 55 ? 'badge-cyan' : average >= 25 ? 'badge-orange' : 'badge-red',
      color: average >= 85 ? 'var(--accent-green)' : average >= 55 ? 'var(--accent-cyan)' : average >= 25 ? 'var(--accent-orange)' : 'var(--accent-red)',
    },
    completeCount: readiness.filter(item => item.percent >= 85).length,
    missingCount: readiness.filter(item => item.percent === 0).length,
  };
};
