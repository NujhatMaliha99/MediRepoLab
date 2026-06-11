import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { ArrowLeft, CheckCircle2, Circle, Clock3, ExternalLink, FileText, Lightbulb, Settings, Microscope, XCircle } from 'lucide-react';
import { REPRO_CHECKLIST_ITEMS, getReproGrade, getReproScore, getReproSuggestions } from '../utils/reproducibility';
import { getArtifactReadiness, getArtifactSuggestions, getExperimentArtifacts } from '../utils/artifacts';

const MetricCard = ({ label, value }) => (
  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px', textAlign: 'center' }}>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
  </div>
);

const reviewStatusConfig = {
  draft: { label: 'Draft', badgeClass: 'badge-gray', icon: Clock3, summary: 'This experiment has not been submitted for review.' },
  pending: { label: 'Pending Review', badgeClass: 'badge-orange', icon: Clock3, summary: 'Waiting for admin or supervisor decision.' },
  approved: { label: 'Approved', badgeClass: 'badge-green', icon: CheckCircle2, summary: 'Approved for reporting and supervisor documentation.' },
  denied: { label: 'Denied', badgeClass: 'badge-red', icon: XCircle, summary: 'Changes were requested before approval.' },
};

const DetailRow = ({ label, value }) => (
  <div style={{ display: 'flex', padding: '10px 0', borderBottom: '1px solid var(--bg-secondary)' }}>
    <span style={{ width: 140, fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}:</span>
    <span style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)' }}>{value || '—'}</span>
  </div>
);

