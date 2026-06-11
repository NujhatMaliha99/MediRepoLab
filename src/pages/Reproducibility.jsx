import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { CheckSquare, CheckCircle2, Circle, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import { REPRO_CHECKLIST_ITEMS, getReproGrade, getReproScore, getReproSuggestions } from '../utils/reproducibility';

const Reproducibility = () => {
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpId, setSelectedExpId] = useState('');

  useEffect(() => {
    const fetchExp = async () => {
      try {
        const { data } = await api.get('/experiments');
        setExperiments(data);
        if (data.length > 0) setSelectedExpId(data[0]._id);
      } catch (e) {
        toast.error('Failed to load experiments');
      } finally {
        setLoading(false);
      }
    };
    fetchExp();
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;

  const selectedExp = experiments.find(e => e._id === selectedExpId);

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reproducibility Checklist</h1>
          <p className="page-subtitle">Track and improve the reproducibility of your AI models.</p>
        </div>
      </div>

      <div className="repro-layout">
        {/* Sidebar list of experiments */}
        <div className="academic-card" style={{ width: 320, flexShrink: 0, height: 'calc(100vh - 180px)', overflowY: 'auto' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Select Experiment</h3>
          </div>
          <div>
            {experiments.map(exp => {
              const score = getReproScore(exp);
              const grade = getReproGrade(score);
              return (
                <div 
                  key={exp._id}
                  onClick={() => setSelectedExpId(exp._id)}
                  style={{
                    padding: '16px 20px', borderBottom: '1px solid var(--bg-secondary)', cursor: 'pointer',
                    background: selectedExpId === exp._id ? 'rgba(79, 70, 229, 0.05)' : 'transparent',
                    borderLeft: `3px solid ${selectedExpId === exp._id ? 'var(--accent-blue)' : 'transparent'}`
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14, color: selectedExpId === exp._id ? 'var(--accent-blue)' : 'var(--text-primary)', marginBottom: 4 }}>
                    {exp.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{exp.modelName}</div>
                  <div style={{ marginTop: 8 }}>
                    <span className={`badge ${grade.badgeClass}`} style={{ fontSize: 11 }}>
                      {grade.label}: {score}/100
                    </span>
                  </div>
                </div>
              );
            })}
            {experiments.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                No experiments logged.
              </div>
            )}
          </div>
        </div>

        {/* Detail View */}
        {selectedExp && (() => {
          const score = getReproScore(selectedExp);
          const grade = getReproGrade(score);
          const suggestions = getReproSuggestions(selectedExp);
          return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="academic-card" style={{ padding: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{selectedExp.name}</h2>
                  <div style={{ display: 'flex', gap: 16, fontSize: 14, color: 'var(--text-muted)' }}>
                    <span>Model: {selectedExp.modelName}</span>
                    <span>Dataset: {selectedExp.dataset?.name || 'Unknown'}</span>
                  </div>
                </div>
                <Link to={`/experiments/${selectedExp._id}`} className="btn-secondary">
                  View Full Experiment
                </Link>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: 32, background: 'var(--bg-secondary)', padding: 24, borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Overall Reproducibility</span>
                  <span className={`badge ${grade.badgeClass}`}>
                    {grade.label} - {score}%
                  </span>
                </div>
                <div className="progress-bar" style={{ height: 10 }}>
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${score}%`,
                      background: grade.color
                    }} 
                  />
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12 }}>
                  {grade.summary}
                </p>
              </div>

              {/* Checklist */}
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckSquare size={18} color="var(--accent-blue)" /> Detailed Checklist
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {REPRO_CHECKLIST_ITEMS.map((item) => {
                    const isChecked = selectedExp.reproducibilityChecklist?.[item.key];
                    return (
                      <div key={item.key} className={`checklist-item ${isChecked ? 'checked' : ''}`} style={{ padding: '16px 20px' }}>
                        {isChecked ? <CheckCircle2 size={20} color="var(--accent-green)" /> : <Circle size={20} color="var(--border-light)" />}
                        <span style={{ fontSize: 14, color: isChecked ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: isChecked ? 500 : 400 }}>
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="academic-card" style={{ padding: 24, background: 'var(--bg-secondary)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Lightbulb size={16} color="var(--accent-orange)" /> How to improve this grade
              </h4>
              <div className="cards-stack">
                {suggestions.map(suggestion => (
                  <div key={suggestion} className="checklist-item">
                    <Lightbulb size={16} color="var(--accent-orange)" />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{suggestion}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          );
        })()}
      </div>
    </div>
  );
};

export default Reproducibility;
