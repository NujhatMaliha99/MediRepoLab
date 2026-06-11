import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Archive,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  GitBranch,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import api from '../api/axios';
import { getAverageReproScore, getReproGrade } from '../utils/reproducibility';
import { getProjectArtifactSummary } from '../utils/artifacts';
import { getProjectDatasetRiskSummary } from '../utils/datasetRisk';

const protocolFields = [
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

const scoreColor = score => (
  score >= 85 ? 'var(--accent-green)' : score >= 60 ? 'var(--accent-orange)' : 'var(--accent-red)'
);

const packageGrade = score => {
  if (score >= 85) return { label: 'Package Ready', badgeClass: 'badge-green' };
  if (score >= 70) return { label: 'Nearly Ready', badgeClass: 'badge-cyan' };
  if (score >= 45) return { label: 'Needs Assembly', badgeClass: 'badge-orange' };
  return { label: 'Incomplete', badgeClass: 'badge-red' };
};

const protocolCompletion = protocol => {
  const filled = protocolFields.filter(field => String(protocol?.[field] || '').trim()).length;
  return Math.round((filled / protocolFields.length) * 100);
};

const projectMatches = (record, projectId) => (record.project?._id || record.project) === projectId;

const buildPackage = (project, datasets, experiments) => {
  const projectDatasets = datasets.filter(dataset => projectMatches(dataset, project._id));
  const projectExperiments = experiments.filter(experiment => projectMatches(experiment, project._id));
  const artifactSummary = getProjectArtifactSummary(projectExperiments);
  const riskSummary = getProjectDatasetRiskSummary(projectDatasets);
  const avgRepro = getAverageReproScore(projectExperiments);
  const xaiRecords = projectExperiments.filter(experiment => experiment.xaiMethod && experiment.xaiMethod !== 'None');
  const experimentsWithWeights = projectExperiments.filter(experiment => experiment.weightsLink);
  const experimentsWithModelCards = projectExperiments.filter(experiment => experiment.modelCardLink);
  const experimentsWithEnv = projectExperiments.filter(experiment => experiment.environmentFileLink || experiment.requirementsLink);
  const experimentsWithCode = projectExperiments.filter(experiment => experiment.githubLink || experiment.notebookLink);
  const protocolPercent = protocolCompletion(project.studyProtocol);

  const items = [
    {
      key: 'project-overview',
      label: 'Project overview',
      detail: 'Title, objective, research area, tags, and project links are available.',
      done: Boolean(project.title && project.description && project.cancerType),
      action: 'Complete the project title, description, research area, and tags.',
      weight: 8,
      category: 'Project',
    },
    {
      key: 'study-protocol',
      label: 'Study protocol',
      detail: `${protocolPercent}% of structured protocol fields are complete.`,
      done: protocolPercent >= 75,
      action: 'Fill objective, eligibility criteria, validation plan, endpoints, ethics, and statistical plan.',
      weight: 12,
      category: 'Methods',
    },
    {
      key: 'dataset-source',
      label: 'Dataset source and access',
      detail: `${projectDatasets.length} linked dataset${projectDatasets.length === 1 ? '' : 's'} found.`,
      done: projectDatasets.length > 0 && projectDatasets.every(dataset => dataset.source && (dataset.sourceUrl || dataset.sourceLink)),
      action: 'Register dataset source, source URL, version, sample count, and access constraints.',
      weight: 12,
      category: 'Data',
    },
    {
      key: 'dataset-risk',
      label: 'Dataset risk documentation',
      detail: `Average documentation gap: ${riskSummary.average}%.`,
      done: projectDatasets.length > 0 && riskSummary.average <= 35,
      action: 'Document class balance, missing data, bias, scanner/source, annotation quality, leakage risk, and license/consent.',
      weight: 12,
      category: 'Data',
    },
    {
      key: 'code-notebooks',
      label: 'Code and notebooks',
      detail: `${experimentsWithCode.length}/${projectExperiments.length} experiment records have code or notebook links.`,
      done: projectExperiments.length > 0 && experimentsWithCode.length === projectExperiments.length,
      action: 'Attach GitHub repositories, source archives, Colab, or Jupyter notebook links for every experiment.',
      weight: 12,
      category: 'Code',
    },
    {
      key: 'dependencies',
      label: 'Dependencies and runtime',
      detail: `${experimentsWithEnv.length}/${projectExperiments.length} experiment records have environment or requirements links.`,
      done: projectExperiments.length > 0 && experimentsWithEnv.length === projectExperiments.length,
      action: 'Attach environment.yml, requirements.txt, Dockerfile, or runtime notes for each experiment.',
      weight: 10,
      category: 'Code',
    },
    {
      key: 'model-cards',
      label: 'Model cards',
      detail: `${experimentsWithModelCards.length}/${projectExperiments.length} experiment records include model card links.`,
      done: projectExperiments.length > 0 && experimentsWithModelCards.length > 0,
      action: 'Add model cards describing intended use, limitations, evaluation data, and safety considerations.',
      weight: 8,
      category: 'Model',
    },
    {
      key: 'weights',
      label: 'Weights or checkpoints',
      detail: `${experimentsWithWeights.length}/${projectExperiments.length} experiment records include weights.`,
      done: projectExperiments.length > 0 && experimentsWithWeights.length > 0,
      action: 'Attach trained weights, checkpoint references, or document why weights cannot be shared.',
      weight: 8,
      category: 'Model',
    },
    {
      key: 'xai',
      label: 'XAI evidence',
      detail: `${xaiRecords.length} XAI record${xaiRecords.length === 1 ? '' : 's'} available.`,
      done: xaiRecords.length > 0,
      action: 'Attach Grad-CAM, SHAP, LIME, attention maps, or equivalent interpretation evidence.',
      weight: 8,
      category: 'Evidence',
    },
    {
      key: 'repro-score',
      label: 'Reproducibility score',
      detail: `Average experiment reproducibility: ${avgRepro}%.`,
      done: projectExperiments.length > 0 && avgRepro >= 70,
      action: 'Record fixed seeds, environment details, hyperparameters, code links, and reproduced-result status.',
      weight: 6,
      category: 'Evidence',
    },
    {
      key: 'literature',
      label: 'Literature baselines',
      detail: `${project.literatureBaselines?.length || 0} baseline paper${project.literatureBaselines?.length === 1 ? '' : 's'} recorded.`,
      done: Boolean(project.literatureBaselines?.length),
      action: 'Add comparable published baselines with dataset, model, metrics, and reproducibility notes.',
      weight: 4,
      category: 'Evidence',
    },
  ];

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const score = Math.round((items.reduce((sum, item) => sum + (item.done ? item.weight : 0), 0) / totalWeight) * 100);
  const grade = packageGrade(score);

  return {
    project,
    projectDatasets,
    projectExperiments,
    items,
    missing: items.filter(item => !item.done),
    score,
    grade,
    artifactSummary,
    riskSummary,
    avgRepro,
    reproGrade: getReproGrade(avgRepro),
  };
};

const buildManifest = packageData => {
  const { project, projectDatasets, projectExperiments, items, missing, score, grade, avgRepro, riskSummary, artifactSummary } = packageData;
  const lines = [
    `# MedReproLab Reproducibility Package`,
    ``,
    `Project: ${project.title}`,
    `Research area: ${project.cancerType || 'Not specified'}`,
    `Package score: ${score}% (${grade.label})`,
    `Average reproducibility: ${avgRepro}%`,
    `Dataset risk gap: ${riskSummary.average}%`,
    `Artifact coverage: ${artifactSummary.average}%`,
    ``,
    `## Package Checklist`,
    ...items.map(item => `- [${item.done ? 'x' : ' '}] ${item.label}: ${item.detail}`),
    ``,
    `## Missing Actions`,
    ...(missing.length ? missing.map(item => `- ${item.action}`) : ['- Package is ready. Keep links current before submission.']),
    ``,
    `## Datasets`,
    ...(projectDatasets.length ? projectDatasets.map(dataset => `- ${dataset.name} (${dataset.version || 'version not specified'}): ${dataset.source || 'source not specified'}`) : ['- No datasets linked.']),
    ``,
    `## Experiments`,
    ...(projectExperiments.length ? projectExperiments.map(experiment => `- ${experiment.name}: ${experiment.modelName}, accuracy ${experiment.metrics?.accuracy || 'N/A'}%, repro ${experiment.reproducibilityScore || 0}%`) : ['- No experiments linked.']),
    ``,
    `## Key Links`,
    `- Project repository: ${project.githubLink || 'Not provided'}`,
    `- Paper/preprint: ${project.paperLink || 'Not provided'}`,
  ];

  return lines.join('\n');
};

const ReproPackage = () => {
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
        toast.error('Failed to load reproducibility package data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const selectedProject = data.projects.find(project => project._id === selectedProjectId);
  const packageData = useMemo(() => (
    selectedProject ? buildPackage(selectedProject, data.datasets, data.experiments) : null
  ), [data.datasets, data.experiments, selectedProject]);

  const downloadManifest = () => {
    if (!packageData) return;
    const manifest = buildManifest(packageData);
    const blob = new Blob([manifest], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${packageData.project.title.replace(/[^a-z0-9]+/gi, '_')}_repro_package.md`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Reproducibility package manifest downloaded');
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;
  }

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reproducibility Package</h1>
          <p className="page-subtitle">
            Assemble project evidence into a reusable research package: data, code, dependencies, artifacts, XAI, and submission notes.
          </p>
        </div>
        <div className="page-actions">
          <select className="input-field" style={{ minWidth: 280 }} value={selectedProjectId} onChange={event => setSelectedProjectId(event.target.value)}>
            {data.projects.map(project => <option value={project._id} key={project._id}>{project.title}</option>)}
          </select>
          <button className="btn-primary" type="button" onClick={downloadManifest} disabled={!packageData}>
            <Download size={16} /> Export Manifest
          </button>
        </div>
      </div>

      {!packageData ? (
        <div className="academic-card">
          <div className="empty-state">
            <Archive className="empty-state-icon" />
            <p>Create a project before building a reproducibility package.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="repro-package-hero">
            <div>
              <div className="project-eyebrow"><PackageCheck size={14} /> Package builder</div>
              <h2>{packageData.project.title}</h2>
              <p>{packageData.project.description}</p>
              <div className="project-badge-row">
                <span className={`badge ${packageData.grade.badgeClass}`}>{packageData.grade.label}</span>
                <span className={`badge ${packageData.reproGrade.badgeClass}`}>Repro: {packageData.reproGrade.label}</span>
                <span className="badge badge-gray">{packageData.projectDatasets.length} datasets</span>
                <span className="badge badge-gray">{packageData.projectExperiments.length} experiments</span>
              </div>
            </div>
            <div className="readiness-score-ring" style={{ '--readiness': `${packageData.score}%`, '--readiness-color': scoreColor(packageData.score) }}>
              <div>
                <strong>{packageData.score}%</strong>
                <span>Package</span>
              </div>
            </div>
          </div>

          <div className="repro-package-summary">
            <div><span>Artifact coverage</span><strong>{packageData.artifactSummary.average}%</strong></div>
            <div><span>Dataset risk gap</span><strong>{packageData.riskSummary.average}%</strong></div>
            <div><span>Avg reproducibility</span><strong>{packageData.avgRepro}%</strong></div>
            <div><span>Missing items</span><strong>{packageData.missing.length}</strong></div>
          </div>

          <div className="two-column-grid" style={{ alignItems: 'start' }}>
            <div className="academic-card" style={{ padding: 24 }}>
              <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} color="var(--accent-cyan)" /> Package Checklist
              </div>
              <div className="repro-package-checklist">
                {packageData.items.map(item => (
                  <div className={`repro-package-item ${item.done ? 'complete' : ''}`} key={item.key}>
                    {item.done ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                    <div>
                      <div>
                        <strong>{item.label}</strong>
                        <span>{item.category}</span>
                      </div>
                      <p>{item.detail}</p>
                      {!item.done && <em>{item.action}</em>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="cards-stack">
              <div className="academic-card" style={{ padding: 24 }}>
                <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} color="var(--accent-cyan)" /> Assembly Actions
                </div>
                <div className="cards-stack">
                  {packageData.missing.length ? packageData.missing.slice(0, 6).map(item => (
                    <div className="mini-record" key={item.key} style={{ alignItems: 'flex-start' }}>
                      <div>
                        <strong>{item.label}</strong>
                        <span>{item.action}</span>
                      </div>
                      <span className="badge badge-orange">{item.weight} pts</span>
                    </div>
                  )) : (
                    <div className="mini-record">
                      <div>
                        <strong>Package ready</strong>
                        <span>All major reproducibility package items are covered.</span>
                      </div>
                      <CheckCircle2 size={18} color="var(--accent-green)" />
                    </div>
                  )}
                </div>
              </div>

              <div className="academic-card" style={{ padding: 24 }}>
                <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={18} color="var(--accent-cyan)" /> Package Contents
                </div>
                <div className="insight-list">
                  <div><span>Datasets</span><strong>{packageData.projectDatasets.length}</strong></div>
                  <div><span>Experiments</span><strong>{packageData.projectExperiments.length}</strong></div>
                  <div><span>XAI records</span><strong>{packageData.projectExperiments.filter(exp => exp.xaiMethod && exp.xaiMethod !== 'None').length}</strong></div>
                  <div><span>Model cards</span><strong>{packageData.projectExperiments.filter(exp => exp.modelCardLink).length}</strong></div>
                  <div><span>Environment files</span><strong>{packageData.projectExperiments.filter(exp => exp.environmentFileLink || exp.requirementsLink).length}</strong></div>
                </div>
                <div className="resource-links">
                  {packageData.project.githubLink && (
                    <a className="inline-link" href={packageData.project.githubLink} target="_blank" rel="noreferrer"><GitBranch size={14} /> Repository</a>
                  )}
                  {packageData.project.paperLink && (
                    <a className="inline-link" href={packageData.project.paperLink} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Paper</a>
                  )}
                  <Link className="inline-link" to={`/projects/${packageData.project._id}`}><FolderOpen size={14} /> Open workspace</Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReproPackage;
