import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Download,
  ExternalLink,
  FileText,
  GitBranch,
  IdCard,
  Microscope,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import api from '../api/axios';
import { getReproGrade, getReproScore } from '../utils/reproducibility';
import { getArtifactReadiness, getExperimentArtifacts } from '../utils/artifacts';
import { getDatasetRiskGrade, getDatasetRiskScore } from '../utils/datasetRisk';

const modelCardSections = [
  'Model details',
  'Intended use',
  'Training data',
  'Evaluation data',
  'Metrics',
  'Ethical considerations',
  'Limitations',
  'Reproducibility',
];

const metric = value => (typeof value === 'number' ? value : 0);

const buildModelCard = experiment => {
  if (!experiment) return null;
  const reproScore = getReproScore(experiment);
  const reproGrade = getReproGrade(reproScore);
  const artifactReadiness = getArtifactReadiness(experiment);
  const datasetRisk = experiment.dataset ? getDatasetRiskScore(experiment.dataset) : 100;
  const datasetGrade = getDatasetRiskGrade(datasetRisk);
  const artifacts = getExperimentArtifacts(experiment);
  const missingArtifacts = artifacts.filter(item => !item.present);

  const checks = [
    { label: 'Dataset documented', done: Boolean(experiment.dataset?.name && experiment.dataset?.source) },
    { label: 'Performance metrics recorded', done: Boolean(experiment.metrics?.accuracy || experiment.metrics?.f1Score || experiment.metrics?.auc) },
    { label: 'XAI evidence attached', done: Boolean(experiment.xaiMethod && experiment.xaiMethod !== 'None') },
    { label: 'Limitations documented', done: Boolean(experiment.limitations) },
    { label: 'Environment documented', done: Boolean(experiment.environmentFileLink || experiment.requirementsLink || experiment.trainingEnvironment?.gpu) },
    { label: 'Reproducibility strong', done: reproScore >= 70 },
    { label: 'Model card link available', done: Boolean(experiment.modelCardLink) },
  ];
  const completeness = Math.round((checks.filter(check => check.done).length / checks.length) * 100);

  const recommendedUse = experiment.project?.cancerType
    ? `Research support for ${experiment.project.cancerType.toLowerCase()} AI experiments. Not for autonomous clinical diagnosis.`
    : 'Research support for medical AI experiments. Not for autonomous clinical diagnosis.';

  return {
    experiment,
    reproScore,
    reproGrade,
    artifactReadiness,
    datasetRisk,
    datasetGrade,
    artifacts,
    missingArtifacts,
    checks,
    completeness,
    recommendedUse,
  };
};

const modelCardMarkdown = card => {
  const exp = card.experiment;
  const dataset = exp.dataset || {};
  const project = exp.project || {};
  const metrics = exp.metrics || {};
  const hp = exp.hyperparameters || {};
  const split = exp.trainTestSplit || {};
  const env = exp.trainingEnvironment || {};

  return [
    `# Model Card: ${exp.modelName}`,
    ``,
    `## Model Details`,
    `- Experiment: ${exp.name}`,
    `- Project: ${project.title || 'Not specified'}`,
    `- Research area: ${project.cancerType || 'Not specified'}`,
    `- Model type: ${exp.modelType || 'Not specified'}`,
    `- Framework: ${exp.framework || 'Not specified'}`,
    `- Pretrained: ${exp.pretrained ? 'Yes' : 'No'}`,
    `- Review status: ${exp.reviewStatus || 'draft'}`,
    ``,
    `## Intended Use`,
    `${card.recommendedUse}`,
    ``,
    `## Training Data`,
    `- Dataset: ${dataset.name || 'Not specified'}`,
    `- Source: ${dataset.source || 'Not specified'}`,
    `- Samples: ${dataset.totalSamples || 'Not specified'}`,
    `- Format: ${dataset.format || 'Not specified'}`,
    `- Dataset risk gap: ${card.datasetRisk}% (${card.datasetGrade.label})`,
    ``,
    `## Training Configuration`,
    `- Learning rate: ${hp.learningRate || 'N/A'}`,
    `- Batch size: ${hp.batchSize || 'N/A'}`,
    `- Epochs: ${hp.epochs || 'N/A'}`,
    `- Optimizer: ${hp.optimizer || 'N/A'}`,
    `- Loss: ${hp.lossFunction || 'N/A'}`,
    `- Random seed: ${split.randomSeed || 'N/A'}`,
    `- Hardware: ${env.gpu || 'N/A'}`,
    ``,
    `## Metrics`,
    `- Accuracy: ${metric(metrics.accuracy)}%`,
    `- Precision: ${metric(metrics.precision)}%`,
    `- Recall: ${metric(metrics.recall)}%`,
    `- F1 score: ${metric(metrics.f1Score)}%`,
    `- AUC: ${metrics.auc || 'N/A'}`,
    `- Validation accuracy: ${metrics.validationAccuracy || 'N/A'}%`,
    `- Test accuracy: ${metrics.testAccuracy || 'N/A'}%`,
    ``,
    `## Explainability`,
    `- XAI method: ${exp.xaiMethod || 'None'}`,
    `- Evidence URL: ${exp.xaiEvidenceUrl || 'Not provided'}`,
    `- Notes: ${exp.xaiNotes || 'Not provided'}`,
    ``,
    `## Limitations and Ethical Considerations`,
    `${exp.limitations || 'Limitations not documented.'}`,
    ``,
    `## Reproducibility`,
    `- Reproducibility score: ${card.reproScore}% (${card.reproGrade.label})`,
    `- Artifact coverage: ${card.artifactReadiness.percent}% (${card.artifactReadiness.label})`,
    `- Repository: ${exp.githubLink || project.githubLink || 'Not provided'}`,
    `- Notebook: ${exp.notebookLink || 'Not provided'}`,
    `- Model card link: ${exp.modelCardLink || 'Not provided'}`,
    `- Environment file: ${exp.environmentFileLink || 'Not provided'}`,
    `- Requirements: ${exp.requirementsLink || 'Not provided'}`,
    `- Weights: ${exp.weightsLink || 'Not provided'}`,
  ].join('\n');
};

