import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { Award, ChevronRight, Filter, Search, Trophy } from 'lucide-react';
import { getReproGrade, getReproScore } from '../utils/reproducibility';

const scoreExperiment = exp => {
  const accuracy = exp.metrics?.accuracy || 0;
  const f1 = exp.metrics?.f1Score || 0;
  const auc = (exp.metrics?.auc || 0) * 100;
  const repro = exp.reproducibilityScore || 0;
  return Math.round((accuracy * 0.4) + (f1 * 0.25) + (auc * 0.15) + (repro * 0.2));
};

const sorters = {
  researchScore: (a, b) => scoreExperiment(b) - scoreExperiment(a),
  accuracy: (a, b) => (b.metrics?.accuracy || 0) - (a.metrics?.accuracy || 0),
  f1Score: (a, b) => (b.metrics?.f1Score || 0) - (a.metrics?.f1Score || 0),
  reproducibility: (a, b) => (b.reproducibilityScore || 0) - (a.reproducibilityScore || 0),
  auc: (a, b) => (b.metrics?.auc || 0) - (a.metrics?.auc || 0),
};

const Leaderboard = () => {
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [frameworkFilter, setFrameworkFilter] = useState('');
  const [sortBy, setSortBy] = useState('researchScore');

  useEffect(() => {
    const fetchExperiments = async () => {
      try {
        const { data } = await api.get('/experiments');
        setExperiments(data);
      } catch (error) {
        toast.error('Failed to load leaderboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchExperiments();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;
  }

  const projects = [...new Map(experiments.map(exp => [exp.project?._id, exp.project]).filter(([id]) => id)).values()];
  const frameworks = [...new Set(experiments.map(exp => exp.framework).filter(Boolean))];
  const ranked = experiments
    .filter(exp => {
      const haystack = [
        exp.name,
        exp.modelName,
        exp.modelType,
        exp.framework,
        exp.project?.title,
        exp.dataset?.name,
      ].join(' ').toLowerCase();
      return haystack.includes(searchTerm.toLowerCase())
        && (!projectFilter || exp.project?._id === projectFilter)
        && (!frameworkFilter || exp.framework === frameworkFilter);
    })
    .sort(sorters[sortBy]);

  const leader = ranked[0];

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Model Leaderboard</h1>
          <p className="page-subtitle">Rank model runs by performance, reproducibility, and a weighted research score.</p>
        </div>
      </div>

      {leader && (
        <div className="leader-card">
          <div>
            <span className="badge badge-green"><Trophy size={12} /> Current leader</span>
            <h2>{leader.name}</h2>
            <p>{leader.modelName} on {leader.dataset?.name || 'unassigned dataset'} - {leader.project?.title || 'No project'}</p>
            <span className={`badge ${getReproGrade(getReproScore(leader)).badgeClass}`} style={{ marginTop: 10 }}>
              Reproducibility: {getReproGrade(getReproScore(leader)).label}
            </span>
          </div>
          <div className="leader-score">
            <strong>{scoreExperiment(leader)}</strong>
            <span>research score</span>
          </div>
        </div>
      )}

      <div className="academic-card filter-bar">
        <Search size={18} color="var(--text-muted)" />
        <input
          className="input-field filter-search"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search model, experiment, project, dataset..."
        />
        <Filter size={18} color="var(--text-muted)" />
        <select className="input-field filter-control" value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
          <option value="">All projects</option>
          {projects.map(project => <option key={project._id} value={project._id}>{project.title}</option>)}
        </select>
        <select className="input-field filter-control" value={frameworkFilter} onChange={e => setFrameworkFilter(e.target.value)}>
          <option value="">All frameworks</option>
          {frameworks.map(framework => <option key={framework} value={framework}>{framework}</option>)}
        </select>
        <select className="input-field filter-control" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="researchScore">Research score</option>
          <option value="accuracy">Accuracy</option>
          <option value="f1Score">F1 score</option>
          <option value="auc">AUC</option>
          <option value="reproducibility">Reproducibility</option>
        </select>
      </div>

      {ranked.length === 0 ? (
        <div className="academic-card">
          <div className="empty-state">
            <div className="empty-state-icon"><Award size={28} /></div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>No matching experiments</h3>
            <p style={{ fontSize: 14, marginBottom: 16 }}>Adjust filters or log experiments first.</p>
          </div>
        </div>
      ) : (
        <div className="academic-card" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 24 }}>Rank</th>
                <th>Experiment</th>
                <th>Project</th>
                <th>Framework</th>
                <th>Accuracy</th>
                <th>F1</th>
                <th>AUC</th>
                <th>Repro</th>
                <th>Score</th>
                <th style={{ paddingRight: 24, textAlign: 'right' }}>Open</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((exp, index) => (
                <tr key={exp._id}>
                  <td style={{ paddingLeft: 24 }}>
                    <span className={`rank-pill ${index < 3 ? 'rank-pill-top' : ''}`}>#{index + 1}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{exp.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{exp.modelName} - {exp.modelType}</div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{exp.project?.title || 'N/A'}</td>
                  <td>{exp.framework || 'N/A'}</td>
                  <td style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{exp.metrics?.accuracy || 0}%</td>
                  <td>{exp.metrics?.f1Score || 0}%</td>
                  <td>{exp.metrics?.auc || 0}</td>
                  <td>
                    <span className={`badge ${getReproGrade(getReproScore(exp)).badgeClass}`}>
                      {getReproGrade(getReproScore(exp)).label} - {getReproScore(exp)}%
                    </span>
                  </td>
                  <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{scoreExperiment(exp)}</td>
                  <td style={{ paddingRight: 24, textAlign: 'right' }}>
                    <Link to={`/experiments/${exp._id}`} className="btn-secondary" style={{ padding: 7, minWidth: 0 }}>
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
