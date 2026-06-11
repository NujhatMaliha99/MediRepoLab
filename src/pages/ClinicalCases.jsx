import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, HeartPulse, RefreshCw } from 'lucide-react';
import api from '../api/axios';

const statusLabels = {
  new: 'New',
  needs_review: 'Needs Review',
  urgent: 'Urgent',
  reviewed: 'Reviewed',
  resolved: 'Resolved',
};

const statusClass = status => (
  status === 'urgent' ? 'badge-red' : status === 'resolved' ? 'badge-green' : status === 'reviewed' ? 'badge-cyan' : status === 'needs_review' ? 'badge-orange' : 'badge-gray'
);

const appointmentBadgeClass = status => (
  status === 'scheduled' ? 'badge-green' : status === 'pending' ? 'badge-orange' : status === 'denied' ? 'badge-red' : status === 'completed' ? 'badge-cyan' : 'badge-gray'
);

const timelineColor = type => ({
  urgent: 'var(--accent-red)',
  appointment: 'var(--accent-cyan)',
  review: 'var(--accent-green)',
  patient: 'var(--accent-blue)',
  plan: 'var(--accent-purple)',
}[type] || 'var(--text-muted)');

const buildTimeline = item => {
  const events = [
    { at: item.createdAt, label: 'Case saved', detail: 'AI triage session was saved as a clinical case.', type: 'case' },
    item.redFlagged && { at: item.createdAt, label: 'Red flag detected', detail: 'Symptoms matched an emergency warning pattern.', type: 'urgent' },
    item.reviewedAt && { at: item.reviewedAt, label: 'Admin reviewed case', detail: `Status changed to ${statusLabels[item.urgencyLevel] || item.urgencyLevel}.`, type: 'review' },
    item.followUpPlan?.patientInstructions && { at: item.reviewedAt || item.updatedAt, label: 'Follow-up plan added', detail: item.followUpPlan.recommendedDepartment || item.followUpPlan.patientInstructions, type: 'plan' },
    item.patientResponse?.instructionsAcknowledgedAt && { at: item.patientResponse.instructionsAcknowledgedAt, label: 'Instructions acknowledged', detail: 'Patient acknowledged the follow-up instructions.', type: 'patient' },
    item.patientResponse?.patientNote && { at: item.updatedAt, label: 'Patient note added', detail: item.patientResponse.patientNote, type: 'patient' },
    item.appointment?.requestedAt && { at: item.appointment.requestedAt, label: 'Appointment requested', detail: 'Patient requested an appointment.', type: 'appointment' },
    item.appointment?.scheduledFor && { at: item.appointment.scheduledFor, label: 'Appointment scheduled', detail: `${item.appointment.department || 'Department pending'} ${item.appointment.doctorName ? `with ${item.appointment.doctorName}` : ''}`.trim(), type: 'appointment' },
    item.appointment?.status === 'denied' && { at: item.reviewedAt || item.updatedAt, label: 'Appointment denied', detail: item.appointment.adminNote || 'Appointment request was denied.', type: 'urgent' },
    item.appointment?.completedAt && { at: item.appointment.completedAt, label: 'Appointment completed', detail: 'Appointment marked completed by admin.', type: 'review' },
  ].filter(Boolean);

  return events.sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0));
};

