import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { CheckCircle2, Clock3, FlaskConical, Plus, Pencil, Send, Trash2, X, XCircle, Filter, ChevronRight } from 'lucide-react';
import { getArtifactReadiness } from '../utils/artifacts';

const EXPERIMENT_TEMPLATES = {
  cnn_classification: {
    label: 'CNN classification',
    description: 'Baseline CNN for image classification experiments.',
    values: {
      modelName: 'Custom CNN Baseline',
      modelType: 'CNN',
      framework: 'TensorFlow',
      'hyperparameters.optimizer': 'Adam',
      'hyperparameters.learningRate': 0.001,
      'hyperparameters.batchSize': 32,
      'hyperparameters.epochs': 50,
      'hyperparameters.lossFunction': 'categorical_crossentropy',
      'hyperparameters.dropout': 0.3,
      'trainTestSplit.randomSeed': 42,
      xaiMethod: 'Grad-CAM',
      xaiNotes: 'Baseline CNN classification run. Compare against transfer learning and transformer templates.',
      limitations: 'May require more data and regularization to avoid overfitting.',
      'reproducibilityChecklist.seedFixed': true,
      'reproducibilityChecklist.hyperparamsLogged': true,
      'reproducibilityChecklist.xaiProvided': false,
    },
  },
  transfer_learning: {
    label: 'Transfer learning',
    description: 'Pretrained CNN workflow for small medical imaging datasets.',
    values: {
      modelName: 'ResNet50 Transfer Learning',
      modelType: 'CNN',
      framework: 'TensorFlow',
      'hyperparameters.optimizer': 'AdamW',
      'hyperparameters.learningRate': 0.0001,
      'hyperparameters.batchSize': 24,
      'hyperparameters.epochs': 30,
      'hyperparameters.lossFunction': 'categorical_crossentropy',
      'hyperparameters.dropout': 0.4,
      'trainTestSplit.randomSeed': 42,
      xaiMethod: 'Grad-CAM',
      xaiNotes: 'Transfer learning run with pretrained backbone and task-specific classifier head.',
      limitations: 'Pretraining domain mismatch and dataset bias should be checked.',
      'reproducibilityChecklist.seedFixed': true,
      'reproducibilityChecklist.hyperparamsLogged': true,
      'reproducibilityChecklist.xaiProvided': true,
    },
  },
  vision_transformer: {
    label: 'Vision Transformer',
    description: 'ViT-style classification experiment.',
    values: {
      modelName: 'ViT-B/16',
      modelType: 'Transformer',
      framework: 'PyTorch',
      'hyperparameters.optimizer': 'AdamW',
      'hyperparameters.learningRate': 0.00005,
      'hyperparameters.batchSize': 16,
      'hyperparameters.epochs': 40,
      'hyperparameters.lossFunction': 'cross_entropy',
      'hyperparameters.dropout': 0.1,
      'trainTestSplit.randomSeed': 42,
      xaiMethod: 'Attention Map',
      xaiNotes: 'Transformer run using patch-based attention maps for interpretability.',
      limitations: 'Needs careful augmentation and may be data-hungry without pretraining.',
      'reproducibilityChecklist.seedFixed': true,
      'reproducibilityChecklist.hyperparamsLogged': true,
      'reproducibilityChecklist.xaiProvided': true,
    },
  },
  segmentation: {
    label: 'Segmentation',
    description: 'U-Net style segmentation experiment.',
    values: {
      modelName: 'U-Net Segmentation',
      modelType: 'CNN',
      framework: 'PyTorch',
      'hyperparameters.optimizer': 'Adam',
      'hyperparameters.learningRate': 0.0002,
      'hyperparameters.batchSize': 8,
      'hyperparameters.epochs': 80,
      'hyperparameters.lossFunction': 'dice_bce_loss',
      'hyperparameters.dropout': 0.2,
      'trainTestSplit.randomSeed': 42,
      xaiMethod: 'Grad-CAM',
      xaiNotes: 'Segmentation run. Track Dice/IoU in notes if the current metric fields are insufficient.',
      limitations: 'Annotation quality and boundary ambiguity should be documented.',
      'reproducibilityChecklist.seedFixed': true,
      'reproducibilityChecklist.hyperparamsLogged': true,
      'reproducibilityChecklist.xaiProvided': false,
    },
  },
  xai_study: {
    label: 'XAI study',
    description: 'Experiment focused on explainability evidence.',
    values: {
      modelName: 'Explainability Review Run',
      modelType: 'Hybrid',
      framework: 'PyTorch',
      'hyperparameters.optimizer': 'Adam',
      'hyperparameters.learningRate': 0.0001,
      'hyperparameters.batchSize': 16,
      'hyperparameters.epochs': 20,
      'hyperparameters.lossFunction': 'cross_entropy',
      'hyperparameters.dropout': 0.2,
      'trainTestSplit.randomSeed': 42,
      xaiMethod: 'SHAP',
      xaiNotes: 'XAI-focused run. Compare heatmaps/feature attributions with clinical regions of interest.',
      limitations: 'Interpretability evidence should be reviewed by a domain expert.',
      'reproducibilityChecklist.seedFixed': true,
      'reproducibilityChecklist.hyperparamsLogged': true,
      'reproducibilityChecklist.xaiProvided': true,
    },
  },
  ablation_study: {
    label: 'Ablation study',
    description: 'Controlled run for comparing architecture or preprocessing changes.',
    values: {
      modelName: 'Ablation Variant',
      modelType: 'Other',
      framework: 'TensorFlow',
      'hyperparameters.optimizer': 'Adam',
      'hyperparameters.learningRate': 0.001,
      'hyperparameters.batchSize': 32,
      'hyperparameters.epochs': 30,
      'hyperparameters.lossFunction': 'categorical_crossentropy',
      'hyperparameters.dropout': 0.0,
      'trainTestSplit.randomSeed': 42,
      xaiMethod: 'None',
      xaiNotes: 'Ablation run. State exactly what changed from the baseline.',
      limitations: 'Keep all non-ablated variables fixed for a fair comparison.',
      'reproducibilityChecklist.seedFixed': true,
      'reproducibilityChecklist.hyperparamsLogged': true,
      'reproducibilityChecklist.resultsReproduced': false,
    },
  },
};

