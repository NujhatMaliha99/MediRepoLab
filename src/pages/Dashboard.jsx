import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell
} from 'recharts';
import api from '../api/axios';
import { FolderOpen, Database, FlaskConical, Trophy, Sparkles, ClipboardCheck, ArrowRight, ShieldCheck } from 'lucide-react';
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

const getProtocolCompletion = protocol => {
  const filled = protocolFields.filter(field => String(protocol?.[field] || '').trim()).length;
  return Math.round((filled / protocolFields.length) * 100);
};

const scoreColor = score => (
  score >= 80 ? 'var(--accent-green)' : score >= 55 ? 'var(--accent-orange)' : 'var(--accent-red)'
);

const getReadinessLabel = score => {
  if (score >= 85) return { label: 'Publication Ready', badgeClass: 'badge-green' };
  if (score >= 70) return { label: 'Nearly Ready', badgeClass: 'badge-cyan' };
  if (score >= 50) return { label: 'Needs Work', badgeClass: 'badge-orange' };
  return { label: 'At Risk', badgeClass: 'badge-red' };
};

const buildProjectReadiness = (project, datasets, experiments) => {
  const projectDatasets = datasets.filter(dataset => (dataset.project?._id || dataset.project) === project._id);
  const projectExperiments = experiments.filter(experiment => (experiment.project?._id || experiment.project) === project._id);
  const protocolCompletion = getProtocolCompletion(project.studyProtocol);
  const avgRepro = getAverageReproScore(projectExperiments);
  const artifactSummary = getProjectArtifactSummary(projectExperiments);
  const datasetRiskSummary = getProjectDatasetRiskSummary(projectDatasets);
  const literatureCount = project.literatureBaselines?.length || 0;
  const xaiCount = projectExperiments.filter(experiment => experiment.xaiMethod && experiment.xaiMethod !== 'None').length;
  const completedRuns = projectExperiments.filter(experiment => experiment.status === 'completed').length;
  const bestAccuracy = projectExperiments.reduce((best, experiment) => Math.max(best, experiment.metrics?.accuracy || 0), 0);

  const checks = [
    { key: 'overview', label: 'Project overview', done: Boolean(project.title && project.description && project.cancerType), weight: 10 },
    { key: 'protocol', label: 'Study protocol', done: protocolCompletion >= 75, weight: 16 },
    { key: 'datasets', label: 'Dataset registered', done: projectDatasets.length > 0, weight: 12 },
    { key: 'risk', label: 'Dataset risk documented', done: datasetRiskSummary.average <= 35, weight: 14 },
    { key: 'experiments', label: 'Completed experiments', done: completedRuns >= 2, weight: 14 },
    { key: 'repro', label: 'Reproducibility score', done: avgRepro >= 70, weight: 12 },
    { key: 'xai', label: 'XAI evidence', done: xaiCount > 0, weight: 8 },
    { key: 'artifacts', label: 'Research artifacts', done: artifactSummary.average >= 55 || Boolean(project.githubLink || project.paperLink), weight: 8 },
    { key: 'literature', label: 'Literature baseline', done: literatureCount > 0, weight: 6 },
  ];

  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
  const score = Math.round(checks.reduce((sum, check) => sum + (check.done ? check.weight : 0), 0) / totalWeight * 100);
  const missingChecks = checks.filter(check => !check.done);
  const label = getReadinessLabel(score);
  const reproGrade = getReproGrade(avgRepro);

  const nextActions = [];
  if (protocolCompletion < 75) nextActions.push(`Complete protocol fields (${protocolCompletion}% done).`);
  if (!projectDatasets.length) nextActions.push('Register at least one project dataset.');
  if (datasetRiskSummary.average > 35) nextActions.push('Strengthen dataset risk and bias documentation.');
  if (completedRuns < 2) nextActions.push('Add another completed experiment for comparison.');
  if (avgRepro < 70) nextActions.push(`Improve reproducibility evidence (${avgRepro}% average).`);
  if (!xaiCount) nextActions.push('Attach XAI evidence for model transparency.');
  if (artifactSummary.average < 55 && !project.githubLink && !project.paperLink) nextActions.push('Link code, notebooks, model cards, or environment files.');
  if (!literatureCount) nextActions.push('Add published baseline methods for comparison.');
  if (!nextActions.length) nextActions.push('Draft final conclusions and export the report package.');

  return {
    project,
    score,
    label,
    checks,
    missingChecks,
    nextActions: nextActions.slice(0, 3),
    stats: {
      datasetCount: projectDatasets.length,
      experimentCount: projectExperiments.length,
      completedRuns,
      avgRepro,
      artifactAverage: artifactSummary.average,
      datasetRisk: datasetRiskSummary.average,
      literatureCount,
      xaiCount,
      bestAccuracy,
      reproGrade,
    },
  };
};

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="academic-card" style={{ padding: 24 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </p>
        <p style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
          {value}
        </p>
      </div>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: color
      }}>
        <Icon size={24} strokeWidth={2} />
      </div>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', boxShadow: 'var(--shadow-md)' }}>
        <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 8, fontSize: 13 }}>{label}</p>
        {payload.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: p.color }} />
            <span style={{ color: 'var(--text-secondary)' }}>{p.name}:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.value}{p.name.includes('ccuracy') || p.name.includes('Score') ? '%' : ''}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const [data, setData] = useState({ projects: [], datasets: [], experiments: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projRes, dsRes, expRes] = await Promise.all([
          api.get('/projects'),
          api.get('/datasets'),
          api.get('/experiments')
        ]);
        setData({
          projects: projRes.data,
          datasets: dsRes.data,
          experiments: expRes.data
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const { projects, datasets, experiments } = data;

  const bestExp = experiments.reduce((prev, curr) => 
    (curr.metrics?.accuracy || 0) > (prev?.metrics?.accuracy || 0) ? curr : prev
  , null);

  const bestAccuracy = bestExp ? `${bestExp.metrics.accuracy.toFixed(1)}%` : 'N/A';
  const readinessItems = projects
    .map(project => buildProjectReadiness(project, datasets, experiments))
    .sort((a, b) => b.score - a.score);
  const topReadyProject = readinessItems[0];
  const needsAttention = readinessItems.filter(item => item.score < 70).length;
  const averageReadiness = readinessItems.length
    ? Math.round(readinessItems.reduce((sum, item) => sum + item.score, 0) / readinessItems.length)
    : 0;

  // Chart Data preparation
  const topExpData = [...experiments]
    .filter(e => e.metrics?.accuracy)
    .sort((a, b) => b.metrics.accuracy - a.metrics.accuracy)
    .slice(0, 6)
    .map(exp => ({
      name: exp.modelName,
      Accuracy: Number(exp.metrics?.accuracy?.toFixed(1) || 0)
    }));

  const reproData = experiments.map(exp => ({
    name: exp.modelName,
    Score: exp.reproducibilityScore || 0
  }));

  const recentExperiments = experiments.slice(0, 5);

  return (
    <div>
      <div className="page-header">
        <div>
        <h1 className="page-title">
          Research Dashboard
        </h1>
        <p className="page-subtitle">
          Track your research experiments and reproducibility progress.
        </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stats-grid">
        <StatCard icon={FolderOpen} label="Projects" value={projects.length.toString().padStart(2, '0')} color="var(--accent-blue)" />
        <StatCard icon={Database} label="Datasets" value={datasets.length.toString().padStart(2, '0')} color="var(--accent-cyan)" />
        <StatCard icon={FlaskConical} label="Experiments" value={experiments.length.toString().padStart(2, '0')} color="var(--accent-purple)" />
        <StatCard icon={Trophy} label="Best Acc." value={bestAccuracy} color="var(--accent-green)" />
      </div>

      <div className="publication-readiness-panel">
        <div className="publication-readiness-hero">
          <div>
            <div className="project-eyebrow">
              <Sparkles size={14} /> AI readiness engine
            </div>
            <h2>Publication Readiness</h2>
            <p>
              Scores each project using protocol completeness, datasets, bias documentation, experiments, reproducibility, XAI evidence, artifacts, and literature baselines.
            </p>
          </div>
          <div className="readiness-score-ring" style={{ '--readiness': `${averageReadiness}%`, '--readiness-color': scoreColor(averageReadiness) }}>
            <div>
              <strong>{averageReadiness}%</strong>
              <span>Average</span>
            </div>
          </div>
        </div>

        <div className="readiness-summary-grid">
          <div className="readiness-summary-card">
            <span>Top candidate</span>
            <strong>{topReadyProject?.project.title || 'No projects yet'}</strong>
            <em>{topReadyProject ? topReadyProject.label.label : 'Create a project to begin'}</em>
          </div>
          <div className="readiness-summary-card">
            <span>Needs attention</span>
            <strong>{needsAttention}</strong>
            <em>Projects below 70% readiness</em>
          </div>
          <div className="readiness-summary-card">
            <span>Report-ready bar</span>
            <strong>85%</strong>
            <em>Target for thesis or paper export</em>
          </div>
        </div>

        {readinessItems.length ? (
          <div className="readiness-project-list">
            {readinessItems.slice(0, 4).map(item => (
              <div className="readiness-project-card" key={item.project._id}>
                <div className="readiness-card-header">
                  <div>
                    <span className={`badge ${item.label.badgeClass}`}>{item.label.label}</span>
                    <h3>{item.project.title}</h3>
                    <p>{item.project.cancerType} - {item.stats.completedRuns}/{item.stats.experimentCount} completed runs - {item.stats.reproGrade.label} reproducibility</p>
                  </div>
                  <div className="readiness-mini-score" style={{ color: scoreColor(item.score) }}>
                    {item.score}%
                  </div>
                </div>

                <div className="readiness-progress">
                  <div style={{ width: `${item.score}%`, background: scoreColor(item.score) }} />
                </div>

                <div className="readiness-metrics">
                  <div><span>Datasets</span><strong>{item.stats.datasetCount}</strong></div>
                  <div><span>Best acc.</span><strong>{item.stats.bestAccuracy ? `${item.stats.bestAccuracy}%` : 'N/A'}</strong></div>
                  <div><span>Artifacts</span><strong>{item.stats.artifactAverage}%</strong></div>
                  <div><span>Risk gap</span><strong>{item.stats.datasetRisk}%</strong></div>
                </div>

                <div className="ai-action-box">
                  <div>
                    <ShieldCheck size={17} color="var(--accent-cyan)" />
                    <strong>AI next actions</strong>
                  </div>
                  <ul>
                    {item.nextActions.map(action => <li key={action}>{action}</li>)}
                  </ul>
                </div>

                <div className="readiness-card-footer">
                  <div>
                    {item.missingChecks.slice(0, 3).map(check => (
                      <span className="badge badge-gray" key={check.key}>{check.label}</span>
                    ))}
                  </div>
                  <Link to={`/projects/${item.project._id}`} className="inline-link">
                    Open workspace <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '38px 0' }}>
            <ClipboardCheck className="empty-state-icon" />
            <p>Create a project to calculate publication readiness.</p>
          </div>
        )}
      </div>

      {/* Charts row */}
      <div className="dashboard-chart-grid" style={{ marginBottom: 24 }}>
        {/* Bar chart - Accuracy */}
        <div className="academic-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: 'var(--text-primary)' }}>
            Accuracy Comparison Chart
          </h3>
          {topExpData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topExpData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-secondary)' }} />
                <Bar dataKey="Accuracy" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <p style={{ fontSize: 13 }}>No data to display.</p>
            </div>
          )}
        </div>

        {/* Bar Chart - Reproducibility */}
        <div className="academic-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: 'var(--text-primary)' }}>
            Reproducibility Score Summary
          </h3>
          {reproData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={reproData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-secondary)' }} />
                <Bar dataKey="Score" radius={[0, 4, 4, 0]} barSize={20}>
                  {reproData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.Score > 70 ? 'var(--accent-green)' : entry.Score > 40 ? 'var(--accent-orange)' : 'var(--accent-red)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <p style={{ fontSize: 13 }}>No data to display.</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Experiments Table */}
      <div className="academic-card">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Recent Experiments
          </h3>
          <Link to="/experiments" style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent-blue)', textDecoration: 'none' }}>
            View all
          </Link>
        </div>
        {recentExperiments.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 24 }}>Experiment</th>
                  <th>Model</th>
                  <th>Dataset</th>
                  <th>Accuracy</th>
                  <th>F1 Score</th>
                  <th style={{ paddingRight: 24 }}>Repro Score</th>
                </tr>
              </thead>
              <tbody>
                {recentExperiments.map(exp => (
                  <tr key={exp._id}>
                    <td style={{ paddingLeft: 24, fontWeight: 500 }}>{exp.name}</td>
                    <td>{exp.modelName}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{exp.dataset?.name || 'N/A'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{exp.metrics?.accuracy || 0}%</td>
                    <td>{exp.metrics?.f1Score || 0}%</td>
                    <td style={{ paddingRight: 24 }}>
                      <span className={`badge ${exp.reproducibilityScore > 70 ? 'badge-green' : exp.reproducibilityScore > 40 ? 'badge-orange' : 'badge-red'}`}>
                        {exp.reproducibilityScore || 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <FlaskConical className="empty-state-icon" />
            <p>No experiments logged yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
