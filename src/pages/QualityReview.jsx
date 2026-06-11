import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Database,
  FileWarning,
  Microscope,
  SearchCheck,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import api from '../api/axios';
import {
  getDatasetRiskGrade,
  getDatasetRiskScore,
  getMissingRiskItems,
  getProjectDatasetRiskSummary,
} from '../utils/datasetRisk';
import { getAverageReproScore, getReproGrade } from '../utils/reproducibility';
import { getProjectArtifactSummary } from '../utils/artifacts';

const projectMatches = (record, projectId) => (record.project?._id || record.project) === projectId;

const scoreColor = score => (
  score <= 20 ? 'var(--accent-green)' : score <= 50 ? 'var(--accent-orange)' : 'var(--accent-red)'
);

const protocolCompletion = protocol => {
  const fields = [
    'objective',
    'hypothesis',
    'studyType',
    'inclusionCriteria',
    'exclusionCriteria',
    'datasetPlan',
    'modelPlan',
    'validationPlan',
    'endpoints',
    'statisticalPlan',
    'ethicsNotes',
  ];
  const filled = fields.filter(field => String(protocol?.[field] || '').trim()).length;
  return Math.round((filled / fields.length) * 100);
};

const getSeverityClass = severity => (
  severity === 'High' ? 'badge-red' : severity === 'Medium' ? 'badge-orange' : 'badge-cyan'
);

const buildQualityRows = datasets => {
  const fieldGroups = [
    { key: 'classBalanceDocumented', label: 'Class imbalance', icon: Database },
    { key: 'missingDataAssessed', label: 'Missing data', icon: FileWarning },
    { key: 'demographicBiasAssessed', label: 'Demographic bias', icon: ShieldAlert },
    { key: 'annotationQualityDocumented', label: 'Annotation quality', icon: SearchCheck },
    { key: 'leakageRiskChecked', label: 'Leakage risk', icon: AlertTriangle },
    { key: 'licenseConsentDocumented', label: 'License status', icon: ShieldCheck },
  ];

  return fieldGroups.map(group => {
    const covered = datasets.filter(dataset => dataset.datasetRisk?.[group.key]).length;
    const percent = datasets.length ? Math.round((covered / datasets.length) * 100) : 0;
    return {
      ...group,
      covered,
      total: datasets.length,
      percent,
      status: percent === 100 ? 'Complete' : percent >= 50 ? 'Partial' : 'Missing',
    };
  });
};