const reviewStatusConfig = {
  draft: { label: 'Draft', badgeClass: 'badge-gray', icon: Clock3 },
  pending: { label: 'Pending', badgeClass: 'badge-orange', icon: Clock3 },
  approved: { label: 'Approved', badgeClass: 'badge-green', icon: CheckCircle2 },
  denied: { label: 'Denied', badgeClass: 'badge-red', icon: XCircle },
};

const ExperimentModal = ({ experiment, projects, datasets, onClose, onSaved }) => {
  const { register, handleSubmit, setValue } = useForm({
    defaultValues: experiment ? {
      name: experiment.name,
      experimentTemplate: experiment.experimentTemplate,
      project: experiment.project._id || experiment.project,
      dataset: experiment.dataset?._id || experiment.dataset,
      modelName: experiment.modelName,
      modelType: experiment.modelType,
      framework: experiment.framework,
      'hyperparameters.learningRate': experiment.hyperparameters?.learningRate,
      'hyperparameters.batchSize': experiment.hyperparameters?.batchSize,
      'hyperparameters.epochs': experiment.hyperparameters?.epochs,
      'hyperparameters.optimizer': experiment.hyperparameters?.optimizer,
      'hyperparameters.lossFunction': experiment.hyperparameters?.lossFunction,
      'hyperparameters.dropout': experiment.hyperparameters?.dropout,
      'metrics.accuracy': experiment.metrics?.accuracy,
      'metrics.precision': experiment.metrics?.precision,
      'metrics.recall': experiment.metrics?.recall,
      'metrics.f1Score': experiment.metrics?.f1Score,
      'metrics.auc': experiment.metrics?.auc,
      'trainTestSplit.randomSeed': experiment.trainTestSplit?.randomSeed,
      githubLink: experiment.githubLink,
      notebookLink: experiment.notebookLink,
      modelCardLink: experiment.modelCardLink,
      environmentFileLink: experiment.environmentFileLink,
      requirementsLink: experiment.requirementsLink,
      weightsLink: experiment.weightsLink,
      protocolLink: experiment.protocolLink,
      artifactNotes: experiment.artifactNotes,
      'trainingEnvironment.gpu': experiment.trainingEnvironment?.gpu,
      xaiMethod: experiment.xaiMethod,
      reproducibilityChecklist: experiment.reproducibilityChecklist || {},
      limitations: experiment.limitations,
      xaiNotes: experiment.xaiNotes, // Re-using as findings/observations
    } : {
      modelType: 'CNN', framework: 'TensorFlow', 'hyperparameters.optimizer': 'Adam', experimentTemplate: ''
    }
  });
  
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(experiment?.experimentTemplate || '');

  const applyTemplate = (templateKey) => {
    setSelectedTemplate(templateKey);
    setValue('experimentTemplate', templateKey);
    const template = EXPERIMENT_TEMPLATES[templateKey];
    if (!template) return;
    Object.entries(template.values).forEach(([field, value]) => {
      setValue(field, value, { shouldDirty: true });
    });
    toast.success(`${template.label} template applied`);
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      if (experiment) {
        await api.put(`/experiments/${experiment._id}`, data);
        toast.success('Experiment updated');
      } else {
        await api.post('/experiments', data);
        toast.success('Experiment logged');
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error('Failed to save experiment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 860 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>{experiment ? 'Edit Experiment' : 'Log New Experiment'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <input type="hidden" {...register('experimentTemplate')} />
          <input type="hidden" {...register('reproducibilityChecklist.seedFixed')} />
          <input type="hidden" {...register('reproducibilityChecklist.hyperparamsLogged')} />
          <input type="hidden" {...register('reproducibilityChecklist.xaiProvided')} />
          <input type="hidden" {...register('reproducibilityChecklist.resultsReproduced')} />
          {/* 1. Experiment Info */}
          <div className="form-section">
            <h3 className="form-section-title">1. Experiment Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="label">Experiment Template</label>
                <select value={selectedTemplate} onChange={e => applyTemplate(e.target.value)} className="input-field">
                  <option value="">Start from a blank experiment</option>
                  {Object.entries(EXPERIMENT_TEMPLATES).map(([key, template]) => (
                    <option key={key} value={key}>{template.label}</option>
                  ))}
                </select>
                {selectedTemplate && (
                  <p className="muted-copy" style={{ fontSize: 12, marginTop: 6 }}>
                    {EXPERIMENT_TEMPLATES[selectedTemplate].description}
                  </p>
                )}
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="label">Experiment Title *</label>
                <input {...register('name', { required: true })} className="input-field" placeholder="e.g. MobileNetV3 Baseline" />
              </div>
              <div>
                <label className="label">Project *</label>
                <select {...register('project', { required: true })} className="input-field">
                  <option value="">Select Project</option>
                  {projects.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Dataset *</label>
                <select {...register('dataset', { required: true })} className="input-field">
                  <option value="">Select Dataset</option>
                  {datasets.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Model Configuration */}
          <div className="form-section">
            <h3 className="form-section-title">2. Model Configuration</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <label className="label">Model Name *</label>
                <input {...register('modelName', { required: true })} className="input-field" placeholder="e.g. MobileNetV3" />
              </div>
              <div>
                <label className="label">Architecture Type</label>
                <select {...register('modelType')} className="input-field">
                  <option value="CNN">CNN</option>
                  <option value="Transformer">Transformer</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <label className="label">Framework</label>
                <select {...register('framework')} className="input-field">
                  <option value="TensorFlow">TensorFlow</option>
                  <option value="PyTorch">PyTorch</option>
                </select>
              </div>
              <div>
                <label className="label">Optimizer</label>
                <input {...register('hyperparameters.optimizer')} className="input-field" placeholder="Adam, SGD..." />
              </div>
              <div>
                <label className="label">Learning Rate</label>
                <input {...register('hyperparameters.learningRate')} type="number" step="0.00001" className="input-field" placeholder="0.001" />
              </div>
              <div>
                <label className="label">Batch Size & Epochs</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input {...register('hyperparameters.batchSize')} type="number" className="input-field" placeholder="BS" />
                  <input {...register('hyperparameters.epochs')} type="number" className="input-field" placeholder="Ep" />
                </div>
              </div>
              <div>
                <label className="label">Loss Function</label>
                <input {...register('hyperparameters.lossFunction')} className="input-field" placeholder="cross_entropy, dice_bce_loss..." />
              </div>
              <div>
                <label className="label">Dropout</label>
                <input {...register('hyperparameters.dropout')} type="number" step="0.05" className="input-field" placeholder="0.3" />
              </div>
              <div>
                <label className="label">XAI Method</label>
                <select {...register('xaiMethod')} className="input-field">
                  <option value="None">None</option>
                  <option value="Grad-CAM">Grad-CAM</option>
                  <option value="SHAP">SHAP</option>
                  <option value="LIME">LIME</option>
                  <option value="Integrated Gradients">Integrated Gradients</option>
                  <option value="Attention Map">Attention Map</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Evaluation Metrics */}
          <div className="form-section">
            <h3 className="form-section-title">3. Evaluation Metrics (%)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              <div><label className="label">Accuracy</label><input {...register('metrics.accuracy')} type="number" step="0.1" className="input-field" /></div>
              <div><label className="label">Precision</label><input {...register('metrics.precision')} type="number" step="0.1" className="input-field" /></div>
              <div><label className="label">Recall</label><input {...register('metrics.recall')} type="number" step="0.1" className="input-field" /></div>
              <div><label className="label">F1-Score</label><input {...register('metrics.f1Score')} type="number" step="0.1" className="input-field" /></div>
              <div><label className="label">AUC</label><input {...register('metrics.auc')} type="number" step="0.01" className="input-field" /></div>
            </div>
          </div>

          {/* 4. Reproducibility */}
          <div className="form-section">
            <h3 className="form-section-title">4. Reproducibility</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="label">Random Seed</label>
                <input {...register('trainTestSplit.randomSeed')} type="number" className="input-field" placeholder="42" />
              </div>
              <div>
                <label className="label">Environment</label>
                <input {...register('trainingEnvironment.gpu')} className="input-field" placeholder="e.g. RTX 3090, Colab TPU" />
              </div>
            </div>
          </div>

          {/* 5. Research Artifacts */}
          <div className="form-section">
            <h3 className="form-section-title">5. Research Artifacts</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="label">Code Repository Link</label>
                <input {...register('githubLink')} className="input-field" placeholder="https://github.com/..." />
              </div>
              <div>
                <label className="label">Notebook Link</label>
                <input {...register('notebookLink')} className="input-field" placeholder="https://colab.research.google.com/..." />
              </div>
              <div>
                <label className="label">Model Card Link</label>
                <input {...register('modelCardLink')} className="input-field" placeholder="https://huggingface.co/.../model-card" />
              </div>
              <div>
                <label className="label">Environment File Link</label>
                <input {...register('environmentFileLink')} className="input-field" placeholder="environment.yml, Dockerfile, or release link" />
              </div>
              <div>
                <label className="label">Requirements Link</label>
                <input {...register('requirementsLink')} className="input-field" placeholder="requirements.txt or lockfile" />
              </div>
              <div>
                <label className="label">Weights / Checkpoint Link</label>
                <input {...register('weightsLink')} className="input-field" placeholder="checkpoint, weights, or model release" />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="label">Protocol / Training Plan Link</label>
                <input {...register('protocolLink')} className="input-field" placeholder="experiment protocol, preregistration, or model card notes" />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="label">Artifact Notes</label>
                <textarea {...register('artifactNotes')} className="input-field" rows={2} placeholder="Access instructions, version tags, storage caveats, or private artifact notes..." />
              </div>
            </div>
          </div>

          {/* 6. Notes & Limitations */}
          <div className="form-section" style={{ marginBottom: 0 }}>
            <h3 className="form-section-title">6. Notes & Limitations</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="label">Findings & Observations</label>
                <textarea {...register('xaiNotes')} className="input-field" rows={3} placeholder="What did you learn from this run?" />
              </div>
              <div>
                <label className="label">Known Weaknesses / Limitations</label>
                <textarea {...register('limitations')} className="input-field" rows={3} placeholder="Did it overfit? Slow training?" />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Log Experiment'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Experiments = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({ experiments: [], projects: [], datasets: [] });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);

  // Filters
  const [filterProject, setFilterProject] = useState('');
  const [filterDataset, setFilterDataset] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [sortBy, setSortBy] = useState(''); // 'accuracy'

  const fetchData = async () => {
    try {
      const [expRes, projRes, dsRes] = await Promise.all([
        api.get('/experiments'),
        api.get('/projects'),
        api.get('/datasets')
      ]);
      setData({
        experiments: expRes.data,
        projects: projRes.data,
        datasets: dsRes.data
      });
    } catch (e) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this experiment?')) return;
    try {
      await api.delete(`/experiments/${id}`);
      toast.success('Deleted');
      fetchData();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleSubmitReview = async (exp, event) => {
    event.stopPropagation();
    const message = window.prompt('Message for admin/supervisor review', `Please review ${exp.name} for report readiness.`);
    if (message === null) return;
    try {
      await api.post(`/review-requests/experiments/${exp._id}`, { message });
      toast.success('Experiment submitted for review');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit review request');
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;

  // Apply filters & sort
  let filtered = data.experiments.filter(exp => {
    if (filterProject && exp.project?._id !== filterProject) return false;
    if (filterDataset && exp.dataset?._id !== filterDataset) return false;
    if (filterModel && !exp.modelName.toLowerCase().includes(filterModel.toLowerCase())) return false;
    return true;
  });

  if (sortBy === 'accuracy') {
    filtered.sort((a, b) => (b.metrics?.accuracy || 0) - (a.metrics?.accuracy || 0));
  }

  // Unique models for filter dropdown
  const uniqueModels = [...new Set(data.experiments.map(e => e.modelName))];

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Experiments</h1>
          <p className="page-subtitle">Log model settings, metrics, and results.</p>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={() => { setEditing(null); setModal(true); }}>
            <Plus size={18} /> New Experiment
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="academic-card filter-bar">
        <Filter size={18} color="var(--text-muted)" />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Filters:</span>
        
        <select className="input-field filter-control" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="">All Projects</option>
          {data.projects.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
        </select>
        
        <select className="input-field filter-control" value={filterDataset} onChange={e => setFilterDataset(e.target.value)}>
          <option value="">All Datasets</option>
          {data.datasets.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>

        <select className="input-field filter-control" value={filterModel} onChange={e => setFilterModel(e.target.value)}>
          <option value="">All Models</option>
          {uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
          <input type="checkbox" checked={sortBy === 'accuracy'} onChange={e => setSortBy(e.target.checked ? 'accuracy' : '')} />
          Sort by Accuracy
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="academic-card">
          <div className="empty-state">
            <div className="empty-state-icon"><FlaskConical size={28} /></div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>No experiments found</h3>
            <p style={{ fontSize: 14, marginBottom: 16 }}>Adjust filters or log your first experiment.</p>
          </div>
        </div>
      ) : (
        <div className="academic-card" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 24 }}>Experiment</th>
                <th>Template</th>
                <th>Model</th>
                <th>Dataset</th>
                <th>Accuracy</th>
                <th>F1 Score</th>
                <th>Repro Score</th>
                <th>Artifacts</th>
                <th>Review</th>
                <th style={{ paddingRight: 24, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(exp => (
                <tr 
                  key={exp._id} 
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/experiments/${exp._id}`)}
                >
                  <td style={{ paddingLeft: 24, fontWeight: 600, color: 'var(--text-primary)' }}>{exp.name}</td>
                  <td>
                    {exp.experimentTemplate ? (
                      <span className="badge badge-purple">
                        {EXPERIMENT_TEMPLATES[exp.experimentTemplate]?.label || exp.experimentTemplate}
                      </span>
                    ) : (
                      <span className="badge badge-gray">Custom</span>
                    )}
                  </td>
                  <td>{exp.modelName}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{exp.dataset?.name || 'N/A'}</td>
                  <td style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{exp.metrics?.accuracy || 0}%</td>
                  <td style={{ fontWeight: 500 }}>{exp.metrics?.f1Score || 0}%</td>
                  <td>
                    <span className={`badge ${exp.reproducibilityScore > 70 ? 'badge-green' : exp.reproducibilityScore > 40 ? 'badge-orange' : 'badge-red'}`}>
                      {exp.reproducibilityScore || 0}/100
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
                    {(() => {
                      const config = reviewStatusConfig[exp.reviewStatus || 'draft'] || reviewStatusConfig.draft;
                      const StatusIcon = config.icon;
                      return (
                        <span className={`badge ${config.badgeClass}`}>
                          <StatusIcon size={13} /> {config.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ paddingRight: 24, textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }} onClick={e => e.stopPropagation()}>
                      {(!exp.reviewStatus || exp.reviewStatus === 'draft' || exp.reviewStatus === 'denied') && (
                        <button onClick={(event) => handleSubmitReview(exp, event)} className="btn-secondary" style={{ padding: '6px', minWidth: 0 }} title="Submit for review">
                          <Send size={16} />
                        </button>
                      )}
                      <button onClick={() => { setEditing(exp); setModal(true); }} className="btn-secondary" style={{ padding: '6px', minWidth: 0 }}>
                        <Pencil size={16} />
                      </button>
                      <button onClick={(e) => handleDelete(exp._id, e)} className="btn-danger" style={{ padding: '6px', minWidth: 0 }}>
                        <Trash2 size={16} />
                      </button>
                      <button onClick={() => navigate(`/experiments/${exp._id}`)} className="btn-primary" style={{ padding: '6px', minWidth: 0 }}>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <ExperimentModal
          experiment={editing}
          projects={data.projects}
          datasets={data.datasets}
          onClose={() => { setModal(false); setEditing(null); }}
          onSaved={fetchData}
        />
      )}
    </div>
  );
};

export default Experiments;
