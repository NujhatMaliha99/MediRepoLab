import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { Search, Plus, X, Microscope, Eye, Filter } from 'lucide-react';

const XAIModal = ({ experiment, allExperiments, onClose, onSaved }) => {
  const { register, handleSubmit, watch } = useForm({
    defaultValues: experiment ? {
      experimentId: experiment._id,
      xaiMethod: experiment.xaiMethod === 'None' ? 'Grad-CAM' : experiment.xaiMethod,
      xaiEvidenceUrl: experiment.xaiEvidenceUrl,
      xaiNotes: experiment.xaiNotes,
    } : { xaiMethod: 'Grad-CAM' }
  });
  
  const [saving, setSaving] = useState(false);
  const previewUrl = watch('xaiEvidenceUrl');

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      // We are updating an existing experiment with XAI data
      const payload = {
        xaiMethod: data.xaiMethod,
        xaiEvidenceUrl: data.xaiEvidenceUrl,
        xaiNotes: data.xaiNotes
      };
      await api.put(`/experiments/${data.experimentId}`, payload);
      toast.success('XAI Evidence saved');
      onSaved();
      onClose();
    } catch (e) {
      toast.error('Failed to save XAI evidence');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>{experiment ? 'Edit XAI Evidence' : 'Add XAI Record'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label">Select Experiment *</label>
            <select {...register('experimentId', { required: true })} className="input-field" disabled={!!experiment}>
              <option value="">Choose an experiment...</option>
              {allExperiments.map(exp => <option key={exp._id} value={exp._id}>{exp.name} ({exp.modelName})</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="label">XAI Method *</label>
              <select {...register('xaiMethod', { required: true })} className="input-field">
                <option value="Grad-CAM">Grad-CAM</option>
                <option value="SHAP">SHAP</option>
                <option value="LIME">LIME</option>
                <option value="Integrated Gradients">Integrated Gradients</option>
                <option value="Attention Map">Attention Map</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Evidence Image URL</label>
              <input {...register('xaiEvidenceUrl')} className="input-field" placeholder="https://imgur.com/..." />
            </div>
          </div>

          {previewUrl && (
            <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, textAlign: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Image Preview</span>
              <img src={previewUrl} alt="Preview" style={{ maxHeight: 150, borderRadius: 4, objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
            </div>
          )}

          <div>
            <label className="label">Explanation Notes & Reviewer Comment</label>
            <textarea {...register('xaiNotes')} className="input-field" rows={4} placeholder="E.g. Model focused on the lesion region. Reviewer comment: Clinically reasonable." />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Evidence'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const XAIEvidence = () => {
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  const fetchExp = async () => {
    try {
      const { data } = await api.get('/experiments');
      setExperiments(data);
    } catch (e) {
      toast.error('Failed to load experiments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExp(); }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;

  const xaiRecords = experiments.filter(e => e.xaiMethod && e.xaiMethod !== 'None');
  const xaiMethods = [...new Set(xaiRecords.map(record => record.xaiMethod).filter(Boolean))];
  const filteredRecords = xaiRecords.filter(record => {
    const haystack = [
      record.name,
      record.modelName,
      record.xaiMethod,
      record.xaiNotes,
    ].join(' ').toLowerCase();
    return haystack.includes(searchTerm.toLowerCase()) && (!methodFilter || record.xaiMethod === methodFilter);
  });

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">XAI Evidence</h1>
          <p className="page-subtitle">Support transparent AI decision-making with explainability outputs.</p>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={() => { setEditing(null); setModal(true); }}>
            <Plus size={18} /> Add XAI Record
          </button>
        </div>
      </div>

      {xaiRecords.length > 0 && (
        <div className="academic-card filter-bar">
          <Search size={18} color="var(--text-muted)" />
          <input
            className="input-field filter-search"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search experiment, model, or notes..."
          />
          <Filter size={18} color="var(--text-muted)" />
          <select className="input-field filter-control" value={methodFilter} onChange={e => setMethodFilter(e.target.value)}>
            <option value="">All XAI methods</option>
            {xaiMethods.map(method => <option key={method} value={method}>{method}</option>)}
          </select>
          {(searchTerm || methodFilter) && (
            <button className="btn-secondary" onClick={() => { setSearchTerm(''); setMethodFilter(''); }}>
              Clear
            </button>
          )}
        </div>
      )}

      {xaiRecords.length === 0 ? (
        <div className="academic-card">
          <div className="empty-state">
            <div className="empty-state-icon"><Search size={28} /></div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>No XAI evidence found</h3>
            <p style={{ fontSize: 14, marginBottom: 16 }}>Upload heatmaps or SHAP plots to demonstrate model interpretability.</p>
            <button className="btn-primary" onClick={() => setModal(true)}>
              <Plus size={16} /> Add XAI Record
            </button>
          </div>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="academic-card">
          <div className="empty-state">
            <div className="empty-state-icon"><Search size={28} /></div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>No matching XAI records</h3>
            <p style={{ fontSize: 14, marginBottom: 16 }}>Try another model name, method, or note keyword.</p>
            <button className="btn-secondary" onClick={() => { setSearchTerm(''); setMethodFilter(''); }}>
              Reset filters
            </button>
          </div>
        </div>
      ) : (
        <div className="cards-stack">
          {filteredRecords.map(exp => (
            <div key={exp._id} className="academic-card xai-card" style={{ padding: 24 }}>
              
              {/* Left: Image Evidence */}
              <div style={{ width: 300, flexShrink: 0, background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                {exp.xaiEvidenceUrl ? (
                  <img src={exp.xaiEvidenceUrl} alt={`${exp.xaiMethod} for ${exp.name}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-muted)' }}>
                    <Eye size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                    <span style={{ fontSize: 13 }}>No image provided</span>
                  </div>
                )}
              </div>

              {/* Right: Details */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Experiment: {exp.name}</h3>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span className="badge badge-purple">{exp.xaiMethod}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Model: {exp.modelName}</span>
                    </div>
                  </div>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => { setEditing(exp); setModal(true); }}>
                    Edit Record
                  </button>
                </div>

                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginTop: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Microscope size={16} color="var(--accent-blue)" />
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Explanation Notes & Findings</span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {exp.xaiNotes || 'No notes provided for this interpretation.'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <XAIModal
          experiment={editing}
          allExperiments={experiments}
          onClose={() => { setModal(false); setEditing(null); }}
          onSaved={fetchExp}
        />
      )}
    </div>
  );
};

export default XAIEvidence;