const buildReviewerFindings = (project, datasets, experiments) => {
  const findings = [];
  const riskSummary = getProjectDatasetRiskSummary(datasets);
  const avgRepro = getAverageReproScore(experiments);
  const artifactSummary = getProjectArtifactSummary(experiments);
  const protocolPercent = protocolCompletion(project.studyProtocol);
  const completedRuns = experiments.filter(experiment => experiment.status === 'completed').length;
  const xaiCount = experiments.filter(experiment => experiment.xaiMethod && experiment.xaiMethod !== 'None').length;
  const modelCardCount = experiments.filter(experiment => experiment.modelCardLink).length;
  const externalValidation = experiments.some(experiment => (
    /external|holdout|multi.?center|independent/i.test(`${experiment.name} ${experiment.description} ${experiment.validationPlan || ''}`)
  ));

  if (protocolPercent < 75) {
    findings.push({
      severity: 'High',
      title: 'Study protocol is not reviewer-ready',
      detail: `Protocol is ${protocolPercent}% complete. Reviewers will expect objective, eligibility criteria, validation plan, endpoints, ethics notes, and statistical plan.`,
      action: 'Complete the protocol section before report submission.',
    });
  }

  if (!datasets.length) {
    findings.push({
      severity: 'High',
      title: 'No dataset registered',
      detail: 'The project cannot be independently evaluated without dataset provenance, sample counts, classes, and access notes.',
      action: 'Add at least one dataset with source, version, class distribution, and limitations.',
    });
  } else if (riskSummary.average > 35) {
    findings.push({
      severity: riskSummary.average > 50 ? 'High' : 'Medium',
      title: 'Dataset bias documentation is incomplete',
      detail: `Average dataset risk gap is ${riskSummary.average}%. Bias, missing data, annotation quality, leakage, or license documentation needs improvement.`,
      action: 'Complete dataset risk checklist items for each linked dataset.',
    });
  }

  if (!externalValidation) {
    findings.push({
      severity: 'Medium',
      title: 'External validation is missing',
      detail: 'No experiment appears to document external holdout, independent cohort, multi-center, or distribution-shift validation.',
      action: 'Add an external validation experiment or document why it is out of scope.',
    });
  }

  if (completedRuns < 2) {
    findings.push({
      severity: 'Medium',
      title: 'Experiment comparison is weak',
      detail: `${completedRuns} completed run${completedRuns === 1 ? '' : 's'} found. Strong reports need baseline and candidate model comparison.`,
      action: 'Add at least one baseline and one final candidate experiment.',
    });
  }

  if (avgRepro < 70) {
    findings.push({
      severity: 'High',
      title: 'Reproducibility evidence is weak',
      detail: `Average reproducibility is ${avgRepro}%. Seeds, code, data access, environment, hyperparameters, and reproduced-result status are expected.`,
      action: 'Improve experiment reproducibility checklist completion.',
    });
  }

  if (!modelCardCount) {
    findings.push({
      severity: 'Medium',
      title: 'Model card missing',
      detail: 'No experiment has a model card link. This weakens transparency around intended use, limitations, and evaluation context.',
      action: 'Add a model card for the strongest model.',
    });
  }

  if (artifactSummary.average < 55) {
    findings.push({
      severity: 'Medium',
      title: 'Research artifacts are incomplete',
      detail: `Artifact coverage is ${artifactSummary.average}%. Code, notebooks, environments, requirements, weights, and protocol links should be packaged.`,
      action: 'Attach missing artifacts before exporting the report.',
    });
  }

  if (!xaiCount) {
    findings.push({
      severity: 'Medium',
      title: 'XAI evidence missing',
      detail: 'No explainability record is attached. Medical AI reports usually need visual or feature-level evidence for model behavior.',
      action: 'Add Grad-CAM, SHAP, LIME, attention maps, or integrated gradients evidence.',
    });
  }

  if (!project.literatureBaselines?.length) {
    findings.push({
      severity: 'Low',
      title: 'Literature baseline not documented',
      detail: 'The project has no comparable published baseline methods or metrics.',
      action: 'Add 2-3 literature baselines with dataset, model, accuracy, F1, AUC, and reproducibility notes.',
    });
  }

  if (!findings.length) {
    findings.push({
      severity: 'Low',
      title: 'Project is in strong review shape',
      detail: 'Core dataset, experiment, artifact, XAI, and reproducibility checks are covered.',
      action: 'Export the report and package manifest, then keep links current.',
    });
  }

  return findings;
};

