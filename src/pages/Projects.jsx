import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { Plus, Pencil, Trash2, X, FolderOpen, ExternalLink, ChevronRight, Sparkles, Brain, Bot, Send, BookOpen, Settings, Key, MessageSquare, CheckSquare, Search, Filter, FileText, Lightbulb, AlertTriangle, ClipboardCheck, BarChart2, Database, PenLine } from 'lucide-react';
import { getProjectReproSummary } from '../utils/reproducibility';

const CANCER_TYPES = [
  'Liver Cancer','Lung Cancer','Breast Cancer','Brain Cancer','Colon Cancer',
  'Skin Cancer','Prostate Cancer','Cervical Cancer','Kidney Cancer','Pancreatic Cancer','Other'
];

const protocolFields = ['objective', 'hypothesis', 'studyType', 'inclusionCriteria', 'exclusionCriteria', 'datasetPlan', 'modelPlan', 'validationPlan', 'endpoints', 'statisticalPlan', 'ethicsNotes'];

const getProtocolCompletion = protocol => {
  const filled = protocolFields.filter(field => String(protocol?.[field] || '').trim()).length;
  return Math.round((filled / protocolFields.length) * 100);
};

const COPILOT_TABS = [
  { id: 'summary', label: 'Summary', icon: FileText },
  { id: 'missingDocs', label: 'Missing Docs', icon: ClipboardCheck },
  { id: 'nextExperiment', label: 'Next Experiment', icon: Lightbulb },
  { id: 'reportConclusion', label: 'Conclusion', icon: Sparkles },
  { id: 'weakRepro', label: 'Weak Repro', icon: CheckSquare },
  { id: 'datasetRisk', label: 'Dataset Risk', icon: AlertTriangle },
  { id: 'methodology', label: 'Methodology', icon: Brain },
  { id: 'reproducibility', label: 'Reproducibility', icon: CheckSquare },
  { id: 'literature', label: 'References', icon: BookOpen },
  { id: 'chat', label: 'Q&A Chat', icon: MessageSquare },
  { id: 'settings', label: 'API Key', icon: Settings },
];

const ProjectModal = ({ project, onClose, onSaved }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: project ? {
      title: project.title, 
      description: project.description,
      cancerType: project.cancerType, 
      tags: project.tags?.join(', '), 
      githubLink: project.githubLink,
      paperLink: project.paperLink,
    } : {}
  });
  const [saving, setSaving] = useState(false);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const payload = { ...data, tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [] };
      if (project) {
        await api.put(`/projects/${project._id}`, payload);
        toast.success('Project updated successfully.');
      } else {
        await api.post('/projects', payload);
        toast.success('Research project created.');
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>{project ? 'Edit Research Project' : 'New Research Project'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label">Project Title *</label>
            <input {...register('title', { required: 'Title required' })} className="input-field" placeholder="E.g., Liver Ultrasound Segmentation" />
            {errors.title && <span style={{ color: 'var(--accent-red)', fontSize: 12 }}>{errors.title.message}</span>}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="label">Research Area (Cancer Type) *</label>
              <select {...register('cancerType', { required: true })} className="input-field">
                <option value="">Select focus area</option>
                {CANCER_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.cancerType && <span style={{ color: 'var(--accent-red)', fontSize: 12 }}>Required</span>}
            </div>
            <div>
              <label className="label">Data Modality & Tags</label>
              <input {...register('tags')} className="input-field" placeholder="Ultrasound, MRI, CT, etc." />
            </div>
          </div>

          <div>
            <label className="label">Research Objective / Description *</label>
            <textarea {...register('description', { required: 'Description required' })} className="input-field" rows={4} placeholder="What is the main objective of this research?" style={{ resize: 'vertical' }} />
            {errors.description && <span style={{ color: 'var(--accent-red)', fontSize: 12 }}>{errors.description.message}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="label">Code Repository URL</label>
              <input {...register('githubLink')} className="input-field" placeholder="https://github.com/..." />
            </div>
            <div>
              <label className="label">Paper/Preprint URL</label>
              <input {...register('paperLink')} className="input-field" placeholder="https://arxiv.org/..." />
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : project ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const renderMarkdown = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, index) => {
    if (line.startsWith('```')) return null;
    if (line.startsWith('#### ')) {
      return <h5 key={index} style={{ fontSize: 14, fontWeight: 700, margin: '12px 0 4px', color: 'var(--text-primary)' }}>{line.replace('#### ', '')}</h5>;
    }
    if (line.startsWith('### ')) {
      return <h4 key={index} style={{ fontSize: 15, fontWeight: 700, margin: '14px 0 6px', color: 'var(--text-primary)' }}>{line.replace('### ', '')}</h4>;
    }
    if (line.startsWith('## ')) {
      return <h3 key={index} style={{ fontSize: 16, fontWeight: 700, margin: '20px 0 8px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>{line.replace('## ', '')}</h3>;
    }
    if (line.startsWith('# ')) {
      return <h2 key={index} style={{ fontSize: 18, fontWeight: 800, margin: '24px 0 12px', color: 'var(--text-primary)' }}>{line.replace('# ', '')}</h2>;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const clean = line.replace(/^[-*]\s+/, '');
      const parts = clean.split('**');
      return (
        <li key={index} style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: 6, marginLeft: 16 }}>
          {parts.map((p, idx) => idx % 2 === 1 ? <strong key={idx} style={{ color: 'var(--text-primary)' }}>{p}</strong> : p)}
        </li>
      );
    }
    if (line.trim() === '') return <div key={index} style={{ height: 8 }} />;
    
    const parts = line.split('**');
    return (
      <p key={index} style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: 8 }}>
        {parts.map((p, idx) => idx % 2 === 1 ? <strong key={idx} style={{ color: 'var(--text-primary)' }}>{p}</strong> : p)}
      </p>
    );
  });
};

