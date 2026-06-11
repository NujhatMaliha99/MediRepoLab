import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import {
  ArrowLeft,
  AlertTriangle,
  BarChart2,
  BookOpenText,
  ChevronRight,
  ClipboardCheck,
  Database,
  ExternalLink,
  FileText,
  FlaskConical,
  GitBranch,
  LineChart as LineChartIcon,
  Microscope,
  NotebookPen,
  PenLine,
  PieChart as PieChartIcon,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getAverageReproScore, getReproGrade, getReproScore } from '../utils/reproducibility';
import { DATASET_RISK_ITEMS, getDatasetRiskGrade, getDatasetRiskScore, getDatasetRiskSuggestions, getProjectDatasetRiskSummary } from '../utils/datasetRisk';
import { ARTIFACT_ITEMS, getArtifactReadiness, getArtifactSuggestions, getExperimentArtifacts, getProjectArtifactSummary } from '../utils/artifacts';
import { formatActivityTime, getActivityColor, getActivityIcon } from '../utils/activity';

const chartColors = [
  'var(--accent-blue)',
  'var(--accent-cyan)',
  'var(--accent-green)',
  'var(--accent-orange)',
  'var(--accent-purple)',
  'var(--accent-pink)',
];

const sampleChartData = {
  timeline: [
    { name: 'Run 1', fullName: 'Baseline CNN', Accuracy: 72, F1: 69, Reproducibility: 58 },
    { name: 'Run 2', fullName: 'Augmented CNN', Accuracy: 79, F1: 76, Reproducibility: 64 },
    { name: 'Run 3', fullName: 'Transformer Trial', Accuracy: 84, F1: 81, Reproducibility: 72 },
    { name: 'Run 4', fullName: 'XAI Verified Model', Accuracy: 88, F1: 85, Reproducibility: 82 },
  ],
  modelComparison: [
    { name: 'CNN', Accuracy: 79, F1: 76, AUC: 84 },
    { name: 'ResNet', Accuracy: 83, F1: 80, AUC: 88 },
    { name: 'ViT', Accuracy: 88, F1: 85, AUC: 91 },
  ],
  datasetDistribution: [
    { name: 'Train', Samples: 1240 },
    { name: 'Validation', Samples: 310 },
    { name: 'External Test', Samples: 420 },
  ],
  frameworkUsage: [
    { name: 'PyTorch', value: 3 },
    { name: 'TensorFlow', value: 1 },
    { name: 'MONAI', value: 2 },
  ],
};

const tabs = [
  { id: 'overview', label: 'Overview', icon: BarChart2 },
  { id: 'charts', label: 'Charts', icon: LineChartIcon },
  { id: 'protocol', label: 'Protocol', icon: BookOpenText },
  { id: 'literature', label: 'Literature', icon: BookOpenText },
  { id: 'gaps', label: 'Gap Analysis', icon: Sparkles },
  { id: 'datasets', label: 'Datasets', icon: Database },
  { id: 'risk', label: 'Risk & Bias', icon: AlertTriangle },
  { id: 'experiments', label: 'Experiments', icon: FlaskConical },
  { id: 'artifacts', label: 'Artifacts', icon: FileText },
  { id: 'xai', label: 'XAI Evidence', icon: Microscope },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'audit', label: 'Audit Trail', icon: ClipboardCheck },
  { id: 'notes', label: 'Notes', icon: NotebookPen },
];

const defaultProtocol = {
  objective: '',
  hypothesis: '',
  studyType: '',
  inclusionCriteria: '',
  exclusionCriteria: '',
  datasetPlan: '',
  modelPlan: '',
  validationPlan: '',
  endpoints: '',
  ethicsNotes: '',
  statisticalPlan: '',
  protocolStatus: 'draft',
  version: 'v1.0',
};

const createBaselineRow = () => ({
  paperTitle: '',
  authors: '',
  year: '',
  venue: '',
  task: '',
  dataset: '',
  modelName: '',
  accuracy: '',
  f1Score: '',
  auc: '',
  reproducibilityNotes: '',
  link: '',
  notes: '',
});

const protocolCoreFields = [
  { key: 'objective', label: 'Research objective' },
  { key: 'hypothesis', label: 'Hypothesis' },
  { key: 'studyType', label: 'Study type' },
  { key: 'inclusionCriteria', label: 'Inclusion criteria' },
  { key: 'exclusionCriteria', label: 'Exclusion criteria' },
  { key: 'datasetPlan', label: 'Dataset plan' },
  { key: 'modelPlan', label: 'Model plan' },
  { key: 'validationPlan', label: 'Validation plan' },
  { key: 'endpoints', label: 'Endpoints' },
  { key: 'statisticalPlan', label: 'Statistical plan' },
  { key: 'ethicsNotes', label: 'Ethics and governance notes' },
];

const scoreColor = score => (
  score >= 80 ? 'var(--accent-green)' : score >= 55 ? 'var(--accent-orange)' : 'var(--accent-red)'
);

