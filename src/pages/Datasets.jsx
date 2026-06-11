import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { AlertTriangle, Database, Plus, Pencil, Trash2, X, ExternalLink, Search, Filter } from 'lucide-react';
import { DATASET_RISK_ITEMS, getDatasetRiskGrade, getDatasetRiskScore, getDatasetRiskSuggestions } from '../utils/datasetRisk';

const DatasetModal = ({ dataset, projects, onClose, onSaved }) => {
  const { register, handleSubmit } = useForm({
    defaultValues: dataset ? {
      name: dataset.name,
      project: dataset.project._id || dataset.project,
      sourceLink: dataset.sourceLink,
      format: dataset.format,
      totalSamples: dataset.totalSamples,
      classes: dataset.classes?.join(', '),
      preprocessingSteps: dataset.preprocessingSteps?.join(', '),
      limitations: dataset.limitations,
      datasetRisk: dataset.datasetRisk || {},
      splitTrain: 70, splitVal: 15, splitTest: 15 // Mock default splits
    } : { splitTrain: 70, splitVal: 15, splitTest: 15 }
  });
  const [saving, setSaving] = useState(false);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        source: data.source || data.sourceLink || 'Custom',
        sourceUrl: data.sourceUrl || data.sourceLink || '',
        classes: data.classes ? data.classes.split(',').map(s => s.trim()) : [],
        preprocessingSteps: [
          ...(data.preprocessingSteps ? data.preprocessingSteps.split(',').map(s => s.trim()) : []),
          `Split: ${data.splitTrain}/${data.splitVal}/${data.splitTest}`
        ]
      };

      if (dataset) {
        await api.put(`/datasets/${dataset._id}`, payload);
        toast.success('Dataset updated');
      } else {
        await api.post('/datasets', payload);
        toast.success('Dataset registered');
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error('Failed to save dataset');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 760 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>{dataset ? 'Edit Dataset Registry' : 'Register New Dataset'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Section 1: Basic Info */}
          <div className="form-section">
            <h3 className="form-section-title">1. Basic Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="label">Dataset Name *</label>
                <input {...register('name', { required: true })} className="input-field" placeholder="e.g. Liver Ultrasound v1" />
              </div>
              <div>
                <label className="label">Research Project *</label>
                <select {...register('project', { required: true })} className="input-field">
                  <option value="">Select Project</option>
                  {projects.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Source Link (Kaggle, TCGA, etc.)</label>
                <input {...register('sourceLink')} className="input-field" placeholder="https://..." />
              </div>
              <div>
                <label className="label">Modality / Format</label>
                <input {...register('format')} className="input-field" placeholder="e.g. PNG, DICOM, NIfTI" />
              </div>
            </div>
          </div>

          {/* Section 2: Structure */}
          <div className="form-section">
            <h3 className="form-section-title">2. Dataset Structure & Split</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label className="label">Total Samples *</label>
                <input {...register('totalSamples', { required: true, valueAsNumber: true })} type="number" className="input-field" placeholder="e.g. 1500" />
              </div>
              <div>
                <label className="label">Class Names (Comma separated)</label>
                <input {...register('classes')} className="input-field" placeholder="Normal, Benign, Malignant" />
              </div>
            </div>
            
            <label className="label">Data Split (Train / Val / Test %)</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <input {...register('splitTrain')} type="number" className="input-field" placeholder="Train %" />
              <input {...register('splitVal')} type="number" className="input-field" placeholder="Val %" />
              <input {...register('splitTest')} type="number" className="input-field" placeholder="Test %" />
            </div>
          </div>

          {/* Section 3: Processing & Limitations */}
          <div className="form-section" style={{ marginBottom: 0 }}>
            <h3 className="form-section-title">3. Processing & Limitations</h3>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label className="label">Preprocessing & Augmentation (Comma separated)</label>
                <input {...register('preprocessingSteps')} className="input-field" placeholder="e.g. Resize to 224x224, Normalization, Random Crop" />
              </div>
              <div>
                <label className="label">Limitations & Constraints</label>
                <textarea {...register('limitations')} className="input-field" rows={3} placeholder="Describe dataset bias, class imbalance, quality issues..." />
              </div>
            </div>
          </div>

          <div className="form-section" style={{ marginBottom: 0 }}>
            <h3 className="form-section-title">4. Bias & Risk Checklist</h3>
            <div className="report-option-grid" style={{ marginBottom: 18 }}>
              {DATASET_RISK_ITEMS.map(item => (
                <label key={item.key} className="report-option" style={{ cursor: 'pointer' }}>
                  <input type="checkbox" {...register(`datasetRisk.${item.key}`)} style={{ accentColor: 'var(--accent-green)' }} />
                  {item.label}
                </label>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label className="label">Demographic Scope</label>
                <input {...register('datasetRisk.demographicScope')} className="input-field" placeholder="e.g. adults 40-75, multi-site, unknown" />
              </div>
              <div>
                <label className="label">Device / Source Details</label>
                <input {...register('datasetRisk.deviceSource')} className="input-field" placeholder="e.g. ultrasound vendor, hospital source, scanner type" />
              </div>
              <div>
                <label className="label">Missing Data Notes</label>
                <input {...register('datasetRisk.missingDataNotes')} className="input-field" placeholder="e.g. 8% missing labels, excluded corrupt scans" />
              </div>
              <div>
                <label className="label">Annotation Quality</label>
                <input {...register('datasetRisk.annotationQuality')} className="input-field" placeholder="e.g. two radiologists, consensus labels" />
              </div>
            </div>
            <div>
              <label className="label">Risk Notes</label>
              <textarea {...register('datasetRisk.riskNotes')} className="input-field" rows={3} placeholder="Summarize known class imbalance, leakage risks, source bias, or clinical limitations..." />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Dataset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Datasets = () => {
  const [datasets, setDatasets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  const fetchData = async () => {
    try {
      const [dsRes, projRes] = await Promise.all([
        api.get('/datasets'),
        api.get('/projects')
      ]);
      setDatasets(dsRes.data);
      setProjects(projRes.data);
    } catch (e) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this dataset?')) return;
    try {
      await api.delete(`/datasets/${id}`);
      toast.success('Deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;

  const filteredDatasets = datasets.filter(ds => {
    const projectId = ds.project?._id || ds.project;
    const haystack = [
      ds.name,
      ds.project?.title,
      ds.format,
      ds.limitations,
      ...(ds.classes || []),
      ...(ds.preprocessingSteps || []),
    ].join(' ').toLowerCase();
    return haystack.includes(searchTerm.toLowerCase()) && (!projectFilter || projectId === projectFilter);
  });

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Datasets</h1>
          <p className="page-subtitle">Document datasets, splits, preprocessing, and limitations.</p>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={() => { setEditing(null); setModal(true); }}>
            <Plus size={18} /> Add Dataset
          </button>
        </div>
      </div>

      {datasets.length > 0 && (
        <div className="academic-card filter-bar">
          <Search size={18} color="var(--text-muted)" />
          <input
            className="input-field filter-search"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search dataset, format, classes, preprocessing..."
          />
          <Filter size={18} color="var(--text-muted)" />
          <select className="input-field filter-control" value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
            <option value="">All projects</option>
            {projects.map(project => <option key={project._id} value={project._id}>{project.title}</option>)}
          </select>
          {(searchTerm || projectFilter) && (
            <button className="btn-secondary" onClick={() => { setSearchTerm(''); setProjectFilter(''); }}>
              Clear
            </button>
          )}
        </div>
      )}

      {datasets.length === 0 ? (
        <div className="academic-card">
          <div className="empty-state">
            <div className="empty-state-icon"><Database size={28} /></div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>No datasets registered</h3>
            <p style={{ fontSize: 14, marginBottom: 16 }}>Register your first dataset to link it to your experiments.</p>
            <button className="btn-primary" onClick={() => setModal(true)}>
              <Plus size={16} /> Add Dataset
            </button>
          </div>
        </div>
      ) : filteredDatasets.length === 0 ? (
        <div className="academic-card">
          <div className="empty-state">
            <div className="empty-state-icon"><Search size={28} /></div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>No matching datasets</h3>
            <p style={{ fontSize: 14, marginBottom: 16 }}>Clear the filters or try a broader keyword.</p>
            <button className="btn-secondary" onClick={() => { setSearchTerm(''); setProjectFilter(''); }}>
              Reset filters
            </button>
          </div>
        </div>
      ) : (
        <div className="cards-stack">
          {filteredDatasets.map(ds => (
            <div key={ds._id} className="academic-card" style={{ padding: 24 }}>
              {(() => {
                const riskScore = getDatasetRiskScore(ds);
                const riskGrade = getDatasetRiskGrade(riskScore);
                const suggestions = getDatasetRiskSuggestions(ds, 2);
                return (
                  <>
              <div className="entity-card-header">
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{ds.name}</h3>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--accent-blue)', fontWeight: 500 }}>
                      Project: {ds.project?.title || 'Unknown'}
                    </span>
                    <span className={`badge ${riskGrade.badgeClass}`}>{riskGrade.label} - {riskScore}%</span>
                  </div>
                </div>
                <div className="entity-card-actions">
                  <button onClick={() => { setEditing(ds); setModal(true); }} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }}>
                    <Pencil size={14} /> Edit
                  </button>
                  <button onClick={() => handleDelete(ds._id)} className="btn-danger">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
              {riskScore > 20 && (
                <div className="checklist-item" style={{ marginBottom: 18 }}>
                  <AlertTriangle size={16} color="var(--accent-orange)" />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{suggestions.join(' ')}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Total Samples</div>
                  <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }}>{ds.totalSamples || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Classes</div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{ds.classes?.length ? ds.classes.join(', ') : 'Unsupervised/Continuous'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Preprocessing & Splits</div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{ds.preprocessingSteps?.length ? ds.preprocessingSteps.join(', ') : 'None'}</div>
                </div>
              </div>

              {ds.limitations && (
                <div style={{ padding: '12px 16px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--accent-orange)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Limitations</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{ds.limitations}</div>
                </div>
              )}
              {ds.datasetRisk?.riskNotes && (
                <div style={{ padding: '12px 16px', background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--accent-red)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Risk Notes</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{ds.datasetRisk.riskNotes}</div>
                </div>
              )}

              {ds.sourceLink && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <a href={ds.sourceLink} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}>
                    <ExternalLink size={14} /> View Dataset Source
                  </a>
                </div>
              )}
                  </>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <DatasetModal
          dataset={editing}
          projects={projects}
          onClose={() => { setModal(false); setEditing(null); }}
          onSaved={fetchData}
        />
      )}
    </div>
  );
};

export default Datasets;