const ExperimentDetails = () => {
  const { id } = useParams();
  const [exp, setExp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExp = async () => {
      try {
        const { data } = await api.get(`/experiments/${id}`);
        setExp(data);
      } catch (e) {
        toast.error('Failed to load experiment details');
      } finally {
        setLoading(false);
      }
    };
    fetchExp();
  }, [id]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;
  if (!exp) return <div style={{ textAlign: 'center', padding: 40 }}>Experiment not found</div>;

  const reproScore = getReproScore(exp);
  const reproGrade = getReproGrade(reproScore);
  const reproSuggestions = getReproSuggestions(exp);
  const artifacts = getExperimentArtifacts(exp);
  const artifactReadiness = getArtifactReadiness(exp);
  const artifactSuggestions = getArtifactSuggestions(exp);
  const review = reviewStatusConfig[exp.reviewStatus || 'draft'] || reviewStatusConfig.draft;
  const ReviewIcon = review.icon;

  return (
    <div className="page-enter">
      <Link to="/experiments" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14, fontWeight: 500, marginBottom: 20 }}>
        <ArrowLeft size={16} /> Back to Experiments
      </Link>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>{exp.name}</h1>
        <div style={{ display: 'flex', gap: 24, fontSize: 14 }}>
          <div><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Project:</span> <span style={{ color: 'var(--accent-blue)', fontWeight: 500 }}>{exp.project?.title || 'Unknown'}</span></div>
          <div><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Dataset:</span> <span style={{ color: 'var(--accent-cyan)', fontWeight: 500 }}>{exp.dataset?.name || 'N/A'}</span></div>
          <div><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Model:</span> <span style={{ color: 'var(--accent-purple)', fontWeight: 500 }}>{exp.modelName}</span></div>
          <span className={`badge ${reproGrade.badgeClass}`}>{reproGrade.label}</span>
          <span className={`badge ${review.badgeClass}`}><ReviewIcon size={13} /> {review.label}</span>
          <Link className="inline-link" to="/model-cards" style={{ marginLeft: 'auto' }}>
            <FileText size={14} /> Build model card
          </Link>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 32 }}>
        <MetricCard label="Accuracy" value={`${exp.metrics?.accuracy || 0}%`} />
        <MetricCard label="Precision" value={`${exp.metrics?.precision || 0}%`} />
        <MetricCard label="Recall" value={`${exp.metrics?.recall || 0}%`} />
        <MetricCard label="F1-Score" value={`${exp.metrics?.f1Score || 0}%`} />
        <MetricCard label="Repro Score" value={`${reproScore}/100`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Model Config */}
          <div className="academic-card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Settings size={18} color="var(--text-muted)" />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Model Configuration</h3>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <DetailRow label="Architecture" value={exp.modelType} />
              <DetailRow label="Framework" value={exp.framework} />
              <DetailRow label="Optimizer" value={exp.hyperparameters?.optimizer} />
              <DetailRow label="Learning Rate" value={exp.hyperparameters?.learningRate} />
              <DetailRow label="Batch Size" value={exp.hyperparameters?.batchSize} />
              <DetailRow label="Epochs" value={exp.hyperparameters?.epochs} />
              <DetailRow label="Random Seed" value={exp.trainTestSplit?.randomSeed} />
              <DetailRow label="Hardware" value={exp.trainingEnvironment?.gpu} />
            </div>
          </div>

          <div className="academic-card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ReviewIcon size={18} color={exp.reviewStatus === 'approved' ? 'var(--accent-green)' : exp.reviewStatus === 'denied' ? 'var(--accent-red)' : 'var(--accent-orange)'} />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Review Status</h3>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <span className={`badge ${review.badgeClass}`} style={{ marginBottom: 10 }}>{review.label}</span>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 10 }}>
                {review.summary}
              </p>
              {exp.reviewDecisionNote && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 10 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Decision note: </strong>{exp.reviewDecisionNote}
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="academic-card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} color="var(--text-muted)" />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Notes & Limitations</h3>
            </div>
            <div style={{ padding: '20px' }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Findings & Observations</h4>
              <p style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 20, whiteSpace: 'pre-wrap' }}>
                {exp.xaiNotes || 'No notes provided.'}
              </p>
              
              <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Limitations</h4>
              <p style={{ fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                {exp.limitations || 'No limitations specified.'}
              </p>
            </div>
          </div>

          <div className="academic-card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Research Artifacts</h3>
              </div>
              <span className={`badge ${artifactReadiness.badgeClass}`}>
                {artifactReadiness.label} - {artifactReadiness.percent}%
              </span>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div className="cards-stack">
                {artifacts.map(item => (
                  <div key={item.key} className={`checklist-item ${item.present ? 'checked' : ''}`} style={{ justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {item.present ? <CheckCircle2 size={17} color="var(--accent-green)" /> : <Circle size={17} color="var(--text-muted)" />}
                      <span style={{ fontSize: 13, color: item.present ? 'var(--text-primary)' : 'var(--text-muted)' }}>{item.label}</span>
                    </span>
                    {item.present && (
                      <a href={item.value} target="_blank" rel="noreferrer" className="inline-link" style={{ fontSize: 12 }}>
                        Open <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
              {exp.artifactNotes && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 14, whiteSpace: 'pre-wrap' }}>
                  {exp.artifactNotes}
                </p>
              )}
              <div style={{ marginTop: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Artifact To-Dos</h4>
                <div className="cards-stack">
                  {artifactSuggestions.map(suggestion => (
                    <div key={suggestion} className="checklist-item">
                      <Lightbulb size={16} color="var(--accent-orange)" />
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{suggestion}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Reproducibility Checklist */}
          <div className="academic-card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={18} color="var(--accent-green)" />
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Reproducibility Checklist</h3>
              </div>
              <span className={`badge ${reproGrade.badgeClass}`}>
                {reproGrade.label} - {reproScore}%
              </span>
            </div>
            <div style={{ padding: '12px 20px' }}>
              {REPRO_CHECKLIST_ITEMS.map((item, i) => {
                const isChecked = exp.reproducibilityChecklist?.[item.key];
                return (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < REPRO_CHECKLIST_ITEMS.length - 1 ? '1px solid var(--bg-secondary)' : 'none' }}>
                    {isChecked ? <CheckCircle2 size={18} color="var(--accent-green)" /> : <Circle size={18} color="var(--border-light)" />}
                    <span style={{ fontSize: 14, color: isChecked ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: isChecked ? 500 : 400 }}>
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="academic-card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lightbulb size={18} color="var(--accent-orange)" />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Improvement Suggestions</h3>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
                {reproGrade.summary}
              </p>
              <div className="cards-stack">
                {reproSuggestions.map(suggestion => (
                  <div key={suggestion} className="checklist-item">
                    <Lightbulb size={16} color="var(--accent-orange)" />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{suggestion}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* XAI Evidence Preview */}
          <div className="academic-card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Microscope size={18} color="var(--accent-purple)" />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>XAI Evidence</h3>
            </div>
            <div style={{ padding: '20px' }}>
              {exp.xaiMethod && exp.xaiMethod !== 'None' ? (
                <>
                  <DetailRow label="Method" value={exp.xaiMethod} />
                  {exp.xaiEvidenceUrl && (
                    <div style={{ marginTop: 16 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Heatmap Evidence</span>
                      <img src={exp.xaiEvidenceUrl} alt="XAI Heatmap" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--border)' }} />
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                  No Explainable AI evidence provided for this experiment.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExperimentDetails;
