import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { Bot, CheckCircle2, Copy, Download, FileText, Key, PenLine, Sparkles } from 'lucide-react';

const draftTypes = [
  { id: 'full', label: 'Full Manuscript' },
  { id: 'abstract', label: 'Abstract' },
  { id: 'methods', label: 'Methods' },
  { id: 'results', label: 'Results' },
  { id: 'thesis', label: 'Thesis Chapter' },
];

const renderMarkdown = text => {
  if (!text) return null;
  return text.split('\n').map((line, index) => {
    if (line.startsWith('```')) return null;
    if (line.startsWith('### ')) {
      return <h3 key={index} style={{ fontSize: 16, fontWeight: 800, margin: '20px 0 8px', color: 'var(--text-primary)' }}>{line.replace('### ', '')}</h3>;
    }
    if (line.startsWith('## ')) {
      return <h2 key={index} style={{ fontSize: 18, fontWeight: 800, margin: '24px 0 10px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>{line.replace('## ', '')}</h2>;
    }
    if (line.startsWith('# ')) {
      return <h1 key={index} style={{ fontSize: 22, fontWeight: 800, margin: '0 0 14px', color: 'var(--text-primary)' }}>{line.replace('# ', '')}</h1>;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const parts = line.replace(/^[-*]\s+/, '').split('**');
      return (
        <li key={index} style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)', marginLeft: 18, marginBottom: 6 }}>
          {parts.map((part, partIndex) => (partIndex % 2 ? <strong key={partIndex} style={{ color: 'var(--text-primary)' }}>{part}</strong> : part))}
        </li>
      );
    }
    if (!line.trim()) return <div key={index} style={{ height: 8 }} />;
    const parts = line.split('**');
    return (
      <p key={index} style={{ fontSize: 13, lineHeight: 1.75, color: 'var(--text-secondary)', marginBottom: 9 }}>
        {parts.map((part, partIndex) => (partIndex % 2 ? <strong key={partIndex} style={{ color: 'var(--text-primary)' }}>{part}</strong> : part))}
      </p>
    );
  });
};

const Manuscript = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [draftType, setDraftType] = useState('full');
  const [targetVenue, setTargetVenue] = useState('MSc thesis chapter');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [keyInput, setKeyInput] = useState(() => localStorage.getItem('user_gemini_key') || '');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('user_gemini_key') || '');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data } = await api.get('/projects');
        setProjects(data);
        if (data.length) setSelectedProjectId(data[0]._id);
      } catch {
        toast.error('Failed to load projects');
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const selectedProject = useMemo(
    () => projects.find(project => project._id === selectedProjectId),
    [projects, selectedProjectId]
  );

  const saveApiKey = () => {
    localStorage.setItem('user_gemini_key', keyInput);
    setApiKey(keyInput);
    toast.success('Gemini API key saved locally');
  };

  const generateDraft = async () => {
    if (!selectedProjectId) {
      toast.error('Select a project first');
      return;
    }
    setGenerating(true);
    setResult('');
    try {
      const { data } = await api.post('/ai/manuscript', {
        projectId: selectedProjectId,
        draftType,
        targetVenue,
        clientApiKey: apiKey,
      });
      setResult(data.result);
      toast.success('AI manuscript draft generated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate manuscript');
    } finally {
      setGenerating(false);
    }
  };

  const copyDraft = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    toast.success('Draft copied');
  };

  const downloadDraft = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedProject?.title || 'MedReproLab'}_AI_Manuscript.md`.replace(/\s+/g, '_');
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Manuscript Builder</h1>
          <p className="page-subtitle">Generate research-only thesis and manuscript drafts from project evidence.</p>
        </div>
      </div>

      <div className="two-column-grid">
        <div className="academic-card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(79, 70, 229, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PenLine size={20} color="var(--accent-blue)" />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Draft Controls</h2>
              <p className="muted-copy" style={{ marginTop: 3 }}>Uses protocol, datasets, experiments, literature, artifacts, and XAI records.</p>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label className="label">Select Project</label>
            <select className="input-field" value={selectedProjectId} onChange={event => setSelectedProjectId(event.target.value)}>
              {projects.length === 0 ? <option value="">No projects available</option> : null}
              {projects.map(project => <option key={project._id} value={project._id}>{project.title}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label className="label">Draft Type</label>
            <div className="report-option-grid">
              {draftTypes.map(type => (
                <button
                  key={type.id}
                  type="button"
                  className={`report-option ${draftType === type.id ? 'active' : ''}`}
                  onClick={() => setDraftType(type.id)}
                >
                  <CheckCircle2 size={16} />
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label className="label">Target Format</label>
            <input
              className="input-field"
              value={targetVenue}
              onChange={event => setTargetVenue(event.target.value)}
              placeholder="MSc thesis chapter, IEEE conference paper, journal manuscript..."
            />
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: 18, borderRadius: 8, marginBottom: 18 }}>
            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Key size={14} /> Gemini API Key
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="password"
                className="input-field"
                value={keyInput}
                onChange={event => setKeyInput(event.target.value)}
                placeholder="Optional if server .env has GEMINI_API_KEY"
              />
              <button type="button" className="btn-secondary" onClick={saveApiKey}>Save</button>
            </div>
            <p className="muted-copy" style={{ marginTop: 8 }}>Saved only in this browser and sent to your local backend for generation.</p>
          </div>

          <button className="btn-primary" onClick={generateDraft} disabled={generating || !selectedProjectId} style={{ width: '100%', justifyContent: 'center', padding: 14 }}>
            {generating ? 'Generating draft...' : <><Sparkles size={18} /> Generate AI Manuscript</>}
          </button>
        </div>

        <div className="academic-card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <Bot size={22} color="var(--accent-cyan)" />
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Research Writing Assistant</h2>
              <p className="muted-copy" style={{ marginTop: 3 }}>AI marks missing evidence with placeholders instead of inventing facts.</p>
            </div>
          </div>
          <div className="cards-stack">
            {[
              'Builds manuscript sections from your saved research records.',
              'Includes reproducibility, limitations, and future-work language.',
              'Highlights missing evidence before supervisor or publication review.',
            ].map(item => (
              <div key={item} className="checklist-item checked">
                <CheckCircle2 size={18} color="var(--accent-green)" />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="academic-card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
          <h2 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} color="var(--accent-cyan)" /> AI Draft Preview
          </h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-secondary" onClick={copyDraft} disabled={!result}><Copy size={16} /> Copy</button>
            <button className="btn-secondary" onClick={downloadDraft} disabled={!result}><Download size={16} /> Download .md</button>
          </div>
        </div>

        {generating ? (
          <div className="empty-state" style={{ padding: '70px 0' }}>
            <div className="spinner" />
            <p style={{ marginTop: 14 }}>Generating academic draft from project evidence...</p>
          </div>
        ) : result ? (
          <div className="markdown-body" style={{ maxWidth: 940 }}>
            {renderMarkdown(result)}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '70px 0' }}>
            <div className="empty-state-icon"><PenLine size={28} /></div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>No manuscript generated yet</h3>
            <p style={{ fontSize: 14 }}>Select a project and generate a draft to preview it here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Manuscript;
