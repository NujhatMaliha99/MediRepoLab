import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, ClipboardCheck, Clock3, FlaskConical, XCircle } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const statusConfig = {
  pending: { label: 'Pending', badgeClass: 'badge-orange', icon: Clock3 },
  approved: { label: 'Approved', badgeClass: 'badge-green', icon: CheckCircle2 },
  denied: { label: 'Denied', badgeClass: 'badge-red', icon: XCircle },
};

const formatDate = value => (
  value ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'No date'
);

const ReviewRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const fetchRequests = useCallback(async () => {
    try {
      const { data } = await api.get(`/review-requests${status ? `?status=${status}` : ''}`);
      setRequests(data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load review requests');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const decide = async (request, decision) => {
    const defaultNote = decision === 'approved'
      ? 'Approved for report and supervisor documentation.'
      : 'Denied pending additional documentation.';
    const decisionNote = window.prompt('Decision note', defaultNote);
    if (decisionNote === null) return;

    setBusyId(request._id);
    try {
      await api.patch(`/review-requests/${request._id}/decision`, { decision, decisionNote });
      toast.success(`Request ${decision}`);
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Decision failed');
    } finally {
      setBusyId('');
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Review Requests</h1>
          <p className="page-subtitle">
            {user?.role === 'admin' ? 'Approve or deny submitted experiment records.' : 'Track experiments submitted for supervisor/admin review.'}
          </p>
        </div>
      </div>

      <div className="academic-card filter-bar">
        <ClipboardCheck size={18} color="var(--text-muted)" />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Status:</span>
        <select className="input-field filter-control" value={status} onChange={event => setStatus(event.target.value)}>
          <option value="">All Requests</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="denied">Denied</option>
        </select>
      </div>

      <div className="cards-stack">
        {requests.length ? requests.map(request => {
          const config = statusConfig[request.status] || statusConfig.pending;
          const StatusIcon = config.icon;
          return (
            <div key={request._id} className="academic-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                    <span className={`badge ${config.badgeClass}`}><StatusIcon size={13} /> {config.label}</span>
                    <span className="badge badge-gray">{request.project?.title || 'Project'}</span>
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                    {request.targetType === 'project' ? request.project?.title : request.experiment?.name || 'Experiment'}
                  </h3>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>
                    {request.message || 'No request message provided.'}
                  </p>
                  {request.decisionNote && (
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Decision note: </strong>{request.decisionNote}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>Requested by {request.requester?.name || 'Researcher'}</span>
                    <span>{request.targetType === 'project' ? 'Project review' : 'Experiment review'}</span>
                    <span>{formatDate(request.createdAt)}</span>
                    {request.reviewer && <span>Reviewed by {request.reviewer.name}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {(request.experiment?._id || request.project?._id) && (
                    <Link to={request.targetType === 'project' ? `/projects/${request.project._id}` : `/experiments/${request.experiment._id}`} className="btn-secondary">
                      <FlaskConical size={16} /> Open
                    </Link>
                  )}
                  {user?.role === 'admin' && request.status === 'pending' && (
                    <>
                      <button className="btn-primary" disabled={busyId === request._id} onClick={() => decide(request, 'approved')}>
                        <CheckCircle2 size={16} /> Approve
                      </button>
                      <button className="btn-danger" disabled={busyId === request._id} onClick={() => decide(request, 'denied')}>
                        <XCircle size={16} /> Deny
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="academic-card">
            <div className="empty-state">
              <div className="empty-state-icon"><ClipboardCheck size={28} /></div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>No review requests</h3>
              <p style={{ fontSize: 14 }}>Submitted experiments will appear here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewRequests;
