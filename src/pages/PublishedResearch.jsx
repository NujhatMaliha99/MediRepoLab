import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  ExternalLink,
  FileText,
  FlaskConical,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import api from '../api/axios';

const formatNumber = value => {
  if (!value) return '0';
  return Intl.NumberFormat('en', { notation: value >= 10000 ? 'compact' : 'standard' }).format(value);
};

const formatMetric = value => {
  if (value === null || value === undefined) return 'N/A';
  return Number(value).toFixed(1);
};

const getOwnerLabel = owner => {
  if (!owner) return 'Research team';
  return owner.institution ? `${owner.name} · ${owner.institution}` : owner.name;
};

const PublishedResearch = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('all');

  useEffect(() => {
    const fetchPublishedProjects = async () => {
      try {
        const { data } = await api.get('/projects/published');
        setProjects(data);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load published research.');
      } finally {
        setLoading(false);
      }
    };

    fetchPublishedProjects();
  }, []);

  const researchAreas = useMemo(() => {
    const uniqueAreas = new Set(projects.map(project => project.cancerType).filter(Boolean));
    return ['all', ...Array.from(uniqueAreas).sort()];
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const searchText = query.trim().toLowerCase();
    return projects.filter(project => {
      const matchesArea = area === 'all' || project.cancerType === area;
      const searchable = [
        project.title,
        project.description,
        project.cancerType,
        project.owner?.name,
        project.owner?.institution,
        ...(project.tags || []),
      ].join(' ').toLowerCase();
      return matchesArea && (!searchText || searchable.includes(searchText));
    });
  }, [area, projects, query]);

  const totalStats = useMemo(() => projects.reduce((acc, project) => {
    acc.datasets += project.publicStats?.datasetCount || 0;
    acc.experiments += project.publicStats?.experimentCount || 0;
    acc.samples += project.publicStats?.totalSamples || 0;
    return acc;
  }, { datasets: 0, experiments: 0, samples: 0 }), [projects]);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="project-eyebrow"><ShieldCheck size={14} /> Peer-visible library</div>
          <h1 className="page-title">Published Research</h1>
          <p className="page-subtitle">Browse approved MedReproLab workspaces from other researchers and compare reproducible AI evidence across studies.</p>
        </div>
      </div>

      <div className="published-hero academic-card">
        <div>
          <span className="badge badge-green"><CheckCircle2 size={13} /> Approved only</span>
          <h2>Shared research that passed review</h2>
          <p>
            Only projects accepted by the review workflow appear here. Draft, pending, and denied workspaces remain private to their owners.
          </p>
        </div>
        <div className="published-hero-stats">
          <div>
            <strong>{projects.length}</strong>
            <span>Approved studies</span>
          </div>
          <div>
            <strong>{totalStats.experiments}</strong>
            <span>Experiments</span>
          </div>
          <div>
            <strong>{formatNumber(totalStats.samples)}</strong>
            <span>Samples logged</span>
          </div>
        </div>
      </div>

      <div className="project-toolbar academic-card">
        <div className="search-input-wrapper filter-search">
          <Search size={16} />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            className="input-field"
            placeholder="Search by title, author, cancer type, method, institution..."
          />
        </div>
        <select className="input-field filter-control" value={area} onChange={event => setArea(event.target.value)}>
          {researchAreas.map(item => (
            <option key={item} value={item}>{item === 'all' ? 'All research areas' : item}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="empty-state academic-card">Loading approved research...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="empty-state academic-card">
          <ShieldCheck size={38} />
          <h3>No approved research found</h3>
          <p>Approved projects from researchers will appear here after admin review.</p>
        </div>
      ) : (
        <div className="published-research-grid">
          {filteredProjects.map(project => (
            <article key={project._id} className="published-research-card academic-card">
              <div className="published-card-topline">
                <span className="project-area-mark"><span>{project.cancerType}</span></span>
                <span className="badge badge-green"><CheckCircle2 size={13} /> Approved</span>
              </div>

              <div>
                <h3>{project.title}</h3>
                <p className="published-author"><UserRound size={14} /> {getOwnerLabel(project.owner)}</p>
              </div>

              <p className="project-objective">{project.description}</p>

              <div className="project-tags-row">
                {(project.tags || []).slice(0, 5).map(tag => (
                  <span key={tag} className="badge badge-gray">{tag}</span>
                ))}
              </div>

              <div className="published-metrics">
                <div>
                  <Database size={15} />
                  <strong>{project.publicStats?.datasetCount || 0}</strong>
                  <span>Datasets</span>
                </div>
                <div>
                  <FlaskConical size={15} />
                  <strong>{project.publicStats?.experimentCount || 0}</strong>
                  <span>Experiments</span>
                </div>
                <div>
                  <BarChart3 size={15} />
                  <strong>{formatMetric(project.publicStats?.bestAccuracy)}</strong>
                  <span>Best acc.</span>
                </div>
              </div>

              <div className="published-links">
                {project.paperLink ? (
                  <a href={project.paperLink} target="_blank" rel="noreferrer"><FileText size={14} /> Paper <ExternalLink size={12} /></a>
                ) : <span><FileText size={14} /> No paper link</span>}
                {project.githubLink ? (
                  <a href={project.githubLink} target="_blank" rel="noreferrer">Code <ExternalLink size={12} /></a>
                ) : <span>No code link</span>}
              </div>

              <Link to={`/projects/${project._id}`} className="btn-primary published-open-button">
                View research workspace <ArrowRight size={15} />
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default PublishedResearch;
