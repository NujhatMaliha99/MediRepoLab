import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { Scale, CheckCircle2, FlaskConical, Trophy } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer
} from 'recharts';

const CompareTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map(item => (
        <div key={item.dataKey}>
          <span style={{ background: item.color }} />
          {item.dataKey}: <b>{item.value}%</b>
        </div>
      ))}
    </div>
  );
};

const Compare = () => {
  const [experiments, setExperiments] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
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
    fetchExp();
  }, []);

  const handleCompare = async () => {
    if (selectedIds.length < 2 || selectedIds.length > 5) {
      toast.error('Please select between 2 and 5 experiments to compare');
      return;
    }
    setComparing(true);
    try {
      const { data } = await api.post('/experiments/compare', { ids: selectedIds });
      setComparison(data);
    } catch (e) {
      toast.error('Comparison failed');
    } finally {
      setComparing(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;

  // Prepare Bar Chart Data (Metrics grouped by Model)
  const barData = comparison?.experiments.map(exp => ({
    name: exp.name,
    Accuracy: exp.metrics?.accuracy || 0,
    Precision: exp.metrics?.precision || 0,
    Recall: exp.metrics?.recall || 0,
    'F1-score': exp.metrics?.f1Score || 0,
  })) || [];
  const bestRun = comparison?.experiments.find(exp => exp._id === comparison.best);
  const avgAccuracy = barData.length ? Math.round(barData.reduce((sum, item) => sum + item.Accuracy, 0) / barData.length) : 0;

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Compare Experiments</h1>
          <p className="page-subtitle">Select 2-5 experiments to compare performance metrics side-by-side.</p>
        </div>
      </div>

      {!comparison ? (
        <div className="academic-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Select Experiments to Compare</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selectedIds.length} / 5 selected</p>
            </div>
            <button className="btn-primary" onClick={handleCompare} disabled={selectedIds.length < 2 || selectedIds.length > 5 || comparing}>
              {comparing ? 'Analyzing...' : <><Scale size={18} /> Compare</>}
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {experiments.map(exp => {
              const isSelected = selectedIds.includes(exp._id);
              return (
                <div
                  key={exp._id}
                  onClick={() => toggleSelect(exp._id)}
                  style={{
                    padding: 16, borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
                    background: isSelected ? 'var(--bg-card)' : 'var(--bg-secondary)',
                    border: `2px solid ${isSelected ? 'var(--accent-blue)' : 'transparent'}`,
                    boxShadow: isSelected ? '0 4px 12px rgba(79, 70, 229, 0.1)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{exp.name}</div>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid', borderColor: isSelected ? 'var(--accent-blue)' : 'var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? 'var(--accent-blue)' : 'white' }}>
                      {isSelected && <CheckCircle2 size={14} color="white" />}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{exp.modelName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, display: 'flex', gap: 12, fontWeight: 500 }}>
                    <span style={{ color: 'var(--accent-green)' }}>Acc: {exp.metrics?.accuracy || 0}%</span>
                    <span>F1: {exp.metrics?.f1Score || 0}%</span>
                  </div>
                </div>
              );
            })}
            {experiments.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <FlaskConical size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                No experiments available. Log experiments first.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="page-enter">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <button className="btn-secondary" onClick={() => setComparison(null)}>
              Change Selection
            </button>
          </div>

          <div className="academic-card" style={{ padding: 24, marginBottom: 24 }}>
            <div className="modern-chart-header">
              <div>
                <span className="badge badge-cyan"><Trophy size={12} /> Model Benchmark</span>
                <h3>Performance Metrics Comparison</h3>
                <p>Grouped view of core model performance metrics with an 80% publication target line.</p>
              </div>
              <div className="chart-chip-row">
                <span className="chart-chip chip-blue">Accuracy avg {avgAccuracy}%</span>
                <span className="chart-chip chip-cyan">Selected {barData.length}</span>
                <span className="chart-chip chip-green">Best {bestRun?.name || 'N/A'}</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={390}>
              <BarChart data={barData} margin={{ top: 22, right: 24, left: -8, bottom: 8 }}>
                <defs>
                  <linearGradient id="compareAccuracy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity={0.34} />
                  </linearGradient>
                  <linearGradient id="comparePrecision" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity={0.30} />
                  </linearGradient>
                  <linearGradient id="compareRecall" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-orange)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="var(--accent-orange)" stopOpacity={0.32} />
                  </linearGradient>
                  <linearGradient id="compareF1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-purple)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="var(--accent-purple)" stopOpacity={0.32} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <ReferenceLine y={80} stroke="var(--accent-green)" strokeDasharray="5 5" strokeOpacity={0.55} label={{ value: 'target 80%', fill: 'var(--text-muted)', fontSize: 11, position: 'insideTopRight' }} />
                <Tooltip content={<CompareTooltip />} cursor={{ fill: 'rgba(79,191,208,0.04)' }} />
                <Bar dataKey="Accuracy" fill="url(#compareAccuracy)" radius={[8, 8, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Precision" fill="url(#comparePrecision)" radius={[8, 8, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Recall" fill="url(#compareRecall)" radius={[8, 8, 0, 0]} maxBarSize={32} />
                <Bar dataKey="F1-score" fill="url(#compareF1)" radius={[8, 8, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
            <div className="chart-chip-row" style={{ marginTop: 14 }}>
              <span className="chart-chip chip-blue">Accuracy</span>
              <span className="chart-chip chip-cyan">Precision</span>
              <span className="chart-chip chip-orange">Recall</span>
              <span className="chart-chip chip-purple">F1-score</span>
            </div>
          </div>

          <div className="academic-card" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 800 }}>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Accuracy</th>
                  <th>Precision</th>
                  <th>Recall</th>
                  <th>F1-score</th>
                  <th>AUC</th>
                  <th>Repro Score</th>
                </tr>
              </thead>
              <tbody>
                {comparison.experiments.map((exp, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {exp.name}
                      {exp._id === comparison.best && <span className="badge badge-green" style={{ marginLeft: 8 }}>Best</span>}
                    </td>
                    <td style={{ fontWeight: exp._id === comparison.best ? 700 : 500, color: exp._id === comparison.best ? 'var(--accent-green)' : 'inherit' }}>
                      {exp.metrics?.accuracy || 0}%
                    </td>
                    <td>{exp.metrics?.precision || 0}%</td>
                    <td>{exp.metrics?.recall || 0}%</td>
                    <td>{exp.metrics?.f1Score || 0}%</td>
                    <td>{exp.metrics?.auc || 0}</td>
                    <td>{exp.reproducibilityScore || 0}/10</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Compare;