const AICopilotPanel = ({ project, onClose }) => {
  const [mode, setMode] = useState('summary');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [keyInput, setKeyInput] = useState(() => localStorage.getItem('user_gemini_key') || '');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('user_gemini_key') || '');

  const runAnalysis = useCallback(async (targetMode) => {
    setLoading(true);
    setResult('');
    try {
      const { data } = await api.post('/ai/analyze', {
        projectId: project._id,
        mode: targetMode,
        clientApiKey: apiKey,
      });
      setResult(data.result);
    } catch (e) {
      toast.error(e.response?.data?.message || 'AI analysis failed');
      if (e.response?.data?.code === 'MISSING_API_KEY') {
        setMode('settings');
      }
    } finally {
      setLoading(false);
    }
  }, [apiKey, project._id]);

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatInput('');
    const updatedHistory = [...chatHistory, { sender: 'user', text: userMsg }];
    setChatHistory(updatedHistory);
    setLoading(true);

    try {
      const { data } = await api.post('/ai/analyze', {
        projectId: project._id,
        mode: 'chat',
        userMessage: userMsg,
        chatHistory: updatedHistory,
        clientApiKey: apiKey,
      });
      setChatHistory(prev => [...prev, { sender: 'ai', text: data.result }]);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Chat failed');
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = () => {
    localStorage.setItem('user_gemini_key', keyInput);
    setApiKey(keyInput);
    toast.success('Gemini API Key saved locally');
    setMode('summary');
  };

  useEffect(() => {
    if (mode !== 'chat' && mode !== 'settings') {
      runAnalysis(mode);
    }
  }, [mode, apiKey, runAnalysis]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(3px)',
      zIndex: 999,
      display: 'flex',
      justifyContent: 'flex-end',
      fontFamily: 'Inter, sans-serif'
    }} onClick={onClose}>
      <div style={{
        width: 540,
        height: '100%',
        background: 'var(--bg-card)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.2)'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="var(--accent-blue)" />
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>AI Research Copilot</h2>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Analyzing: {project.title}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', padding: '0 12px', overflowX: 'auto' }}>
          {COPILOT_TABS.map(tab => {
            const Icon = tab.icon;
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '12px 14px',
                  background: 'none', border: 'none', fontSize: 12, fontWeight: 600,
                  color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  borderBottom: `2px solid ${active ? 'var(--accent-blue)' : 'transparent'}`,
                  cursor: 'pointer', outline: 'none', whiteSpace: 'nowrap'
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 28, display: 'flex', flexDirection: 'column' }}>
          {loading && mode !== 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
              <div className="spinner" />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Consulting AI models...</span>
            </div>
          )}

          {!loading && mode !== 'chat' && mode !== 'settings' && (
            <div className="markdown-body" style={{ wordBreak: 'break-word' }}>
              {renderMarkdown(result)}
            </div>
          )}

          {/* Chat Mode */}
          {mode === 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 16 }}>
                {chatHistory.length === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--text-muted)' }}>
                    <Bot size={36} strokeWidth={1.5} />
                    <p style={{ fontSize: 14, textAlign: 'center', maxWidth: 280 }}>
                      Ask your AI research assistant questions about this project's models, datasets, or experiments.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 360 }}>
                      {['Summarize missing documentation', 'Suggest the next experiment', 'Draft report conclusion'].map(prompt => (
                        <button
                          key={prompt}
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '7px 10px', fontSize: 12 }}
                          onClick={() => setChatInput(prompt)}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatHistory.map((msg, index) => (
                  <div
                    key={index}
                    style={{
                      alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      background: msg.sender === 'user' ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                      color: msg.sender === 'user' ? '#fff' : 'var(--text-primary)',
                      padding: '12px 16px',
                      borderRadius: 12,
                      borderTopRightRadius: msg.sender === 'user' ? 2 : 12,
                      borderTopLeftRadius: msg.sender === 'user' ? 12 : 2,
                      boxShadow: 'var(--shadow-sm)',
                      fontSize: 13,
                      lineHeight: 1.5
                    }}
                  >
                    {msg.sender === 'ai' ? renderMarkdown(msg.text) : msg.text}
                  </div>
                ))}
                {loading && (
                  <div style={{ alignSelf: 'flex-start', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: 12, borderTopLeftRadius: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>AI typing...</span>
                  </div>
                )}
              </div>
              <form onSubmit={handleSendChat} style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Ask a research question..."
                  className="input-field"
                  style={{ margin: 0 }}
                  disabled={loading}
                />
                <button type="submit" className="btn-primary" style={{ padding: '0 16px' }} disabled={loading || !chatInput.trim()}>
                  <Send size={16} />
                </button>
              </form>
            </div>
          )}

          {/* Settings / API Key Mode */}
          {mode === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Key size={16} color="var(--accent-blue)" /> Gemini API Key Setup
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
                  Set your custom Gemini API key to query the models. This key is stored securely in your browser's local storage and is sent only to the backend API.
                </p>
                <input
                  type="password"
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="input-field"
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveApiKey} className="btn-primary" style={{ flex: 1 }}>Save Key</button>
                {apiKey && (
                  <button
                    onClick={() => {
                      localStorage.removeItem('user_gemini_key');
                      setApiKey('');
                      setKeyInput('');
                      toast.success('Key removed');
                    }}
                    className="btn-secondary"
                  >
                    Clear Key
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [aiProject, setAiProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState('');

  const fetchProjects = async () => {
    try {
      const [projectRes, experimentRes] = await Promise.all([
        api.get('/projects'),
        api.get('/experiments'),
      ]);
      setProjects(projectRes.data);
      setExperiments(experimentRes.data);
    } catch (e) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project and all its experiments?')) return;
    try {
      await api.delete(`/projects/${id}`);
      toast.success('Project deleted');
      fetchProjects();
    } catch {
      toast.error('Delete failed');
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;

  const projectAreas = [...new Set(projects.map(p => p.cancerType).filter(Boolean))];
  const projectStats = projects.reduce((acc, project) => {
    const projectExperiments = experiments.filter(exp => (exp.project?._id || exp.project) === project._id);
    const reproSummary = getProjectReproSummary(projectExperiments);
    return {
      totalExperiments: acc.totalExperiments + projectExperiments.length,
      pendingReviews: acc.pendingReviews + (project.reviewStatus === 'pending' ? 1 : 0),
      atRiskProjects: acc.atRiskProjects + (reproSummary.atRisk > 0 ? 1 : 0),
    };
  }, { totalExperiments: 0, pendingReviews: 0, atRiskProjects: 0 });
  const filteredProjects = projects.filter(project => {
    const haystack = [
      project.title,
      project.description,
      project.cancerType,
      ...(project.tags || []),
    ].join(' ').toLowerCase();
    const matchesSearch = haystack.includes(searchTerm.toLowerCase());
    const matchesArea = !areaFilter || project.cancerType === areaFilter;
    return matchesSearch && matchesArea;
  });

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Research Projects</h1>
          <p className="page-subtitle">Track protocols, experiments, literature baselines, reproducibility, and reports in one research workspace.</p>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={() => { setEditing(null); setModal(true); }}>
            <Plus size={18} /> New Project
          </button>
        </div>
      </div>

      {projects.length > 0 && (
        <div className="project-summary-grid">
          <div className="project-summary-tile">
            <FolderOpen size={18} color="var(--accent-cyan)" />
            <div><span>Projects</span><strong>{projects.length}</strong></div>
          </div>
          <div className="project-summary-tile">
            <BarChart2 size={18} color="var(--accent-green)" />
            <div><span>Experiments</span><strong>{projectStats.totalExperiments}</strong></div>
          </div>
          <div className="project-summary-tile">
            <ClipboardCheck size={18} color="var(--accent-orange)" />
            <div><span>Pending review</span><strong>{projectStats.pendingReviews}</strong></div>
          </div>
          <div className="project-summary-tile">
            <AlertTriangle size={18} color="var(--accent-red)" />
            <div><span>Need attention</span><strong>{projectStats.atRiskProjects}</strong></div>
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <div className="academic-card filter-bar">
          <Search size={18} color="var(--text-muted)" />
          <input
            className="input-field filter-search"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search project title, objective, or tags..."
          />
          <Filter size={18} color="var(--text-muted)" />
          <select className="input-field filter-control" value={areaFilter} onChange={e => setAreaFilter(e.target.value)}>
            <option value="">All research areas</option>
            {projectAreas.map(area => <option key={area} value={area}>{area}</option>)}
          </select>
          {(searchTerm || areaFilter) && (
            <button className="btn-secondary" onClick={() => { setSearchTerm(''); setAreaFilter(''); }}>
              Clear
            </button>
          )}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="academic-card">
          <div className="empty-state">
            <div className="empty-state-icon"><FolderOpen size={28} /></div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>No projects yet</h3>
            <p style={{ fontSize: 14, marginBottom: 16 }}>Create your first research project to organize your datasets and experiments.</p>
            <button className="btn-primary" onClick={() => setModal(true)}>
              <Plus size={16} /> Create Project
            </button>
          </div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="academic-card">
          <div className="empty-state">
            <div className="empty-state-icon"><Search size={28} /></div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>No matching projects</h3>
            <p style={{ fontSize: 14, marginBottom: 16 }}>Try a different keyword or research area.</p>
            <button className="btn-secondary" onClick={() => { setSearchTerm(''); setAreaFilter(''); }}>
              Reset filters
            </button>
          </div>
        </div>
      ) : (
        <div className="project-card-grid">
          {filteredProjects.map(project => (
            <div key={project._id} className="academic-card project-card">
              {(() => {
                const projectExperiments = experiments.filter(exp => (exp.project?._id || exp.project) === project._id);
                const reproSummary = getProjectReproSummary(projectExperiments);
                const completedRuns = projectExperiments.filter(exp => exp.status === 'completed').length;
                const bestAccuracy = projectExperiments.reduce((best, exp) => Math.max(best, exp.metrics?.accuracy || 0), 0);
                const reviewClass = project.reviewStatus === 'approved' ? 'badge-green' : project.reviewStatus === 'pending' ? 'badge-orange' : project.reviewStatus === 'denied' ? 'badge-red' : 'badge-gray';
                const protocolCompletion = getProtocolCompletion(project.studyProtocol);
                const literatureCount = project.literatureBaselines?.length || 0;
                return (
                  <>
                    <div className="project-card-topline">
                      <div className="project-area-mark">
                        <span>{project.cancerType}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <span className={`badge ${reviewClass}`}>{project.reviewStatus || 'draft'}</span>
                        <span className={`badge ${protocolCompletion >= 70 ? 'badge-green' : protocolCompletion >= 40 ? 'badge-orange' : 'badge-gray'}`}>Protocol {protocolCompletion}%</span>
                      </div>
                    </div>

                    <div className="project-card-title-row">
                      <div>
                        <h3>{project.title}</h3>
                        <p>Created {new Date(project.createdAt).toLocaleDateString()}</p>
                      </div>
                      <Link to={`/projects/${project._id}`} className="project-open-button" aria-label={`Open ${project.title}`}>
                        <ChevronRight size={18} />
                      </Link>
                    </div>

                    <p className="project-objective">{project.description}</p>

                    <div className="project-tags-row">
                      {(project.tags?.length ? project.tags : ['Modality pending']).slice(0, 4).map(tag => (
                        <span key={tag} className="badge badge-gray">{tag}</span>
                      ))}
                    </div>

                    <div className="project-metric-grid">
                      <div><span>Runs</span><strong>{projectExperiments.length}</strong></div>
                      <div><span>Completed</span><strong>{completedRuns}</strong></div>
                      <div><span>Best Acc</span><strong>{bestAccuracy ? `${bestAccuracy}%` : 'N/A'}</strong></div>
                      <div><span>Literature</span><strong>{literatureCount}</strong></div>
                    </div>

                    <div className="project-progress-stack">
                      <div>
                        <div className="project-progress-label">
                          <span>Reproducibility</span>
                          <strong>{projectExperiments.length ? `${reproSummary.average}%` : 'No runs'}</strong>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${projectExperiments.length ? reproSummary.average : 0}%`, background: projectExperiments.length ? 'var(--accent-green)' : 'var(--text-muted)' }} />
                        </div>
                      </div>
                      <div>
                        <div className="project-progress-label">
                          <span>Protocol completeness</span>
                          <strong>{protocolCompletion}%</strong>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${protocolCompletion}%`, background: protocolCompletion >= 70 ? 'var(--accent-cyan)' : 'var(--accent-orange)' }} />
                        </div>
                      </div>
                    </div>

                    {reproSummary.atRisk > 0 && (
                      <div className="project-attention-note">
                        <CheckSquare size={16} color="var(--accent-orange)" />
                        <span>{reproSummary.atRisk} run{reproSummary.atRisk === 1 ? '' : 's'} need reproducibility attention.</span>
                      </div>
                    )}

                    <div className="project-card-actions">
                      <Link to={`/projects/${project._id}`} className="btn-primary">
                        <FolderOpen size={15} /> Workspace
                      </Link>
                      <button onClick={() => setAiProject(project)} className="btn-secondary">
                        <Sparkles size={15} /> AI
                      </button>
                      <Link to="/manuscript" className="btn-secondary">
                        <PenLine size={15} /> Draft
                      </Link>
                    </div>

                    <div className="project-card-footer">
                      <div className="project-resource-links">
                        {project.githubLink && (
                          <a href={project.githubLink} target="_blank" rel="noreferrer">
                            <ExternalLink size={13} /> Code
                          </a>
                        )}
                        {project.paperLink && (
                          <a href={project.paperLink} target="_blank" rel="noreferrer">
                            <FileText size={13} /> Paper
                          </a>
                        )}
                        {!project.githubLink && !project.paperLink && (
                          <span><Database size={13} /> Add research artifacts</span>
                        )}
                      </div>
                      <div className="entity-card-actions">
                        <button onClick={() => { setEditing(project); setModal(true); }} className="icon-button" aria-label={`Edit ${project.title}`}>
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleDelete(project._id)} className="icon-button danger" aria-label={`Delete ${project.title}`}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ProjectModal
          project={editing}
          onClose={() => { setModal(false); setEditing(null); }}
          onSaved={fetchProjects}
        />
      )}

      {aiProject && (
        <AICopilotPanel
          project={aiProject}
          onClose={() => setAiProject(null)}
        />
      )}
    </div>
  );
};

export default Projects;