const ModelCards = () => {
  const [experiments, setExperiments] = useState([]);
  const [selectedExperimentId, setSelectedExperimentId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExperiments = async () => {
      try {
        const { data } = await api.get('/experiments');
        setExperiments(data);
        if (data.length) setSelectedExperimentId(data[0]._id);
      } catch (error) {
        toast.error('Failed to load experiments for model cards');
      } finally {
        setLoading(false);
      }
    };

    fetchExperiments();
  }, []);

  const selectedExperiment = experiments.find(experiment => experiment._id === selectedExperimentId);
  const card = useMemo(() => buildModelCard(selectedExperiment), [selectedExperiment]);

  const downloadCard = () => {
    if (!card) return;
    const markdown = modelCardMarkdown(card);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${card.experiment.modelName || 'model'}_model_card.md`.replace(/[^a-z0-9_.-]+/gi, '_');
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Model card downloaded');
  };

  const copyCard = async () => {
    if (!card) return;
    await navigator.clipboard.writeText(modelCardMarkdown(card));
    toast.success('Model card copied');
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;
  }

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Model Card Builder</h1>
          <p className="page-subtitle">
            Generate structured model cards for research transparency, intended use, evaluation data, limitations, XAI evidence, and reproducibility.
          </p>
        </div>
        <div className="page-actions">
          <select className="input-field" style={{ minWidth: 300 }} value={selectedExperimentId} onChange={event => setSelectedExperimentId(event.target.value)}>
            {experiments.map(experiment => (
              <option key={experiment._id} value={experiment._id}>{experiment.name}</option>
            ))}
          </select>
          <button className="btn-secondary" type="button" onClick={copyCard} disabled={!card}>
            <Clipboard size={16} /> Copy
          </button>
          <button className="btn-primary" type="button" onClick={downloadCard} disabled={!card}>
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {!card ? (
        <div className="academic-card">
          <div className="empty-state">
            <IdCard className="empty-state-icon" />
            <p>Create an experiment before building model cards.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="model-card-hero">
            <div>
              <div className="project-eyebrow"><IdCard size={14} /> Transparent model report</div>
              <h2>{card.experiment.modelName}</h2>
              <p>{card.experiment.description || card.recommendedUse}</p>
              <div className="project-badge-row">
                <span className={`badge ${card.reproGrade.badgeClass}`}>Repro: {card.reproGrade.label}</span>
                <span className={`badge ${card.datasetGrade.badgeClass}`}>Dataset: {card.datasetGrade.label}</span>
                <span className={`badge ${card.artifactReadiness.badgeClass}`}>Artifacts: {card.artifactReadiness.label}</span>
                <span className="badge badge-gray">{card.experiment.framework}</span>
              </div>
            </div>
            <div className="readiness-score-ring" style={{ '--readiness': `${card.completeness}%`, '--readiness-color': card.completeness >= 80 ? 'var(--accent-green)' : card.completeness >= 55 ? 'var(--accent-orange)' : 'var(--accent-red)' }}>
              <div>
                <strong>{card.completeness}%</strong>
                <span>Complete</span>
              </div>
            </div>
          </div>

          <div className="model-card-layout">
            <div className="model-card-preview">
              <div className="model-card-paper">
                <div className="model-card-paper-header">
                  <span>MedReproLab Model Card</span>
                  <strong>{card.experiment.modelName}</strong>
                </div>

                <section>
                  <h3>Model Details</h3>
                  <div className="model-card-facts">
                    <div><span>Experiment</span><strong>{card.experiment.name}</strong></div>
                    <div><span>Project</span><strong>{card.experiment.project?.title || 'N/A'}</strong></div>
                    <div><span>Architecture</span><strong>{card.experiment.modelType}</strong></div>
                    <div><span>Framework</span><strong>{card.experiment.framework}</strong></div>
                  </div>
                </section>

                <section>
                  <h3>Intended Use</h3>
                  <p>{card.recommendedUse}</p>
                </section>

                <section>
                  <h3>Training and Evaluation Data</h3>
                  <p>
                    Dataset: <strong>{card.experiment.dataset?.name || 'Not specified'}</strong>. Source: {card.experiment.dataset?.source || 'not specified'}.
                    Dataset risk gap is {card.datasetRisk}% ({card.datasetGrade.label}).
                  </p>
                </section>

                <section>
                  <h3>Metrics</h3>
                  <div className="model-card-metrics">
                    <div><span>Accuracy</span><strong>{metric(card.experiment.metrics?.accuracy)}%</strong></div>
                    <div><span>Precision</span><strong>{metric(card.experiment.metrics?.precision)}%</strong></div>
                    <div><span>Recall</span><strong>{metric(card.experiment.metrics?.recall)}%</strong></div>
                    <div><span>F1</span><strong>{metric(card.experiment.metrics?.f1Score)}%</strong></div>
                    <div><span>AUC</span><strong>{card.experiment.metrics?.auc || 'N/A'}</strong></div>
                  </div>
                </section>

                <section>
                  <h3>Explainability</h3>
                  <p>{card.experiment.xaiMethod && card.experiment.xaiMethod !== 'None' ? `${card.experiment.xaiMethod}: ${card.experiment.xaiNotes || 'Evidence attached.'}` : 'No XAI evidence documented yet.'}</p>
                </section>

                <section>
                  <h3>Limitations</h3>
                  <p>{card.experiment.limitations || 'No limitations documented yet.'}</p>
                </section>

                <section>
                  <h3>Reproducibility</h3>
                  <p>
                    Reproducibility score is {card.reproScore}% ({card.reproGrade.label}). Artifact coverage is {card.artifactReadiness.percent}% ({card.artifactReadiness.label}).
                  </p>
                </section>
              </div>
            </div>

            <div className="cards-stack">
              <div className="academic-card" style={{ padding: 24 }}>
                <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={18} color="var(--accent-cyan)" /> Card Completeness
                </div>
                <div className="model-card-checklist">
                  {card.checks.map(check => (
                    <div className={`model-card-check ${check.done ? 'complete' : ''}`} key={check.label}>
                      {check.done ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
                      <span>{check.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="academic-card" style={{ padding: 24 }}>
                <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} color="var(--accent-cyan)" /> Missing Model Card Inputs
                </div>
                <div className="cards-stack">
                  {card.missingArtifacts.length ? card.missingArtifacts.slice(0, 5).map(item => (
                    <div className="mini-record" key={item.key}>
                      <div>
                        <strong>{item.label}</strong>
                        <span>{item.suggestion}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="mini-record">
                      <div>
                        <strong>Artifact inputs complete</strong>
                        <span>Model card has the major reproducibility artifacts covered.</span>
                      </div>
                      <CheckCircle2 size={18} color="var(--accent-green)" />
                    </div>
                  )}
                </div>
              </div>

              <div className="academic-card" style={{ padding: 24 }}>
                <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={18} color="var(--accent-cyan)" /> Sections
                </div>
                <div className="model-card-section-list">
                  {modelCardSections.map(section => <span key={section}>{section}</span>)}
                </div>
                <div className="resource-links">
                  {card.experiment.githubLink && (
                    <a className="inline-link" href={card.experiment.githubLink} target="_blank" rel="noreferrer"><GitBranch size={14} /> Code</a>
                  )}
                  {card.experiment.modelCardLink && (
                    <a className="inline-link" href={card.experiment.modelCardLink} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Existing Card</a>
                  )}
                  {card.experiment._id && (
                    <Link className="inline-link" to={`/experiments/${card.experiment._id}`}><Microscope size={14} /> Experiment</Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ModelCards;