const formatDate = value => {
  if (!value) return 'No date';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const metricValue = value => (typeof value === 'number' ? value : 0);

const reviewBadgeClass = status => (
  status === 'approved' ? 'badge-green' : status === 'pending' ? 'badge-orange' : status === 'denied' ? 'badge-red' : 'badge-gray'
);

const protocolBadgeClass = status => (
  status === 'approved' ? 'badge-green' : status === 'ready' || status === 'submitted' ? 'badge-blue' : status === 'needs_revision' ? 'badge-orange' : 'badge-gray'
);

const getProtocolCompletion = protocol => {
  const filled = protocolCoreFields.filter(field => String(protocol?.[field.key] || '').trim()).length;
  return Math.round((filled / protocolCoreFields.length) * 100);
};

const getPriorityBadge = priority => (
  priority === 'High' ? 'badge-red' : priority === 'Medium' ? 'badge-orange' : 'badge-green'
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', boxShadow: 'var(--shadow-md)' }}>
      <div style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {payload.map((item, index) => (
        <div key={`${item.name}-${index}`} style={{ color: 'var(--text-secondary)', fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
          <span>{item.name}: <strong style={{ color: 'var(--text-primary)' }}>{item.value}</strong></span>
        </div>
      ))}
    </div>
  );
};

const StatTile = ({ icon: Icon, label, value, color, detail, onClick }) => {
  const content = (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
      <div>
        <div className="metric-label">{label}</div>
        <div className="metric-value">{value}</div>
        {detail && <p className="muted-copy" style={{ marginTop: 8, fontSize: 12 }}>{detail}</p>}
      </div>
      <div className="project-stat-icon">
        <Icon size={22} color={color} />
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button type="button" className="stat-card project-stat-card project-stat-button" style={{ '--stat-accent': color }} onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <div className="stat-card project-stat-card" style={{ '--stat-accent': color }}>
      {content}
    </div>
  );
};

const SectionHeader = ({ icon: Icon, title, action }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
    <h3 className="section-title" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon size={18} color="var(--accent-cyan)" /> {title}
    </h3>
    {action}
  </div>
);

const FrameworkUsagePanel = ({ data, height = 290 }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const topFramework = [...data].sort((a, b) => b.value - a.value)[0];

  return (
    <div className="framework-usage-shell">
      <div className="framework-donut-wrap" style={{ minHeight: height }}>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="84%"
              paddingAngle={4}
              startAngle={90}
              endAngle={-270}
              stroke="rgba(11,16,32,0.86)"
              strokeWidth={5}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="framework-donut-center">
          <span>Total runs</span>
          <strong>{total}</strong>
          <small>{topFramework?.name || 'No framework'}</small>
        </div>
      </div>

      <div className="framework-legend">
        {data.map((entry, index) => {
          const color = chartColors[index % chartColors.length];
          const percent = total ? Math.round((entry.value / total) * 100) : 0;
          return (
            <div className="framework-legend-row" key={entry.name}>
              <div className="framework-legend-label">
                <span style={{ background: color }} />
                <strong>{entry.name}</strong>
              </div>
              <div className="framework-legend-metric">
                <b>{entry.value}</b>
                <em>{percent}%</em>
              </div>
              <div className="framework-legend-bar">
                <i style={{ width: `${percent}%`, background: color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ProjectDetails = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [notes, setNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);
  const [protocolDraft, setProtocolDraft] = useState(defaultProtocol);
  const [protocolSaving, setProtocolSaving] = useState(false);
  const [baselineDrafts, setBaselineDrafts] = useState([]);
  const [baselineSaving, setBaselineSaving] = useState(false);

  const openWorkspaceTab = tabId => {
    setActiveTab(tabId);
    window.requestAnimationFrame(() => {
      document.querySelector('.project-workspace-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const [projectRes, datasetRes, experimentRes, activityRes] = await Promise.all([
          api.get(`/projects/${id}`),
          api.get(`/datasets?project=${id}`),
          api.get(`/experiments?project=${id}`),
          api.get(`/activities?project=${id}&limit=60`),
        ]);
        setProject(projectRes.data);
        setDatasets(datasetRes.data);
        setExperiments(experimentRes.data);
        setActivities(activityRes.data);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load project workspace');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspace();
  }, [id]);

  useEffect(() => {
    setNotes(localStorage.getItem(`medrepro_project_notes_${id}`) || '');
    setNotesSaved(false);
  }, [id]);

  useEffect(() => {
    if (project) {
      setProtocolDraft({ ...defaultProtocol, ...(project.studyProtocol || {}) });
      setBaselineDrafts((project.literatureBaselines?.length ? project.literatureBaselines : [createBaselineRow()]).map(row => ({ ...createBaselineRow(), ...row })));
    }
  }, [project]);

  const summary = useMemo(() => {
    const sortedByAccuracy = [...experiments].sort((a, b) => metricValue(b.metrics?.accuracy) - metricValue(a.metrics?.accuracy));
    const bestExperiment = sortedByAccuracy[0];
    const avgRepro = getAverageReproScore(experiments);
    const avgAccuracy = experiments.length
      ? Math.round(experiments.reduce((sum, exp) => sum + metricValue(exp.metrics?.accuracy), 0) / experiments.length)
      : 0;
    const xaiRecords = experiments.filter(exp => exp.xaiMethod && exp.xaiMethod !== 'None');
    const completedRuns = experiments.filter(exp => exp.status === 'completed').length;

    return { bestExperiment, avgRepro, avgAccuracy, xaiRecords, completedRuns };
  }, [experiments]);

  const chartData = useMemo(() => {
    const timeline = [...experiments]
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
      .map((exp, index) => ({
        name: `Run ${index + 1}`,
        fullName: exp.name,
        date: formatDate(exp.createdAt),
        Accuracy: metricValue(exp.metrics?.accuracy),
        F1: metricValue(exp.metrics?.f1Score),
        Reproducibility: getReproScore(exp),
      }));

    const modelComparison = [...experiments]
      .sort((a, b) => metricValue(b.metrics?.accuracy) - metricValue(a.metrics?.accuracy))
      .slice(0, 8)
      .map(exp => ({
        name: exp.modelName || exp.name,
        Accuracy: metricValue(exp.metrics?.accuracy),
        F1: metricValue(exp.metrics?.f1Score),
        AUC: Math.round(metricValue(exp.metrics?.auc) * 100),
      }));

    const frameworkCounts = experiments.reduce((acc, exp) => {
      const key = exp.framework || 'Unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const frameworkUsage = Object.entries(frameworkCounts).map(([name, value]) => ({ name, value }));

    const datasetDistribution = datasets.map(ds => ({
      name: ds.name,
      Samples: metricValue(ds.totalSamples),
    }));

    return { timeline, modelComparison, frameworkUsage, datasetDistribution };
  }, [datasets, experiments]);

  const chartPreviewData = useMemo(() => ({
    timeline: chartData.timeline.length ? chartData.timeline : sampleChartData.timeline,
    modelComparison: chartData.modelComparison.length ? chartData.modelComparison : sampleChartData.modelComparison,
    datasetDistribution: chartData.datasetDistribution.some(item => item.Samples > 0) ? chartData.datasetDistribution : sampleChartData.datasetDistribution,
    frameworkUsage: chartData.frameworkUsage.length ? chartData.frameworkUsage : sampleChartData.frameworkUsage,
    isSample: !chartData.timeline.length || !chartData.modelComparison.length || !chartData.datasetDistribution.some(item => item.Samples > 0) || !chartData.frameworkUsage.length,
  }), [chartData]);

  const datasetRiskSummary = useMemo(() => getProjectDatasetRiskSummary(datasets), [datasets]);
  const artifactSummary = useMemo(() => getProjectArtifactSummary(experiments), [experiments]);
  const protocolCompletion = useMemo(() => getProtocolCompletion(project?.studyProtocol), [project]);
  const literatureBaselines = useMemo(() => project?.literatureBaselines || [], [project]);
  const literatureSummary = useMemo(() => {
    const baselinesWithAccuracy = literatureBaselines.filter(item => typeof item.accuracy === 'number');
    const bestBaseline = baselinesWithAccuracy.length
      ? [...baselinesWithAccuracy].sort((a, b) => metricValue(b.accuracy) - metricValue(a.accuracy))[0]
      : null;
    const projectAccuracy = metricValue(summary.bestExperiment?.metrics?.accuracy);
    const delta = bestBaseline && projectAccuracy ? Math.round((projectAccuracy - metricValue(bestBaseline.accuracy)) * 10) / 10 : null;
    return {
      total: literatureBaselines.length,
      bestBaseline,
      delta,
      hasComparison: Boolean(bestBaseline && summary.bestExperiment),
    };
  }, [literatureBaselines, summary.bestExperiment]);

  const gapAnalysis = useMemo(() => {
    const gaps = [];
    const strengths = [];

    if (protocolCompletion < 60) {
      gaps.push({
        area: 'Study design',
        priority: 'High',
        issue: 'Protocol is not detailed enough for reviewer scrutiny.',
        action: 'Complete objective, eligibility criteria, endpoints, validation plan, and statistical plan.',
      });
    } else {
      strengths.push('Study protocol is structured enough to support reproducible research planning.');
    }

    if (!literatureSummary.total) {
      gaps.push({
        area: 'Literature positioning',
        priority: 'High',
        issue: 'No published baselines are recorded.',
        action: 'Add at least 3 related studies with dataset, model, metrics, and reproducibility notes.',
      });
    } else if (literatureSummary.total < 3) {
      gaps.push({
        area: 'Literature positioning',
        priority: 'Medium',
        issue: 'The baseline matrix is still thin.',
        action: 'Add more comparable papers to make claims against prior work more defensible.',
      });
    } else {
      strengths.push('Literature baseline matrix can support a clear comparison against published methods.');
    }

    if (!datasets.length) {
      gaps.push({
        area: 'Dataset evidence',
        priority: 'High',
        issue: 'No datasets are linked to this project.',
        action: 'Register the project datasets with source, sample count, format, and limitations.',
      });
    } else if (datasetRiskSummary.average > 50) {
      gaps.push({
        area: 'Dataset evidence',
        priority: 'Medium',
        issue: 'Dataset risk or bias documentation needs attention.',
        action: 'Strengthen class balance, missing data, demographics, annotation, and source documentation.',
      });
    } else {
      strengths.push('Dataset risk documentation is in a usable range for reporting.');
    }

    if (!experiments.length) {
      gaps.push({
        area: 'Experimental evidence',
        priority: 'High',
        issue: 'No experiments are logged.',
        action: 'Add a baseline model run before claiming performance or reproducibility.',
      });
    } else if (!summary.completedRuns) {
      gaps.push({
        area: 'Experimental evidence',
        priority: 'Medium',
        issue: 'Experiments exist but none are marked completed.',
        action: 'Complete at least one run with final metrics and linked artifacts.',
      });
    } else {
      strengths.push(`${summary.completedRuns} completed experiment run${summary.completedRuns === 1 ? '' : 's'} available for analysis.`);
    }

    if (summary.avgRepro < 70) {
      gaps.push({
        area: 'Reproducibility',
        priority: experiments.length ? 'High' : 'Medium',
        issue: 'Average reproducibility is below a strong research threshold.',
        action: 'Record seeds, environment files, requirements, code links, hyperparameters, and model checkpoints.',
      });
    } else {
      strengths.push('Average reproducibility score is strong enough for reviewer-facing documentation.');
    }

    if (artifactSummary.average < 55) {
      gaps.push({
        area: 'Research artifacts',
        priority: experiments.length ? 'Medium' : 'Low',
        issue: 'Artifact coverage is incomplete.',
        action: 'Attach notebooks, code repositories, model cards, environment files, weights, and protocol links.',
      });
    } else {
      strengths.push('Research artifacts are sufficiently documented for report generation.');
    }

    if (!summary.xaiRecords.length) {
      gaps.push({
        area: 'Explainability',
        priority: 'Medium',
        issue: 'No XAI evidence is linked.',
        action: 'Add Grad-CAM, SHAP, LIME, or comparable explainability evidence for the best model.',
      });
    } else {
      strengths.push(`${summary.xaiRecords.length} explainability record${summary.xaiRecords.length === 1 ? '' : 's'} support model transparency.`);
    }

    const highCount = gaps.filter(item => item.priority === 'High').length;
    const score = Math.max(0, Math.round(100 - (highCount * 18) - (gaps.filter(item => item.priority === 'Medium').length * 10) - (gaps.filter(item => item.priority === 'Low').length * 5)));

    return {
      gaps,
      strengths,
      highCount,
      score,
      label: score >= 80 ? 'Publication Ready' : score >= 60 ? 'Needs Minor Work' : score >= 40 ? 'Needs Major Work' : 'Not Ready Yet',
    };
  }, [artifactSummary.average, datasetRiskSummary.average, datasets.length, experiments.length, literatureSummary.total, protocolCompletion, summary.avgRepro, summary.completedRuns, summary.xaiRecords.length]);

  const reportReadiness = useMemo(() => {
    const items = [
      { label: 'Project overview', done: Boolean(project?.title && project?.description && project?.cancerType) },
      { label: 'Study protocol', done: protocolCompletion >= 60 },
      { label: 'Literature baselines', done: literatureSummary.total > 0 },
      { label: 'Dataset documentation', done: datasets.length > 0 },
      { label: 'Experiment results', done: experiments.length > 0 },
      { label: 'Reproducibility score', done: summary.avgRepro >= 50 },
      { label: 'XAI evidence', done: summary.xaiRecords.length > 0 },
      { label: 'Research artifacts', done: artifactSummary.average >= 55 || Boolean(project?.githubLink || project?.paperLink) },
    ];
    const doneCount = items.filter(item => item.done).length;
    return { items, percent: Math.round((doneCount / items.length) * 100) };
  }, [artifactSummary.average, datasets.length, experiments.length, literatureSummary.total, project, protocolCompletion, summary.avgRepro, summary.xaiRecords.length]);

  const improvementSuggestions = useMemo(() => {
    const suggestions = [];
    if (protocolCompletion < 60) suggestions.push('Complete the study protocol with objective, criteria, validation plan, endpoints, and statistical plan.');
    if (!literatureSummary.total) suggestions.push('Add literature baselines so your best model can be compared against published methods.');
    if (!datasets.length) suggestions.push('Add at least one dataset with source and sample count.');
    if (!experiments.length) suggestions.push('Log a baseline experiment to establish performance.');
    if (experiments.length && summary.avgRepro < 70) suggestions.push('Record seeds, environments, hyperparameters, and code links for stronger reproducibility.');
    if (experiments.length && artifactSummary.average < 55) suggestions.push('Attach research artifacts such as notebooks, model cards, environment files, and weights.');
    if (!summary.xaiRecords.length) suggestions.push('Attach Grad-CAM, SHAP, LIME, or related XAI evidence for reviewer confidence.');
    if (project && !project.githubLink) suggestions.push('Link a repository, notebook, or environment file.');
    if (!suggestions.length) suggestions.push('Workspace is in good shape for a formal report.');
    return suggestions;
  }, [artifactSummary.average, datasets.length, experiments.length, literatureSummary.total, project, protocolCompletion, summary.avgRepro, summary.xaiRecords.length]);

  const saveNotes = () => {
    localStorage.setItem(`medrepro_project_notes_${id}`, notes);
    setNotesSaved(true);
    toast.success('Project notes saved');
  };

  const updateProtocolDraft = (key, value) => {
    setProtocolDraft(prev => ({ ...prev, [key]: value }));
  };

  const saveProtocol = async () => {
    setProtocolSaving(true);
    try {
      const { data } = await api.put(`/projects/${id}`, { studyProtocol: protocolDraft });
      setProject(data);
      setActivities(prev => [
        {
          _id: `local-protocol-${Date.now()}`,
          title: `Study protocol updated: ${data.title}`,
          description: 'Research design, eligibility, validation, and reporting plan were updated.',
          entityType: 'project',
          action: 'updated',
          changes: ['study protocol'],
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      toast.success('Study protocol saved');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save study protocol');
    } finally {
      setProtocolSaving(false);
    }
  };

  const updateBaselineDraft = (index, key, value) => {
    setBaselineDrafts(prev => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  };

  const addBaselineDraft = () => {
    setBaselineDrafts(prev => [...prev, createBaselineRow()]);
  };

  const removeBaselineDraft = index => {
    setBaselineDrafts(prev => (prev.length === 1 ? [createBaselineRow()] : prev.filter((_, rowIndex) => rowIndex !== index)));
  };

  const saveBaselines = async () => {
    setBaselineSaving(true);
    try {
      const cleanedBaselines = baselineDrafts
        .map(row => ({
          ...row,
          year: row.year === '' ? undefined : Number(row.year),
          accuracy: row.accuracy === '' ? undefined : Number(row.accuracy),
          f1Score: row.f1Score === '' ? undefined : Number(row.f1Score),
          auc: row.auc === '' ? undefined : Number(row.auc),
        }))
        .filter(row => row.paperTitle || row.authors || row.modelName || row.dataset || row.link);
      const { data } = await api.put(`/projects/${id}`, { literatureBaselines: cleanedBaselines });
      setProject(data);
      setActivities(prev => [
        {
          _id: `local-literature-${Date.now()}`,
          title: `Literature baselines updated: ${data.title}`,
          description: `${cleanedBaselines.length} published baseline records are now tracked for comparison.`,
          entityType: 'project',
          action: 'updated',
          changes: ['literature baselines'],
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      toast.success('Literature baselines saved');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save literature baselines');
    } finally {
      setBaselineSaving(false);
    }
  };

  const submitProjectReview = async () => {
    const message = window.prompt('Message for admin/supervisor review', `Please review the full project workspace: ${project.title}.`);
    if (message === null) return;
    try {
      const { data } = await api.post(`/review-requests/projects/${project._id}`, { message });
      setProject(prev => ({ ...prev, reviewStatus: data.project?.reviewStatus || 'pending', reviewDecisionNote: '' }));
      setActivities(prev => [
        {
          _id: `local-project-review-${Date.now()}`,
          title: `Project review requested: ${project.title}`,
          description: message || 'Project workspace was submitted for review.',
          entityType: 'project',
          action: 'updated',
          changes: ['project review status'],
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      toast.success('Project submitted for review');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit project review');
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;
  }

  if (!project) {
    return (
      <div className="academic-card">
        <div className="empty-state">
          <div className="empty-state-icon"><FileText size={28} /></div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Project not found</h3>
          <Link to="/projects" className="btn-secondary">Back to Projects</Link>
        </div>
      </div>
    );
  }

  const grade = getReproGrade(summary.avgRepro);
  const protocolDraftCompletion = getProtocolCompletion(protocolDraft);
  const workspaceSignals = [
    { label: 'Report readiness', value: `${reportReadiness.percent}%`, color: scoreColor(reportReadiness.percent), tabId: 'reports' },
    { label: 'Gap score', value: `${gapAnalysis.score}%`, color: scoreColor(gapAnalysis.score), tabId: 'gaps' },
    { label: 'Review status', value: project.reviewStatus || 'draft', color: 'var(--accent-blue)' },
    { label: 'Last updated', value: formatDate(project.updatedAt || project.createdAt), color: 'var(--accent-green)' },
  ];

  return (
    <div className="page-enter">
      <div className="project-workspace-hero">
        <div className="project-hero-main">
          <Link to="/projects" className="inline-link project-back-link">
            <ArrowLeft size={15} /> Back to projects
          </Link>
          <div className="project-eyebrow">
            <Sparkles size={14} /> Research workspace
          </div>
          <h1 className="page-title">{project.title}</h1>
          <p className="page-subtitle">{project.description}</p>
          <div className="project-badge-row">
            <span className="badge badge-blue">{project.cancerType || 'Research area pending'}</span>
            <span className={`badge ${grade.badgeClass}`}>Reproducibility: {grade.label}</span>
            <span className={`badge ${datasetRiskSummary.grade.badgeClass}`}>Dataset Risk: {datasetRiskSummary.grade.label}</span>
            <span className={`badge ${artifactSummary.grade.badgeClass}`}>Artifacts: {artifactSummary.grade.label}</span>
            <span className={`badge ${protocolBadgeClass(project.studyProtocol?.protocolStatus)}`}>Protocol: {project.studyProtocol?.protocolStatus || 'draft'} - {protocolCompletion}%</span>
            <span className={`badge ${reviewBadgeClass(project.reviewStatus)}`}>Project Review: {project.reviewStatus || 'draft'}</span>
            {project.tags?.map(tag => <span key={tag} className="badge badge-gray">{tag}</span>)}
          </div>
        </div>
        <div className="project-health-panel">
          <div className="project-health-score">
            <span>Workspace health</span>
            <strong>{Math.round((reportReadiness.percent + gapAnalysis.score + summary.avgRepro) / 3)}%</strong>
          </div>
          <div className="project-health-grid">
            {workspaceSignals.map(signal => {
              const content = (
                <>
                  <span>{signal.label}</span>
                  <strong style={{ color: signal.color }}>{signal.value}</strong>
                </>
              );

              return signal.tabId ? (
                <button type="button" className="project-health-row project-health-button" key={signal.label} onClick={() => openWorkspaceTab(signal.tabId)}>
                  {content}
                </button>
              ) : (
                <div className="project-health-row" key={signal.label}>
                  {content}
                </div>
              );
            })}
          </div>
          <div className="page-actions project-hero-actions">
            {(!project.reviewStatus || project.reviewStatus === 'draft' || project.reviewStatus === 'denied') && (
              <button className="btn-secondary" onClick={submitProjectReview}>
                <Send size={16} /> Submit Review
              </button>
            )}
            {project.githubLink && (
              <a className="btn-secondary" href={project.githubLink} target="_blank" rel="noreferrer">
                <GitBranch size={16} /> Code
              </a>
            )}
            {project.paperLink && (
              <a className="btn-secondary" href={project.paperLink} target="_blank" rel="noreferrer">
                <ExternalLink size={16} /> Paper
              </a>
            )}
            <Link className="btn-primary" to="/reports">
              <FileText size={16} /> Build Report
            </Link>
            <Link className="btn-secondary" to="/manuscript">
              <PenLine size={16} /> Manuscript AI
            </Link>
          </div>
        </div>
      </div>

      <div className="project-workspace-tabs">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              className={`project-workspace-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="stats-grid">
            <StatTile icon={Database} label="Datasets" value={datasets.length} color="var(--accent-cyan)" detail="Linked to this project" onClick={() => openWorkspaceTab('datasets')} />
            <StatTile icon={FlaskConical} label="Experiments" value={experiments.length} color="var(--accent-purple)" detail={`${summary.completedRuns} completed runs`} onClick={() => openWorkspaceTab('experiments')} />
            <StatTile icon={BarChart2} label="Best Accuracy" value={summary.bestExperiment?.metrics?.accuracy ? `${summary.bestExperiment.metrics.accuracy}%` : 'N/A'} color="var(--accent-green)" detail={summary.bestExperiment?.modelName || 'No model yet'} onClick={() => openWorkspaceTab('charts')} />
            <StatTile icon={ShieldCheck} label="Avg Repro" value={`${summary.avgRepro}%`} color={scoreColor(summary.avgRepro)} detail={grade.label} onClick={() => openWorkspaceTab('experiments')} />
            <StatTile icon={BookOpenText} label="Protocol" value={`${protocolCompletion}%`} color={scoreColor(protocolCompletion)} detail={project.studyProtocol?.protocolStatus || 'draft'} onClick={() => openWorkspaceTab('protocol')} />
            <StatTile icon={BookOpenText} label="Baselines" value={literatureSummary.total} color="var(--accent-blue)" detail={literatureSummary.hasComparison ? `${literatureSummary.delta >= 0 ? '+' : ''}${literatureSummary.delta}% vs literature` : 'Add published methods'} onClick={() => openWorkspaceTab('literature')} />
            <StatTile icon={Sparkles} label="Gap Score" value={`${gapAnalysis.score}%`} color={scoreColor(gapAnalysis.score)} detail={gapAnalysis.label} onClick={() => openWorkspaceTab('gaps')} />
            <StatTile icon={AlertTriangle} label="Dataset Risk" value={`${datasetRiskSummary.average}%`} color={datasetRiskSummary.grade.color} detail={datasetRiskSummary.grade.label} onClick={() => openWorkspaceTab('risk')} />
            <StatTile icon={FileText} label="Artifacts" value={`${artifactSummary.average}%`} color={artifactSummary.grade.color} detail={`${artifactSummary.completeCount}/${experiments.length} complete`} onClick={() => openWorkspaceTab('artifacts')} />
          </div>

          <div className="two-column-grid" style={{ marginBottom: 24 }}>
            <div className="academic-card" style={{ padding: 24 }}>
              <SectionHeader icon={LineChartIcon} title="Research Progress" />
              {chartData.timeline.length ? (
                <ResponsiveContainer width="100%" height={290}>
                  <LineChart data={chartData.timeline} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="Accuracy" stroke="var(--accent-blue)" strokeWidth={2.5} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Reproducibility" stroke="var(--accent-green)" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: '44px 0' }}>No experiments yet.</div>
              )}
            </div>

            <div className="academic-card" style={{ padding: 24 }}>
              <SectionHeader icon={PieChartIcon} title="Framework Usage" />
              {chartData.frameworkUsage.length ? (
                <FrameworkUsagePanel data={chartData.frameworkUsage} height={250} />
              ) : (
                <div className="empty-state" style={{ padding: '44px 0' }}>Frameworks appear after experiments are logged.</div>
              )}
            </div>
          </div>

          <div className="two-column-grid">
            <div className="academic-card" style={{ padding: 24 }}>
              <SectionHeader
                icon={BarChart2}
                title="Model Comparison"
                action={(
                  <div className="chart-chip-row">
                    <span className="chart-chip chip-blue">Accuracy</span>
                    <span className="chart-chip chip-cyan">F1</span>
                    <span className="chart-chip chip-orange">AUC</span>
                  </div>
                )}
              />
              {chartData.modelComparison.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.modelComparison} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity={0.36} />
                      </linearGradient>
                      <linearGradient id="f1Gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity={0.92} />
                        <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity={0.32} />
                      </linearGradient>
                      <linearGradient id="aucGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-orange)" stopOpacity={0.92} />
                        <stop offset="100%" stopColor="var(--accent-orange)" stopOpacity={0.34} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <ReferenceLine y={80} stroke="var(--accent-green)" strokeDasharray="5 5" strokeOpacity={0.55} label={{ value: 'target', fill: 'var(--text-muted)', fontSize: 11, position: 'insideTopRight' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Accuracy" fill="url(#accuracyGradient)" radius={[8, 8, 0, 0]} maxBarSize={34} />
                    <Bar dataKey="F1" fill="url(#f1Gradient)" radius={[8, 8, 0, 0]} maxBarSize={34} />
                    <Bar dataKey="AUC" fill="url(#aucGradient)" radius={[8, 8, 0, 0]} maxBarSize={34} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: '44px 0' }}>No model results yet.</div>
              )}
            </div>

            <div className="academic-card" style={{ padding: 24 }}>
              <SectionHeader icon={ClipboardCheck} title="Workspace Readiness" />
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>Report readiness</strong>
                  <strong style={{ color: scoreColor(reportReadiness.percent), fontSize: 14 }}>{reportReadiness.percent}%</strong>
                </div>
                <div className="progress-bar" style={{ height: 9 }}>
                  <div className="progress-fill" style={{ width: `${reportReadiness.percent}%`, background: scoreColor(reportReadiness.percent) }} />
                </div>
              </div>
              <div className="cards-stack">
                {reportReadiness.items.map(item => (
                  <div key={item.label} className={`checklist-item ${item.done ? 'checked' : ''}`}>
                    <ShieldCheck size={18} color={item.done ? 'var(--accent-green)' : 'var(--text-muted)'} />
                    <span style={{ fontSize: 13, color: item.done ? 'var(--text-primary)' : 'var(--text-muted)' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'charts' && (
        <div className="two-column-grid">
          {chartPreviewData.isSample && (
            <div className="academic-card" style={{ padding: 18, gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Sample chart preview</strong>
                <p className="muted-copy" style={{ marginTop: 4 }}>These graphs use example research values until this project has experiment metrics and dataset sample counts.</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link className="btn-secondary" to="/experiments">Add Experiments</Link>
                <Link className="btn-secondary" to="/datasets">Add Datasets</Link>
              </div>
            </div>
          )}
          <div className="academic-card" style={{ padding: 24 }}>
            <SectionHeader icon={LineChartIcon} title="Research Progress" />
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartPreviewData.timeline} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="Accuracy" stroke="var(--accent-blue)" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="F1" stroke="var(--accent-cyan)" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Reproducibility" stroke="var(--accent-green)" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="academic-card" style={{ padding: 24 }}>
            <SectionHeader
              icon={BarChart2}
              title="Model Comparison"
              action={(
                <div className="chart-chip-row">
                  <span className="chart-chip chip-blue">Accuracy</span>
                  <span className="chart-chip chip-cyan">F1</span>
                  <span className="chart-chip chip-orange">AUC</span>
                </div>
              )}
            />
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={chartPreviewData.modelComparison} margin={{ top: 18, right: 12, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="accuracyGradientPreview" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity={0.36} />
                  </linearGradient>
                  <linearGradient id="f1GradientPreview" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity={0.92} />
                    <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity={0.32} />
                  </linearGradient>
                  <linearGradient id="aucGradientPreview" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-orange)" stopOpacity={0.92} />
                    <stop offset="100%" stopColor="var(--accent-orange)" stopOpacity={0.34} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <ReferenceLine y={80} stroke="var(--accent-green)" strokeDasharray="5 5" strokeOpacity={0.55} label={{ value: 'target', fill: 'var(--text-muted)', fontSize: 11, position: 'insideTopRight' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Accuracy" fill="url(#accuracyGradientPreview)" radius={[8, 8, 0, 0]} maxBarSize={36} />
                <Bar dataKey="F1" fill="url(#f1GradientPreview)" radius={[8, 8, 0, 0]} maxBarSize={36} />
                <Bar dataKey="AUC" fill="url(#aucGradientPreview)" radius={[8, 8, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="academic-card" style={{ padding: 24 }}>
            <SectionHeader icon={Database} title="Dataset Distribution" />
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartPreviewData.datasetDistribution} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Samples" fill="var(--accent-cyan)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="academic-card" style={{ padding: 24 }}>
            <SectionHeader icon={PieChartIcon} title="Framework Usage" />
            <FrameworkUsagePanel data={chartPreviewData.frameworkUsage} height={280} />
          </div>
        </div>
      )}

      {activeTab === 'protocol' && (
        <div className="two-column-grid">
          <div className="academic-card" style={{ padding: 24 }}>
            <SectionHeader icon={BookOpenText} title="Study Protocol" />
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)', fontSize: 16 }}>{protocolDraft.protocolStatus || 'draft'}</strong>
                  <p className="muted-copy" style={{ marginTop: 4 }}>Structured research design for reviewer-ready project documentation.</p>
                </div>
                <span className={`badge ${protocolBadgeClass(protocolDraft.protocolStatus)}`}>{protocolDraftCompletion}% complete</span>
              </div>
              <div className="progress-bar" style={{ height: 10 }}>
                <div className="progress-fill" style={{ width: `${protocolDraftCompletion}%`, background: scoreColor(protocolDraftCompletion) }} />
              </div>
            </div>
            <div className="insight-list">
              <div><span>Version</span><strong>{protocolDraft.version || 'v1.0'}</strong></div>
              <div><span>Status</span><strong>{protocolDraft.protocolStatus || 'draft'}</strong></div>
              <div><span>Study type</span><strong>{protocolDraft.studyType || 'Pending'}</strong></div>
              <div><span>Last updated</span><strong>{formatDate(project.studyProtocol?.lastUpdatedAt)}</strong></div>
            </div>
          </div>

          <div className="academic-card" style={{ padding: 24 }}>
            <SectionHeader icon={ClipboardCheck} title="Protocol Checklist" />
            <div className="cards-stack">
              {protocolCoreFields.map(field => {
                const done = Boolean(String(protocolDraft[field.key] || '').trim());
                return (
                  <div key={field.key} className={`checklist-item ${done ? 'checked' : ''}`}>
                    <ShieldCheck size={18} color={done ? 'var(--accent-green)' : 'var(--text-muted)'} />
                    <span style={{ fontSize: 13, color: done ? 'var(--text-primary)' : 'var(--text-muted)' }}>{field.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="academic-card" style={{ padding: 24, gridColumn: '1 / -1' }}>
            <SectionHeader
              icon={BookOpenText}
              title="Protocol Builder"
              action={(
                <button className="btn-primary" onClick={saveProtocol} disabled={protocolSaving}>
                  <Save size={16} /> {protocolSaving ? 'Saving...' : 'Save Protocol'}
                </button>
              )}
            />
            <div className="form-grid">
              <div>
                <label className="label">Version</label>
                <input
                  className="input-field"
                  value={protocolDraft.version || ''}
                  onChange={event => updateProtocolDraft('version', event.target.value)}
                  placeholder="v1.0"
                />
              </div>
              <div>
                <label className="label">Protocol Status</label>
                <select
                  className="input-field"
                  value={protocolDraft.protocolStatus || 'draft'}
                  onChange={event => updateProtocolDraft('protocolStatus', event.target.value)}
                >
                  <option value="draft">Draft</option>
                  <option value="ready">Ready</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="needs_revision">Needs revision</option>
                </select>
              </div>
              <div>
                <label className="label">Study Type</label>
                <select
                  className="input-field"
                  value={protocolDraft.studyType || ''}
                  onChange={event => updateProtocolDraft('studyType', event.target.value)}
                >
                  <option value="">Select study type</option>
                  <option value="Retrospective validation">Retrospective validation</option>
                  <option value="Prospective validation">Prospective validation</option>
                  <option value="Benchmark study">Benchmark study</option>
                  <option value="Ablation study">Ablation study</option>
                  <option value="External validation">External validation</option>
                  <option value="XAI study">XAI study</option>
                </select>
              </div>
              <div>
                <label className="label">Primary / Secondary Endpoints</label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={protocolDraft.endpoints || ''}
                  onChange={event => updateProtocolDraft('endpoints', event.target.value)}
                  placeholder="Primary accuracy/AUC endpoint, secondary robustness or subgroup endpoints..."
                />
              </div>
              <div>
                <label className="label">Research Objective</label>
                <textarea
                  className="input-field"
                  rows={4}
                  value={protocolDraft.objective || ''}
                  onChange={event => updateProtocolDraft('objective', event.target.value)}
                  placeholder="Define the research question this project will answer."
                />
              </div>
              <div>
                <label className="label">Hypothesis</label>
                <textarea
                  className="input-field"
                  rows={4}
                  value={protocolDraft.hypothesis || ''}
                  onChange={event => updateProtocolDraft('hypothesis', event.target.value)}
                  placeholder="State the expected model performance or reproducibility claim."
                />
              </div>
              <div>
                <label className="label">Inclusion Criteria</label>
                <textarea
                  className="input-field"
                  rows={4}
                  value={protocolDraft.inclusionCriteria || ''}
                  onChange={event => updateProtocolDraft('inclusionCriteria', event.target.value)}
                  placeholder="Which scans, records, labels, or cohorts are eligible?"
                />
              </div>
              <div>
                <label className="label">Exclusion Criteria</label>
                <textarea
                  className="input-field"
                  rows={4}
                  value={protocolDraft.exclusionCriteria || ''}
                  onChange={event => updateProtocolDraft('exclusionCriteria', event.target.value)}
                  placeholder="Which cases should be removed and why?"
                />
              </div>
              <div>
                <label className="label">Dataset Plan</label>
                <textarea
                  className="input-field"
                  rows={4}
                  value={protocolDraft.datasetPlan || ''}
                  onChange={event => updateProtocolDraft('datasetPlan', event.target.value)}
                  placeholder="Dataset source, splits, leakage prevention, external test set..."
                />
              </div>
              <div>
                <label className="label">Model Plan</label>
                <textarea
                  className="input-field"
                  rows={4}
                  value={protocolDraft.modelPlan || ''}
                  onChange={event => updateProtocolDraft('modelPlan', event.target.value)}
                  placeholder="Model family, baseline, architecture, training approach..."
                />
              </div>
              <div>
                <label className="label">Validation Plan</label>
                <textarea
                  className="input-field"
                  rows={4}
                  value={protocolDraft.validationPlan || ''}
                  onChange={event => updateProtocolDraft('validationPlan', event.target.value)}
                  placeholder="Cross-validation, holdout testing, external validation, confidence intervals..."
                />
              </div>
              <div>
                <label className="label">Statistical Plan</label>
                <textarea
                  className="input-field"
                  rows={4}
                  value={protocolDraft.statisticalPlan || ''}
                  onChange={event => updateProtocolDraft('statisticalPlan', event.target.value)}
                  placeholder="Metric comparisons, significance tests, confidence intervals, subgroup analysis..."
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="label">Ethics / Governance Notes</label>
                <textarea
                  className="input-field"
                  rows={4}
                  value={protocolDraft.ethicsNotes || ''}
                  onChange={event => updateProtocolDraft('ethicsNotes', event.target.value)}
                  placeholder="IRB status, data access, anonymization, consent, governance limitations..."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'literature' && (
        <div className="two-column-grid">
          <div className="academic-card" style={{ padding: 24 }}>
            <SectionHeader icon={BookOpenText} title="Baseline Comparison" />
            <div className="insight-list">
              <div><span>Tracked papers</span><strong>{literatureSummary.total}</strong></div>
              <div><span>Best project model</span><strong>{summary.bestExperiment?.modelName || 'Pending'}</strong></div>
              <div><span>Best literature accuracy</span><strong>{literatureSummary.bestBaseline ? `${literatureSummary.bestBaseline.accuracy}%` : 'Pending'}</strong></div>
              <div>
                <span>Project delta</span>
                <strong>{literatureSummary.hasComparison ? `${literatureSummary.delta >= 0 ? '+' : ''}${literatureSummary.delta}%` : 'Pending'}</strong>
              </div>
            </div>
          </div>

          <div className="academic-card" style={{ padding: 24 }}>
            <SectionHeader icon={ClipboardCheck} title="Research Positioning" />
            <div className="cards-stack">
              <div className={`checklist-item ${literatureSummary.total ? 'checked' : ''}`}>
                <ShieldCheck size={18} color={literatureSummary.total ? 'var(--accent-green)' : 'var(--text-muted)'} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>At least one published baseline is recorded.</span>
              </div>
              <div className={`checklist-item ${literatureSummary.bestBaseline ? 'checked' : ''}`}>
                <ShieldCheck size={18} color={literatureSummary.bestBaseline ? 'var(--accent-green)' : 'var(--text-muted)'} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Published performance metrics are captured.</span>
              </div>
              <div className={`checklist-item ${literatureSummary.hasComparison ? 'checked' : ''}`}>
                <ShieldCheck size={18} color={literatureSummary.hasComparison ? 'var(--accent-green)' : 'var(--text-muted)'} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Project best model can be compared with literature.</span>
              </div>
            </div>
          </div>

          <div className="academic-card" style={{ padding: 24, gridColumn: '1 / -1' }}>
            <SectionHeader
              icon={BookOpenText}
              title="Literature Baseline Matrix"
              action={(
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn-secondary" onClick={addBaselineDraft}>
                    <Plus size={16} /> Add Paper
                  </button>
                  <button className="btn-primary" onClick={saveBaselines} disabled={baselineSaving}>
                    <Save size={16} /> {baselineSaving ? 'Saving...' : 'Save Baselines'}
                  </button>
                </div>
              )}
            />
            <div className="cards-stack">
              {baselineDrafts.map((row, index) => (
                <div key={row._id || index} className="academic-card" style={{ padding: 18, background: 'var(--bg-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Paper {index + 1}</strong>
                    <button className="btn-secondary" onClick={() => removeBaselineDraft(index)} style={{ padding: 8, minWidth: 0 }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="form-grid">
                    <div>
                      <label className="label">Paper Title</label>
                      <input className="input-field" value={row.paperTitle || ''} onChange={event => updateBaselineDraft(index, 'paperTitle', event.target.value)} placeholder="Published study title" />
                    </div>
                    <div>
                      <label className="label">Authors</label>
                      <input className="input-field" value={row.authors || ''} onChange={event => updateBaselineDraft(index, 'authors', event.target.value)} placeholder="First author et al." />
                    </div>
                    <div>
                      <label className="label">Year</label>
                      <input className="input-field" type="number" value={row.year || ''} onChange={event => updateBaselineDraft(index, 'year', event.target.value)} placeholder="2026" />
                    </div>
                    <div>
                      <label className="label">Venue</label>
                      <input className="input-field" value={row.venue || ''} onChange={event => updateBaselineDraft(index, 'venue', event.target.value)} placeholder="Journal or conference" />
                    </div>
                    <div>
                      <label className="label">Task</label>
                      <input className="input-field" value={row.task || ''} onChange={event => updateBaselineDraft(index, 'task', event.target.value)} placeholder="Classification, segmentation, survival prediction..." />
                    </div>
                    <div>
                      <label className="label">Dataset</label>
                      <input className="input-field" value={row.dataset || ''} onChange={event => updateBaselineDraft(index, 'dataset', event.target.value)} placeholder="Dataset or cohort used" />
                    </div>
                    <div>
                      <label className="label">Model</label>
                      <input className="input-field" value={row.modelName || ''} onChange={event => updateBaselineDraft(index, 'modelName', event.target.value)} placeholder="ResNet, ViT, U-Net..." />
                    </div>
                    <div>
                      <label className="label">Accuracy (%)</label>
                      <input className="input-field" type="number" value={row.accuracy || ''} onChange={event => updateBaselineDraft(index, 'accuracy', event.target.value)} placeholder="92.4" />
                    </div>
                    <div>
                      <label className="label">F1 (%)</label>
                      <input className="input-field" type="number" value={row.f1Score || ''} onChange={event => updateBaselineDraft(index, 'f1Score', event.target.value)} placeholder="90.1" />
                    </div>
                    <div>
                      <label className="label">AUC</label>
                      <input className="input-field" type="number" value={row.auc || ''} onChange={event => updateBaselineDraft(index, 'auc', event.target.value)} placeholder="0.94" />
                    </div>
                    <div>
                      <label className="label">Paper Link / DOI</label>
                      <input className="input-field" value={row.link || ''} onChange={event => updateBaselineDraft(index, 'link', event.target.value)} placeholder="https://doi.org/..." />
                    </div>
                    <div>
                      <label className="label">Reproducibility Notes</label>
                      <input className="input-field" value={row.reproducibilityNotes || ''} onChange={event => updateBaselineDraft(index, 'reproducibilityNotes', event.target.value)} placeholder="Code available, dataset private, seed missing..." />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="label">Comparison Notes</label>
                      <textarea className="input-field" rows={3} value={row.notes || ''} onChange={event => updateBaselineDraft(index, 'notes', event.target.value)} placeholder="How this baseline differs from your project setup, dataset, or endpoint." />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="academic-card" style={{ padding: 24, gridColumn: '1 / -1', overflowX: 'auto' }}>
            <SectionHeader icon={BarChart2} title="Saved Literature Matrix" />
            {literatureBaselines.length ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 24 }}>Paper</th>
                    <th>Year</th>
                    <th>Dataset</th>
                    <th>Model</th>
                    <th>Accuracy</th>
                    <th>F1</th>
                    <th>AUC</th>
                    <th style={{ paddingRight: 24 }}>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {literatureBaselines.map((baseline, index) => (
                    <tr key={baseline._id || index}>
                      <td style={{ paddingLeft: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{baseline.paperTitle || 'Untitled paper'}</td>
                      <td>{baseline.year || 'N/A'}</td>
                      <td>{baseline.dataset || 'N/A'}</td>
                      <td>{baseline.modelName || 'N/A'}</td>
                      <td style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{typeof baseline.accuracy === 'number' ? `${baseline.accuracy}%` : 'N/A'}</td>
                      <td>{typeof baseline.f1Score === 'number' ? `${baseline.f1Score}%` : 'N/A'}</td>
                      <td>{typeof baseline.auc === 'number' ? baseline.auc : 'N/A'}</td>
                      <td style={{ paddingRight: 24 }}>
                        {baseline.link ? <a className="inline-link" href={baseline.link} target="_blank" rel="noreferrer">Open <ExternalLink size={13} /></a> : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state" style={{ padding: '44px 0' }}>Add papers to build a literature comparison matrix.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'gaps' && (
        <div className="two-column-grid">
          <div className="academic-card" style={{ padding: 24 }}>
            <SectionHeader icon={Sparkles} title="Research Gap Score" />
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)', fontSize: 16 }}>{gapAnalysis.label}</strong>
                  <p className="muted-copy" style={{ marginTop: 4 }}>Computed from protocol, literature, datasets, experiments, artifacts, reproducibility, and XAI coverage.</p>
                </div>
                <span className={`badge ${gapAnalysis.score >= 80 ? 'badge-green' : gapAnalysis.score >= 60 ? 'badge-blue' : gapAnalysis.score >= 40 ? 'badge-orange' : 'badge-red'}`}>{gapAnalysis.score}%</span>
              </div>
              <div className="progress-bar" style={{ height: 10 }}>
                <div className="progress-fill" style={{ width: `${gapAnalysis.score}%`, background: scoreColor(gapAnalysis.score) }} />
              </div>
            </div>
            <div className="insight-list">
              <div><span>Total gaps</span><strong>{gapAnalysis.gaps.length}</strong></div>
              <div><span>High priority</span><strong>{gapAnalysis.highCount}</strong></div>
              <div><span>Strengths</span><strong>{gapAnalysis.strengths.length}</strong></div>
              <div><span>Next focus</span><strong>{gapAnalysis.gaps[0]?.area || 'Maintain quality'}</strong></div>
            </div>
          </div>

          <div className="academic-card" style={{ padding: 24 }}>
            <SectionHeader icon={ClipboardCheck} title="Research Strengths" />
            <div className="cards-stack">
              {gapAnalysis.strengths.length ? gapAnalysis.strengths.map(strength => (
                <div key={strength} className="checklist-item checked">
                  <ShieldCheck size={18} color="var(--accent-green)" />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{strength}</span>
                </div>
              )) : (
                <p className="muted-copy">Strengths will appear after the core research records are filled.</p>
              )}
            </div>
          </div>

          <div className="academic-card" style={{ padding: 24, gridColumn: '1 / -1' }}>
            <SectionHeader icon={AlertTriangle} title="Actionable Research Gaps" />
            <div className="cards-stack">
              {gapAnalysis.gaps.length ? gapAnalysis.gaps.map(gap => (
                <div key={`${gap.area}-${gap.issue}`} className="mini-record" style={{ alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                      <strong>{gap.area}</strong>
                      <span className={`badge ${getPriorityBadge(gap.priority)}`}>{gap.priority} priority</span>
                    </div>
                    <span>{gap.issue}</span>
                    <p className="muted-copy" style={{ marginTop: 8, lineHeight: 1.6 }}>{gap.action}</p>
                  </div>
                  <AlertTriangle size={18} color={gap.priority === 'High' ? 'var(--accent-red)' : gap.priority === 'Medium' ? 'var(--accent-orange)' : 'var(--accent-green)'} />
                </div>
              )) : (
                <div className="empty-state" style={{ padding: '44px 0' }}>
                  <div className="empty-state-icon"><Sparkles size={28} /></div>
                  <p>No major gaps detected. Keep evidence, artifacts, and review notes current.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'datasets' && (
        <div className="two-column-grid">
          <div className="academic-card" style={{ padding: 24 }}>
            <SectionHeader icon={Database} title="Dataset Registry" action={<Link className="btn-secondary" to="/datasets">Manage</Link>} />
            <div className="cards-stack">
              {datasets.length ? datasets.map(ds => (
                <div key={ds._id} className="mini-record">
                  <div>
                    <strong>{ds.name}</strong>
                    <span>{metricValue(ds.totalSamples)} samples - {ds.format || 'Unknown format'} - {ds.source || ds.sourceLink || 'Source pending'}</span>
                  </div>
                  <Database size={18} color="var(--accent-cyan)" />
                </div>
              )) : <p className="muted-copy">No datasets linked yet.</p>}
            </div>
          </div>

          <div className="academic-card" style={{ padding: 24 }}>
            <SectionHeader icon={BarChart2} title="Sample Distribution" />
            {chartData.datasetDistribution.some(item => item.Samples > 0) ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData.datasetDistribution} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Samples" fill="var(--accent-cyan)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: '44px 0' }}>Add sample counts to visualize dataset scale.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'risk' && (
        <div className="two-column-grid">
          <div className="academic-card" style={{ padding: 24 }}>
            <SectionHeader icon={AlertTriangle} title="Project Dataset Risk" />
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)', fontSize: 16 }}>{datasetRiskSummary.grade.label}</strong>
                  <p className="muted-copy" style={{ marginTop: 4 }}>{datasetRiskSummary.grade.summary}</p>
                </div>
                <span className={`badge ${datasetRiskSummary.grade.badgeClass}`}>{datasetRiskSummary.average}% risk</span>
              </div>
              <div className="progress-bar" style={{ height: 10 }}>
                <div className="progress-fill" style={{ width: `${datasetRiskSummary.average}%`, background: datasetRiskSummary.grade.color }} />
              </div>
            </div>
            <div className="insight-list">
              <div><span>Total datasets</span><strong>{datasets.length}</strong></div>
              <div><span>High-risk datasets</span><strong>{datasetRiskSummary.highRiskCount}</strong></div>
              <div><span>Review priority</span><strong>{datasetRiskSummary.highRiskCount ? 'Bias documentation' : 'Maintain documentation'}</strong></div>
              <div><span>Report status</span><strong>{datasetRiskSummary.average <= 50 ? 'Usable with notes' : 'Needs risk review'}</strong></div>
            </div>
          </div>

          <div className="academic-card" style={{ padding: 24 }}>
            <SectionHeader icon={ClipboardCheck} title="Risk Checklist Coverage" action={<Link className="btn-secondary" to="/datasets">Edit Datasets</Link>} />
            {datasets.length ? (
              <div className="cards-stack">
                {DATASET_RISK_ITEMS.map(item => {
                  const covered = datasets.filter(dataset => dataset.datasetRisk?.[item.key]).length;
                  const percent = Math.round((covered / datasets.length) * 100);
                  return (
                    <div key={item.key} className={`checklist-item ${percent === 100 ? 'checked' : ''}`} style={{ justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <ShieldCheck size={17} color={percent === 100 ? 'var(--accent-green)' : 'var(--text-muted)'} />
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
                      </span>
                      <strong style={{ fontSize: 13, color: percent === 100 ? 'var(--accent-green)' : 'var(--text-muted)' }}>{covered}/{datasets.length}</strong>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '44px 0' }}>Add datasets before assessing risk.</div>
            )}
          </div>

          <div className="academic-card" style={{ padding: 24 }}>
            <SectionHeader icon={Database} title="Dataset Risk Register" />
            <div className="cards-stack">
              {datasets.length ? datasets.map(dataset => {
                const riskScore = getDatasetRiskScore(dataset);
                const riskGrade = getDatasetRiskGrade(riskScore);
                return (
                  <div key={dataset._id} className="mini-record" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <strong>{dataset.name}</strong>
                      <span>{riskGrade.summary}</span>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        {getDatasetRiskSuggestions(dataset, 2).map(suggestion => (
                          <span key={suggestion} className="badge badge-gray">{suggestion}</span>
                        ))}
                      </div>
                    </div>
                    <span className={`badge ${riskGrade.badgeClass}`}>{riskGrade.label}</span>
                  </div>
                );
              }) : <p className="muted-copy">No datasets linked yet.</p>}
            </div>
          </div>

          <div className="academic-card" style={{ padding: 24 }}>
            <SectionHeader icon={BookOpenText} title="Risk Notes" />
            <div className="cards-stack">
              {datasets.filter(dataset => dataset.datasetRisk?.riskNotes || dataset.limitations).length ? (
                datasets.filter(dataset => dataset.datasetRisk?.riskNotes || dataset.limitations).map(dataset => (
                  <div key={dataset._id} className="checklist-item" style={{ alignItems: 'flex-start' }}>
                    <AlertTriangle size={17} color="var(--accent-orange)" />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{dataset.name}: </strong>
                      {dataset.datasetRisk?.riskNotes || dataset.limitations}
                    </span>
                  </div>
                ))
              ) : (
                <p className="muted-copy">Risk notes will appear here after datasets are documented.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'experiments' && (
        <div className="academic-card" style={{ overflowX: 'auto' }}>
          <SectionHeader icon={FlaskConical} title="Experiment Runs" action={<Link className="btn-primary" to="/experiments">Log Experiment</Link>} />
          {experiments.length ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 24 }}>Experiment</th>
                  <th>Model</th>
                  <th>Dataset</th>
                  <th>Accuracy</th>
                  <th>F1</th>
                  <th>AUC</th>
                  <th>Repro</th>
                  <th>Artifacts</th>
                  <th>Review</th>
                  <th style={{ paddingRight: 24, textAlign: 'right' }}>Open</th>
                </tr>
              </thead>
              <tbody>
                {experiments.map(exp => (
                  <tr key={exp._id}>
                    <td style={{ paddingLeft: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{exp.name}</td>
                    <td>{exp.modelName}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{exp.dataset?.name || 'N/A'}</td>
                    <td style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{metricValue(exp.metrics?.accuracy)}%</td>
                    <td>{metricValue(exp.metrics?.f1Score)}%</td>
                    <td>{metricValue(exp.metrics?.auc)}</td>
                  <td>
                    <span className={`badge ${getReproGrade(getReproScore(exp)).badgeClass}`}>
                      {getReproGrade(getReproScore(exp)).label} - {getReproScore(exp)}%
                    </span>
                  </td>
                  <td>
                    {(() => {
                      const readiness = getArtifactReadiness(exp);
                      return (
                        <span className={`badge ${readiness.badgeClass}`}>
                          {readiness.label} - {readiness.percent}%
                        </span>
                      );
                    })()}
                  </td>
                  <td>
                    <span className={`badge ${exp.reviewStatus === 'approved' ? 'badge-green' : exp.reviewStatus === 'pending' ? 'badge-orange' : exp.reviewStatus === 'denied' ? 'badge-red' : 'badge-gray'}`}>
                      {exp.reviewStatus || 'draft'}
                    </span>
                  </td>
                    <td style={{ paddingRight: 24, textAlign: 'right' }}>
                      <Link to={`/experiments/${exp._id}`} className="btn-secondary" style={{ padding: 7, minWidth: 0 }}>
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon"><FlaskConical size={28} /></div>
              <p>No experiments logged yet.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'artifacts' && (
        <div className="two-column-grid">
          <div className="academic-card" style={{ padding: 24 }}>
            <SectionHeader icon={FileText} title="Artifact Readiness" action={<Link className="btn-primary" to="/experiments">Add Links</Link>} />
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)', fontSize: 16 }}>{artifactSummary.grade.label}</strong>
                  <p className="muted-copy" style={{ marginTop: 4 }}>Project-level coverage across code, notebooks, model cards, environments, weights, and protocols.</p>
                </div>
                <span className={`badge ${artifactSummary.grade.badgeClass}`}>{artifactSummary.average}% covered</span>
              </div>
              <div className="progress-bar" style={{ height: 10 }}>
                <div className="progress-fill" style={{ width: `${artifactSummary.average}%`, background: artifactSummary.grade.color }} />
              </div>
            </div>
            <div className="insight-list">
              <div><span>Tracked experiments</span><strong>{experiments.length}</strong></div>
              <div><span>Complete artifact packages</span><strong>{artifactSummary.completeCount}</strong></div>
              <div><span>Missing all artifacts</span><strong>{artifactSummary.missingCount}</strong></div>
              <div><span>Report status</span><strong>{artifactSummary.average >= 55 ? 'Ready with caveats' : 'Needs artifact links'}</strong></div>
            </div>
          </div>

          <div className="academic-card" style={{ padding: 24 }}>
            <SectionHeader icon={ClipboardCheck} title="Artifact Coverage" />
            {experiments.length ? (
              <div className="cards-stack">
                {ARTIFACT_ITEMS.map(item => {
                  const covered = experiments.filter(exp => exp[item.key]).length;
                  const percent = Math.round((covered / experiments.length) * 100);
                  return (
                    <div key={item.key} className={`checklist-item ${percent === 100 ? 'checked' : ''}`} style={{ justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <ShieldCheck size={17} color={percent === 100 ? 'var(--accent-green)' : 'var(--text-muted)'} />
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
                      </span>
                      <strong style={{ fontSize: 13, color: percent === 100 ? 'var(--accent-green)' : 'var(--text-muted)' }}>{covered}/{experiments.length}</strong>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '44px 0' }}>Log experiments before tracking artifact coverage.</div>
            )}
          </div>

          <div className="academic-card" style={{ padding: 24, gridColumn: '1 / -1' }}>
            <SectionHeader icon={GitBranch} title="Experiment Artifact Inventory" />
            <div className="cards-stack">
              {experiments.length ? experiments.map(exp => {
                const readiness = getArtifactReadiness(exp);
                const presentArtifacts = getExperimentArtifacts(exp).filter(item => item.present);
                return (
                  <div key={exp._id} className="mini-record" style={{ alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                        <strong>{exp.name}</strong>
                        <span className={`badge ${readiness.badgeClass}`}>{readiness.label} - {readiness.percent}%</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                        {presentArtifacts.length ? presentArtifacts.map(item => (
                          <a key={item.key} href={item.value} target="_blank" rel="noreferrer" className="badge badge-gray" style={{ textDecoration: 'none' }}>
                            {item.shortLabel} <ExternalLink size={12} />
                          </a>
                        )) : (
                          <span className="muted-copy">No artifact links recorded.</span>
                        )}
                      </div>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{getArtifactSuggestions(exp, 1)[0]}</span>
                    </div>
                    <Link to={`/experiments/${exp._id}`} className="btn-secondary" style={{ padding: 7, minWidth: 0 }}>
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                );
              }) : <p className="muted-copy">No experiments logged yet.</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'xai' && (
        <div className="cards-stack">
          {summary.xaiRecords.length ? summary.xaiRecords.map(exp => (
            <div key={exp._id} className="academic-card xai-card" style={{ padding: 24 }}>
              <div style={{ width: 280, minHeight: 190, flexShrink: 0, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {exp.xaiEvidenceUrl ? (
                  <img src={exp.xaiEvidenceUrl} alt={`${exp.xaiMethod} evidence`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <Microscope size={36} color="var(--text-muted)" />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <span className="badge badge-purple">{exp.xaiMethod}</span>
                <h3 style={{ color: 'var(--text-primary)', margin: '10px 0 6px', fontSize: 18 }}>{exp.name}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>{exp.xaiNotes || 'No interpretation notes recorded yet.'}</p>
                <Link to={`/experiments/${exp._id}`} className="inline-link" style={{ marginTop: 14 }}>Open experiment <ChevronRight size={14} /></Link>
              </div>
            </div>
          )) : (
            <div className="academic-card">
              <div className="empty-state">
                <div className="empty-state-icon"><Microscope size={28} /></div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>No XAI evidence yet</h3>
                <p style={{ fontSize: 14, marginBottom: 16 }}>Add explainability records to support model transparency.</p>
                <Link className="btn-primary" to="/xai-evidence">Add XAI Record</Link>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="two-column-grid">
          <div className="academic-card" style={{ padding: 24 }}>
            <SectionHeader icon={FileText} title="Report Package" action={<Link className="btn-primary" to="/reports">Open Builder</Link>} />
            <div className="insight-list">
              <div><span>Readiness</span><strong>{reportReadiness.percent}%</strong></div>
              <div><span>Datasets included</span><strong>{datasets.length}</strong></div>
              <div><span>Experiments included</span><strong>{experiments.length}</strong></div>
              <div><span>XAI records</span><strong>{summary.xaiRecords.length}</strong></div>
              <div><span>Best model</span><strong>{summary.bestExperiment ? summary.bestExperiment.modelName : 'Pending'}</strong></div>
            </div>
          </div>
          <div className="academic-card" style={{ padding: 24 }}>
            <SectionHeader icon={BookOpenText} title="Suggested Conclusions" />
            <div className="cards-stack">
              {improvementSuggestions.map(suggestion => (
                <div key={suggestion} className="checklist-item">
                  <Sparkles size={18} color="var(--accent-cyan)" />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{suggestion}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="two-column-grid">
          <div className="academic-card" style={{ padding: 24 }}>
            <SectionHeader icon={ClipboardCheck} title="Audit Summary" />
            <div className="insight-list">
              <div><span>Total events</span><strong>{activities.length}</strong></div>
              <div><span>Dataset changes</span><strong>{activities.filter(item => item.entityType === 'dataset').length}</strong></div>
              <div><span>Experiment changes</span><strong>{activities.filter(item => item.entityType === 'experiment').length}</strong></div>
              <div><span>Reports generated</span><strong>{activities.filter(item => item.entityType === 'report').length}</strong></div>
            </div>
          </div>

          <div className="academic-card" style={{ padding: 24 }}>
            <SectionHeader icon={FileText} title="Latest Record" />
            {activities[0] ? (
              <div className="mini-record" style={{ alignItems: 'flex-start' }}>
                <div>
                  <strong>{activities[0].title}</strong>
                  <span>{activities[0].description || 'No description recorded.'}</span>
                  <span>{formatActivityTime(activities[0].createdAt)} by {activities[0].user?.name || 'Researcher'}</span>
                </div>
                {(() => {
                  const Icon = getActivityIcon(activities[0]);
                  return <Icon size={18} color={getActivityColor(activities[0])} />;
                })()}
              </div>
            ) : (
              <p className="muted-copy">Activity will appear after you create or update research records.</p>
            )}
          </div>

          <div className="academic-card" style={{ padding: 24, gridColumn: '1 / -1' }}>
            <SectionHeader icon={ClipboardCheck} title="Project Activity Feed" />
            <div className="cards-stack">
              {activities.length ? activities.map(activity => {
                const Icon = getActivityIcon(activity);
                return (
                  <div key={activity._id} className="mini-record" style={{ alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={18} color={getActivityColor(activity)} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                        <strong>{activity.title}</strong>
                        <span className="badge badge-gray">{activity.entityType}</span>
                        <span className="badge badge-gray">{activity.action}</span>
                      </div>
                      <span>{activity.description || 'No description recorded.'}</span>
                      {activity.changes?.length ? (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                          {activity.changes.slice(0, 6).map(change => (
                            <span key={change} className="badge badge-cyan">{change}</span>
                          ))}
                        </div>
                      ) : null}
                      <span style={{ marginTop: 8 }}>{formatActivityTime(activity.createdAt)} by {activity.user?.name || 'Researcher'}</span>
                    </div>
                  </div>
                );
              }) : (
                <div className="empty-state" style={{ padding: '44px 0' }}>
                  <div className="empty-state-icon"><ClipboardCheck size={28} /></div>
                  <p>No audit events yet. New project, dataset, experiment, and report actions will be tracked here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="academic-card" style={{ padding: 24 }}>
          <SectionHeader
            icon={NotebookPen}
            title="Project Notes"
            action={(
              <button className="btn-primary" onClick={saveNotes}>
                <Save size={16} /> Save Notes
              </button>
            )}
          />
          <textarea
            className="input-field"
            rows={12}
            value={notes}
            onChange={event => {
              setNotes(event.target.value);
              setNotesSaved(false);
            }}
            placeholder="Record supervisor feedback, next experiments, report conclusions, or data caveats..."
            style={{ resize: 'vertical', lineHeight: 1.6 }}
          />
          <p className="muted-copy" style={{ marginTop: 10 }}>
            {notesSaved ? 'Saved locally for this project.' : 'Notes are stored locally in this browser.'}
          </p>
        </div>
      )}

      {summary.bestExperiment && activeTab === 'overview' && (
        <div className="academic-card project-highlight">
          <Sparkles size={20} color="var(--accent-cyan)" />
          <div>
            <h3>Best current candidate</h3>
            <p>{summary.bestExperiment.name} is leading with {metricValue(summary.bestExperiment.metrics?.accuracy)}% accuracy and a reproducibility score of {metricValue(summary.bestExperiment.reproducibilityScore)}%.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;
