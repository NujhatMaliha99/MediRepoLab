export const DATASET_RISK_ITEMS = [
  { key: 'classBalanceDocumented', label: 'Class balance documented', suggestion: 'Add class counts or imbalance notes for each diagnostic class.' },
  { key: 'missingDataAssessed', label: 'Missing data assessed', suggestion: 'Document missing images, labels, metadata, or excluded records.' },
  { key: 'demographicBiasAssessed', label: 'Demographic bias assessed', suggestion: 'Describe age, sex, ethnicity, or site coverage where available.' },
  { key: 'deviceSourceBiasAssessed', label: 'Device/source bias assessed', suggestion: 'Record scanner, hospital/source, acquisition protocol, or device variation.' },
  { key: 'annotationQualityDocumented', label: 'Annotation quality documented', suggestion: 'Add reviewer count, labeling protocol, or inter-rater quality notes.' },
  { key: 'leakageRiskChecked', label: 'Leakage risk checked', suggestion: 'Confirm patient-level split, duplicate handling, and no train/test contamination.' },
  { key: 'licenseConsentDocumented', label: 'License/consent documented', suggestion: 'Record license, consent, IRB, or public-use constraints.' },
];

export const getDatasetRiskScore = dataset => {
  const checklist = dataset?.datasetRisk || {};
  const missing = DATASET_RISK_ITEMS.filter(item => !checklist[item.key]).length;
  return Math.round((missing / DATASET_RISK_ITEMS.length) * 100);
};

export const getDatasetRiskGrade = score => {
  if (score <= 20) {
    return {
      label: 'Low Risk',
      badgeClass: 'badge-green',
      color: 'var(--accent-green)',
      summary: 'Dataset risk documentation is strong.',
    };
  }
  if (score <= 50) {
    return {
      label: 'Moderate Risk',
      badgeClass: 'badge-orange',
      color: 'var(--accent-orange)',
      summary: 'Dataset is usable, but important risk documentation is missing.',
    };
  }
  return {
    label: 'High Risk',
    badgeClass: 'badge-red',
    color: 'var(--accent-red)',
    summary: 'Dataset needs stronger bias and quality documentation before external review.',
  };
};

export const getMissingRiskItems = dataset => {
  const checklist = dataset?.datasetRisk || {};
  return DATASET_RISK_ITEMS.filter(item => !checklist[item.key]);
};

export const getDatasetRiskSuggestions = (dataset, limit = 4) => {
  const missing = getMissingRiskItems(dataset);
  if (!missing.length) return ['Keep risk notes current when source data or annotations change.'];
  return missing.slice(0, limit).map(item => item.suggestion);
};

export const getProjectDatasetRiskSummary = datasets => {
  if (!datasets?.length) {
    const grade = getDatasetRiskGrade(100);
    return { average: 100, grade, highRiskCount: 0 };
  }
  const average = Math.round(datasets.reduce((sum, dataset) => sum + getDatasetRiskScore(dataset), 0) / datasets.length);
  const grade = getDatasetRiskGrade(average);
  const highRiskCount = datasets.filter(dataset => getDatasetRiskScore(dataset) > 50).length;
  return { average, grade, highRiskCount };
};