const QualityReview = () => {
  const [data, setData] = useState({ projects: [], datasets: [], experiments: [] });
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectRes, datasetRes, experimentRes] = await Promise.all([
          api.get('/projects'),
          api.get('/datasets'),
          api.get('/experiments'),
        ]);
        setData({
          projects: projectRes.data,
          datasets: datasetRes.data,
          experiments: experimentRes.data,
        });
        if (projectRes.data.length) setSelectedProjectId(projectRes.data[0]._id);
      } catch (error) {
        toast.error('Failed to load quality review data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const selectedProject = data.projects.find(project => project._id === selectedProjectId);
  const projectDatasets = data.datasets.filter(dataset => projectMatches(dataset, selectedProjectId));
  const projectExperiments = data.experiments.filter(experiment => projectMatches(experiment, selectedProjectId));

  const reviewData = useMemo(() => {
    if (!selectedProject) return null;
    const riskSummary = getProjectDatasetRiskSummary(projectDatasets);
    const qualityRows = buildQualityRows(projectDatasets);
    const findings = buildReviewerFindings(selectedProject, projectDatasets, projectExperiments);
    const avgRepro = getAverageReproScore(projectExperiments);
    const artifactSummary = getProjectArtifactSummary(projectExperiments);

    return {
      riskSummary,
      qualityRows,
      findings,
      avgRepro,
      reproGrade: getReproGrade(avgRepro),
      artifactSummary,
      highFindings: findings.filter(finding => finding.severity === 'High').length,
      mediumFindings: findings.filter(finding => finding.severity === 'Medium').length,
      riskGrade: getDatasetRiskGrade(riskSummary.average),
    };
  }, [projectDatasets, projectExperiments, selectedProject]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;
  }

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quality Review</h1>
          <p className="page-subtitle">
            Monitor dataset quality and run an AI-style project reviewer before reports, supervisor review, or publication packaging.
          </p>
        </div>
        <div className="page-actions">
          <select className="input-field" style={{ minWidth: 290 }} value={selectedProjectId} onChange={event => setSelectedProjectId(event.target.value)}>
            {data.projects.map(project => <option value={project._id} key={project._id}>{project.title}</option>)}
          </select>
          {selectedProject && (
            <Link className="btn-secondary" to={`/projects/${selectedProject._id}`}>
              Open Workspace <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </div>

      {!selectedProject || !reviewData ? (
        <div className="academic-card">
          <div className="empty-state">
            <Brain className="empty-state-icon" />
            <p>Create a project to run quality review.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="quality-review-hero">
            <div>
              <div className="project-eyebrow"><Brain size={14} /> AI reviewer</div>
              <h2>{selectedProject.title}</h2>
              <p>{selectedProject.description}</p>
              <div className="project-badge-row">
                <span className={`badge ${reviewData.riskGrade.badgeClass}`}>Dataset: {reviewData.riskGrade.label}</span>
                <span className={`badge ${reviewData.reproGrade.badgeClass}`}>Repro: {reviewData.reproGrade.label}</span>
                <span className={`badge ${reviewData.highFindings ? 'badge-red' : 'badge-green'}`}>{reviewData.highFindings} high-priority findings</span>
              </div>
            </div>
            <div className="quality-review-score" style={{ '--risk': `${100 - reviewData.riskSummary.average}%`, '--risk-color': scoreColor(reviewData.riskSummary.average) }}>
              <div>
                <strong>{100 - reviewData.riskSummary.average}%</strong>
                <span>Dataset confidence</span>
              </div>
            </div>
          </div>

          <div className="quality-summary-grid">
            <div><span>Datasets</span><strong>{projectDatasets.length}</strong></div>
            <div><span>Experiments</span><strong>{projectExperiments.length}</strong></div>
            <div><span>Artifact coverage</span><strong>{reviewData.artifactSummary.average}%</strong></div>
            <div><span>Medium findings</span><strong>{reviewData.mediumFindings}</strong></div>
          </div>

          <div className="two-column-grid" style={{ alignItems: 'start' }}>
            <div className="academic-card" style={{ padding: 24 }}>
              <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} color="var(--accent-cyan)" /> Dataset Quality Monitor
              </div>
              <div className="quality-monitor-list">
                {reviewData.qualityRows.map(row => {
                  const Icon = row.icon;
                  return (
                    <div className={`quality-monitor-row ${row.percent === 100 ? 'complete' : ''}`} key={row.key}>
                      <div className="quality-monitor-icon"><Icon size={18} /></div>
                      <div>
                        <div className="quality-monitor-top">
                          <strong>{row.label}</strong>
                          <span>{row.covered}/{row.total || 0}</span>
                        </div>
                        <div className="quality-monitor-bar">
                          <div style={{ width: `${row.percent}%`, background: row.percent === 100 ? 'var(--accent-green)' : row.percent >= 50 ? 'var(--accent-orange)' : 'var(--accent-red)' }} />
                        </div>
                      </div>
                      <span className={`badge ${row.percent === 100 ? 'badge-green' : row.percent >= 50 ? 'badge-orange' : 'badge-red'}`}>{row.status}</span>
                    </div>
                  );
                })}
              </div>

              <div className="dataset-risk-table">
                {projectDatasets.length ? projectDatasets.map(dataset => {
                  const score = getDatasetRiskScore(dataset);
                  const grade = getDatasetRiskGrade(score);
                  return (
                    <div className="dataset-risk-card" key={dataset._id}>
                      <div>
                        <strong>{dataset.name}</strong>
                        <span>{dataset.source || 'Source pending'} - {dataset.totalSamples || 0} samples</span>
                      </div>
                      <span className={`badge ${grade.badgeClass}`}>{grade.label}</span>
                      <p>{getMissingRiskItems(dataset).slice(0, 2).map(item => item.label).join(', ') || 'Risk checklist complete.'}</p>
                    </div>
                  );
                }) : (
                  <div className="empty-state" style={{ padding: '34px 0' }}>
                    <Database className="empty-state-icon" />
                    <p>No linked datasets for this project.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="academic-card" style={{ padding: 24 }}>
              <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Microscope size={18} color="var(--accent-cyan)" /> AI Reviewer Findings
              </div>
              <div className="ai-review-list">
                {reviewData.findings.map(finding => (
                  <div className={`ai-review-card severity-${finding.severity.toLowerCase()}`} key={`${finding.title}-${finding.action}`}>
                    <div>
                      {finding.severity === 'High' ? <AlertTriangle size={18} /> : finding.severity === 'Medium' ? <ShieldAlert size={18} /> : <CheckCircle2 size={18} />}
                      <span className={`badge ${getSeverityClass(finding.severity)}`}>{finding.severity}</span>
                    </div>
                    <h3>{finding.title}</h3>
                    <p>{finding.detail}</p>
                    <strong>{finding.action}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default QualityReview;
