import { useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, HeartPulse, Loader2, Send, ShieldAlert } from 'lucide-react';
import api from '../api/axios';

const initialForm = {
  patientLabel: '',
  age: '',
  sex: '',
  symptoms: '',
  duration: '',
  severity: '',
  medicalHistory: '',
  medications: '',
  allergies: '',
  vitals: '',
};

const redFlagTerms = [
  'chest pain',
  'difficulty breathing',
  'shortness of breath',
  'stroke',
  'seizure',
  'fainting',
  'unconscious',
  'severe bleeding',
  'suicidal',
  'overdose',
  'worst headache',
  'severe allergic',
];

const ClinicalTriage = () => {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCaseId, setSavedCaseId] = useState('');

  const redFlagDetected = redFlagTerms.some(term => (
    `${form.symptoms} ${form.duration} ${form.severity}`.toLowerCase().includes(term)
  ));

  const updateField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const submit = async event => {
    event.preventDefault();
    setLoading(true);
    setResult('');
    setSavedCaseId('');
    try {
      const { data } = await api.post('/ai/clinical-triage', form);
      setResult(data.result);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Clinical triage failed');
    } finally {
      setLoading(false);
    }
  };

  const saveCase = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const { data } = await api.post('/clinical-cases', {
        ...form,
        patientLabel: form.patientLabel || `Clinical case - ${new Date().toLocaleDateString()}`,
        triageOutput: result,
        redFlagged: redFlagDetected,
      });
      setSavedCaseId(data._id);
      toast.success('Clinical case saved');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save clinical case');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clinical Triage AI</h1>
          <p className="page-subtitle">Educational symptom triage for possible causes, urgency, and safer next steps.</p>
        </div>
      </div>

      <div className="academic-card" style={{ padding: 18, marginBottom: 20, borderColor: redFlagDetected ? 'rgba(248, 113, 113, 0.45)' : 'var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <ShieldAlert size={20} color={redFlagDetected ? 'var(--accent-red)' : 'var(--accent-orange)'} />
          <div>
            <strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>This tool does not diagnose medical conditions.</strong>
            <p className="muted-copy" style={{ marginTop: 4, lineHeight: 1.6 }}>
              It can suggest possibilities to discuss with a licensed clinician. For severe, rapidly worsening, or life-threatening symptoms, seek emergency care now.
            </p>
          </div>
        </div>
      </div>

      {redFlagDetected && (
        <div className="academic-card" style={{ padding: 18, marginBottom: 20, borderColor: 'rgba(248, 113, 113, 0.5)', background: 'rgba(248, 113, 113, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={20} color="var(--accent-red)" />
            <strong style={{ color: 'var(--accent-red)' }}>Possible emergency red flag detected. Consider emergency care or local emergency services now.</strong>
          </div>
        </div>
      )}

      <div className="two-column-grid">
        <form className="academic-card" style={{ padding: 24 }} onSubmit={submit}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <HeartPulse size={20} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Patient Context</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="label">Case Label</label>
              <input className="input-field" value={form.patientLabel} onChange={event => updateField('patientLabel', event.target.value)} placeholder="e.g. Follow-up case, Patient A, anonymized label" />
            </div>
            <div>
              <label className="label">Age</label>
              <input className="input-field" value={form.age} onChange={event => updateField('age', event.target.value)} placeholder="e.g. 42" />
            </div>
            <div>
              <label className="label">Sex</label>
              <select className="input-field" value={form.sex} onChange={event => updateField('sex', event.target.value)}>
                <option value="">Select</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="intersex">Intersex</option>
                <option value="not specified">Prefer not to say</option>
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="label">Main Symptoms *</label>
              <textarea className="input-field" rows={4} value={form.symptoms} onChange={event => updateField('symptoms', event.target.value)} placeholder="Describe symptoms, location, triggers, and what makes them better/worse..." required />
            </div>
            <div>
              <label className="label">Duration / Onset</label>
              <input className="input-field" value={form.duration} onChange={event => updateField('duration', event.target.value)} placeholder="e.g. 3 days, sudden this morning" />
            </div>
            <div>
              <label className="label">Severity</label>
              <input className="input-field" value={form.severity} onChange={event => updateField('severity', event.target.value)} placeholder="e.g. mild, 8/10, worsening" />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="label">Medical History</label>
              <textarea className="input-field" rows={2} value={form.medicalHistory} onChange={event => updateField('medicalHistory', event.target.value)} placeholder="Known conditions, surgeries, pregnancy, immune status..." />
            </div>
            <div>
              <label className="label">Medications</label>
              <input className="input-field" value={form.medications} onChange={event => updateField('medications', event.target.value)} placeholder="Current medicines or supplements" />
            </div>
            <div>
              <label className="label">Allergies</label>
              <input className="input-field" value={form.allergies} onChange={event => updateField('allergies', event.target.value)} placeholder="Medication or food allergies" />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="label">Vitals / Measurements</label>
              <input className="input-field" value={form.vitals} onChange={event => updateField('vitals', event.target.value)} placeholder="Temperature, heart rate, blood pressure, oxygen level, glucose..." />
            </div>
          </div>

          <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 18, width: '100%', justifyContent: 'center' }}>
            {loading ? <><Loader2 size={17} className="spin" /> Assessing...</> : <><Send size={17} /> Generate Triage Guidance</>}
          </button>
        </form>

        <div className="academic-card" style={{ padding: 24, minHeight: 520 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <HeartPulse size={20} color="var(--accent-green)" />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Triage Output</h2>
          </div>
          {result ? (
            <>
              <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: 1.65, fontSize: 14 }}>
                {result}
              </div>
              <button className="btn-primary" type="button" disabled={saving || Boolean(savedCaseId)} onClick={saveCase} style={{ marginTop: 18, width: '100%', justifyContent: 'center' }}>
                {savedCaseId ? 'Case Saved' : saving ? 'Saving Case...' : 'Save as Clinical Case'}
              </button>
            </>
          ) : (
            <div className="empty-state" style={{ padding: '80px 0' }}>
              <div className="empty-state-icon"><HeartPulse size={28} /></div>
              <p style={{ fontSize: 14 }}>AI triage guidance will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClinicalTriage;