const ClinicalCases = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [savingId, setSavingId] = useState('');

  const fetchCases = useCallback(async () => {
    try {
      const { data } = await api.get(`/clinical-cases${status ? `?status=${status}` : ''}`);
      setCases(data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load clinical cases');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const updatePatientResponse = async (item, payload) => {
    setSavingId(item._id);
    try {
      await api.patch(`/clinical-cases/${item._id}/patient-response`, payload);
      toast.success('Case response updated');
      fetchCases();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update case response');
    } finally {
      setSavingId('');
    }
  };

  const addPatientNote = item => {
    const patientNote = window.prompt('Add a note for the admin/doctor', item.patientResponse?.patientNote || '');
    if (patientNote === null) return;
    updatePatientResponse(item, { patientNote });
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clinical Cases</h1>
          <p className="page-subtitle">Saved triage sessions and admin review status.</p>
        </div>
        <button className="btn-secondary" onClick={fetchCases}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="academic-card filter-bar">
        <HeartPulse size={18} color="var(--text-muted)" />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Status:</span>
        <select className="input-field filter-control" value={status} onChange={event => setStatus(event.target.value)}>
          <option value="">All Cases</option>
          <option value="new">New</option>
          <option value="needs_review">Needs Review</option>
          <option value="urgent">Urgent</option>
          <option value="reviewed">Reviewed</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div className="cards-stack">
        {cases.length ? cases.map(item => (
          <div key={item._id} className="academic-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span className={`badge ${statusClass(item.urgencyLevel)}`}>{statusLabels[item.urgencyLevel] || item.urgencyLevel}</span>
                  {item.redFlagged && <span className="badge badge-red"><AlertTriangle size={13} /> Red Flag</span>}
                  {item.appointment?.status && item.appointment.status !== 'none' && (
                    <span className={`badge ${appointmentBadgeClass(item.appointment.status)}`}>Appointment: {item.appointment.status}</span>
                  )}
                </div>
                <h3 style={{ fontSize: 18, color: 'var(--text-primary)', marginBottom: 6 }}>{item.patientLabel}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>
                  {item.symptoms}
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                  <span>Age: {item.age || 'N/A'}</span>
                  <span>Sex: {item.sex || 'N/A'}</span>
                  <span>Created: {new Date(item.createdAt).toLocaleString()}</span>
                </div>
                {item.adminNotes && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Admin note: </strong>{item.adminNotes}
                  </p>
                )}
                {(item.followUpPlan?.impression || item.followUpPlan?.patientInstructions || item.followUpPlan?.recommendedDepartment) && (
                  <div style={{ marginTop: 14, padding: 14, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-secondary)' }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Follow-Up Plan</h4>
                    <div style={{ display: 'grid', gap: 8, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {item.followUpPlan?.impression && <div><strong style={{ color: 'var(--text-primary)' }}>Impression: </strong>{item.followUpPlan.impression}</div>}
                      {item.followUpPlan?.recommendedDepartment && <div><strong style={{ color: 'var(--text-primary)' }}>Department: </strong>{item.followUpPlan.recommendedDepartment}</div>}
                      {item.followUpPlan?.suggestedTests && <div><strong style={{ color: 'var(--text-primary)' }}>Tests to consider: </strong>{item.followUpPlan.suggestedTests}</div>}
                      {item.followUpPlan?.followUpDate && <div><strong style={{ color: 'var(--text-primary)' }}>Follow-up date: </strong>{new Date(item.followUpPlan.followUpDate).toLocaleDateString()}</div>}
                      <div><strong style={{ color: 'var(--text-primary)' }}>Appointment needed: </strong>{item.followUpPlan?.appointmentNeeded ? 'Yes' : 'No'}</div>
                      {item.followUpPlan?.patientInstructions && <div><strong style={{ color: 'var(--text-primary)' }}>Instructions: </strong>{item.followUpPlan.patientInstructions}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                      <button
                        className="btn-secondary"
                        disabled={savingId === item._id || Boolean(item.patientResponse?.instructionsAcknowledgedAt)}
                        onClick={() => updatePatientResponse(item, { acknowledgeInstructions: true })}
                      >
                        {item.patientResponse?.instructionsAcknowledgedAt ? 'Instructions Acknowledged' : 'Acknowledge Instructions'}
                      </button>
                      <button
                        className="btn-primary"
                        disabled={savingId === item._id || Boolean(item.patientResponse?.appointmentRequested)}
                        onClick={() => updatePatientResponse(item, { requestAppointment: true })}
                      >
                        {item.patientResponse?.appointmentRequested ? 'Appointment Requested' : 'Request Appointment'}
                      </button>
                      <button className="btn-secondary" disabled={savingId === item._id} onClick={() => addPatientNote(item)}>
                        Add Patient Note
                      </button>
                    </div>
                    {(item.patientResponse?.patientNote || item.patientResponse?.appointmentRequested || item.patientResponse?.instructionsAcknowledgedAt) && (
                      <div style={{ marginTop: 12, display: 'grid', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                        {item.patientResponse?.instructionsAcknowledgedAt && <span>Instructions acknowledged on {new Date(item.patientResponse.instructionsAcknowledgedAt).toLocaleString()}</span>}
                        {item.patientResponse?.appointmentRequested && <span>Appointment requested on {new Date(item.patientResponse.appointmentRequestedAt).toLocaleString()}</span>}
                        {item.patientResponse?.patientNote && <span>Patient note: {item.patientResponse.patientNote}</span>}
                      </div>
                    )}
                  </div>
                )}
                {item.appointment?.status && item.appointment.status !== 'none' && (
                  <div style={{ marginTop: 14, padding: 14, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-secondary)' }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Appointment</h4>
                    <div style={{ display: 'grid', gap: 8, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      <div><strong style={{ color: 'var(--text-primary)' }}>Status: </strong>{item.appointment.status}</div>
                      {item.appointment.scheduledFor && <div><strong style={{ color: 'var(--text-primary)' }}>Date/time: </strong>{new Date(item.appointment.scheduledFor).toLocaleString()}</div>}
                      {item.appointment.department && <div><strong style={{ color: 'var(--text-primary)' }}>Department: </strong>{item.appointment.department}</div>}
                      {item.appointment.doctorName && <div><strong style={{ color: 'var(--text-primary)' }}>Doctor: </strong>{item.appointment.doctorName}</div>}
                      {item.appointment.location && <div><strong style={{ color: 'var(--text-primary)' }}>Location: </strong>{item.appointment.location}</div>}
                      {item.appointment.telemedicineLink && (
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>Telemedicine: </strong>
                          <a href={item.appointment.telemedicineLink} target="_blank" rel="noreferrer" className="inline-link">{item.appointment.telemedicineLink}</a>
                        </div>
                      )}
                      {item.appointment.adminNote && <div><strong style={{ color: 'var(--text-primary)' }}>Appointment note: </strong>{item.appointment.adminNote}</div>}
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 14, padding: 14, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Patient Timeline</h4>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {buildTimeline(item).map(event => (
                      <div key={`${event.label}-${event.at}`} style={{ display: 'grid', gridTemplateColumns: '14px 1fr', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: timelineColor(event.type), marginTop: 4 }} />
                        <div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                            <strong style={{ color: 'var(--text-primary)', fontSize: 13 }}>{event.label}</strong>
                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(event.at).toLocaleString()}</span>
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5, marginTop: 3 }}>{event.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )) : (
          <div className="academic-card">
            <div className="empty-state">
              <div className="empty-state-icon"><HeartPulse size={28} /></div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>No clinical cases yet</h3>
              <p style={{ fontSize: 14 }}>Generate triage guidance and save it as a case.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicalCases;
