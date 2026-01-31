import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminMentorshipsAPI } from '../../services/adminApi';

function AdminMentorships() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mentorships, setMentorships] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);

  // Modal state
  const [selectedMentorship, setSelectedMentorship] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchMentorships = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (status) params.status = status;

      const res = await adminMentorshipsAPI.getAll(params);
      setMentorships(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError('Failed to load mentorships');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMentorships();
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (page > 1) params.set('page', page);
    setSearchParams(params);
  }, [page, status]);

  const openActionModal = (mentorship, type) => {
    setSelectedMentorship(mentorship);
    setModalType(type);
    setReason('');
  };

  const openViewModal = async (mentorship) => {
    setDetailsLoading(true);
    setModalType('view');
    try {
      const res = await adminMentorshipsAPI.getDetails(mentorship._id);
      setSelectedMentorship(res.data.data);
    } catch (err) {
      setError('Failed to load mentorship details');
      setModalType(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedMentorship(null);
    setModalType(null);
    setReason('');
  };

  const handlePause = async () => {
    if (!reason.trim()) return;
    setActionLoading(true);
    try {
      await adminMentorshipsAPI.pause(selectedMentorship._id, reason);
      closeModal();
      fetchMentorships();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to pause mentorship');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!reason.trim()) return;
    setActionLoading(true);
    try {
      await adminMentorshipsAPI.complete(selectedMentorship._id, reason);
      closeModal();
      fetchMentorships();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete mentorship');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      pending: 'badge-pending',
      active: 'badge-active',
      'at-risk': 'badge-at-risk',
      paused: 'badge-paused',
      completed: 'badge-completed',
      rejected: 'badge-rejected',
    };
    return classes[status] || 'badge-pending';
  };

  if (loading && mentorships.length === 0) return <div className="admin-loading">Loading mentorships...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Mentorship Management</h1>
        <p className="page-subtitle">View and manage platform mentorships</p>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Filters */}
      <div className="admin-filters">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="at-risk">At Risk</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Mentorships Table */}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Learner</th>
            <th>Mentor</th>
            <th>Status</th>
            <th>Missed Weeks</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {mentorships.map((m) => (
            <tr key={m._id}>
              <td>
                {m.learner?.name || 'Unknown'}
                <br />
                <small className="text-muted">{m.learner?.email}</small>
                {m.learner?.status === 'suspended' && (
                  <span className="badge badge-suspended" className="ml-2">Suspended</span>
                )}
              </td>
              <td>
                {m.mentor?.name || 'Unknown'}
                <br />
                <small className="text-muted">{m.mentor?.email}</small>
                {m.mentor?.status === 'suspended' && (
                  <span className="badge badge-suspended" className="ml-2">Suspended</span>
                )}
              </td>
              <td>
                <span className={`badge ${getStatusBadgeClass(m.status)}`}>
                  {m.status}
                </span>
              </td>
              <td>{m.consecutiveMissedWeeks || 0}</td>
              <td>{new Date(m.createdAt).toLocaleDateString()}</td>
              <td className="actions">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => openViewModal(m)}
                >
                  View
                </button>
                {['active', 'at-risk'].includes(m.status) && (
                  <>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => openActionModal(m, 'pause')}
                    >
                      Pause
                    </button>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => openActionModal(m, 'complete')}
                    >
                      Complete
                    </button>
                  </>
                )}
                {m.status === 'paused' && (
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => openActionModal(m, 'complete')}
                  >
                    Complete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {mentorships.length === 0 && !loading && (
        <div className="empty-state">No mentorships found</div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          {[...Array(pagination.totalPages)].map((_, i) => (
            <button
              key={i + 1}
              className={page === i + 1 ? 'active' : ''}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button disabled={page === pagination.totalPages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}

      {/* Pause Modal */}
      {modalType === 'pause' && selectedMentorship && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Pause Mentorship</h3>
            <p>
              Pausing mentorship between <strong>{selectedMentorship.learner?.name}</strong> and{' '}
              <strong>{selectedMentorship.mentor?.name}</strong>
            </p>
            <div className="form-group">
              <label>Reason for pausing *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Enter reason (e.g., dispute resolution, investigation)..."
                required
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button
                className="btn btn-danger"
                onClick={handlePause}
                disabled={!reason.trim() || actionLoading}
              >
                {actionLoading ? 'Pausing...' : 'Pause Mentorship'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {modalType === 'complete' && selectedMentorship && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Complete Mentorship</h3>
            <p>
              Marking mentorship as completed between <strong>{selectedMentorship.learner?.name}</strong> and{' '}
              <strong>{selectedMentorship.mentor?.name}</strong>
            </p>
            <div className="form-group">
              <label>Reason for completing *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Enter reason (e.g., mutual agreement, dispute resolved)..."
                required
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button
                className="btn btn-success"
                onClick={handleComplete}
                disabled={!reason.trim() || actionLoading}
              >
                {actionLoading ? 'Completing...' : 'Complete Mentorship'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {modalType === 'view' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            {detailsLoading ? (
              <div className="admin-loading">Loading details...</div>
            ) : selectedMentorship ? (
              <>
                <h3>Mentorship Details</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div className="card">
                    <h4>Learner</h4>
                    <p><strong>{selectedMentorship.learner?.name}</strong></p>
                    <p className="text-muted">{selectedMentorship.learner?.email}</p>
                    <span className={`badge badge-${selectedMentorship.learner?.status === 'active' ? 'accepted' : 'suspended'}`}>
                      {selectedMentorship.learner?.status}
                    </span>
                  </div>
                  <div className="card">
                    <h4>Mentor</h4>
                    <p><strong>{selectedMentorship.mentor?.name}</strong></p>
                    <p className="text-muted">{selectedMentorship.mentor?.email}</p>
                    <span className={`badge badge-${selectedMentorship.mentor?.status === 'active' ? 'accepted' : 'suspended'}`}>
                      {selectedMentorship.mentor?.status}
                    </span>
                  </div>
                </div>

                <div className="card">
                  <h4>Mentorship Info</h4>
                  <p><strong>Status:</strong> <span className={`badge ${getStatusBadgeClass(selectedMentorship.mentorship?.status)}`}>{selectedMentorship.mentorship?.status}</span></p>
                  <p><strong>Missed Weeks:</strong> {selectedMentorship.mentorship?.consecutiveMissedWeeks || 0}</p>
                  <p><strong>Started:</strong> {new Date(selectedMentorship.mentorship?.createdAt).toLocaleDateString()}</p>
                  {selectedMentorship.mentorship?.completedAt && (
                    <p><strong>Completed:</strong> {new Date(selectedMentorship.mentorship.completedAt).toLocaleDateString()}</p>
                  )}
                  {selectedMentorship.mentorship?.message && (
                    <p><strong>Request Message:</strong> {selectedMentorship.mentorship.message}</p>
                  )}
                </div>

                {selectedMentorship.goals && selectedMentorship.goals.length > 0 && (
                  <div className="card" style={{ marginTop: '15px' }}>
                    <h4>Goals ({selectedMentorship.goals.length})</h4>
                    {selectedMentorship.goals.map((goal) => (
                      <div key={goal.id} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                        <strong>{goal.title}</strong>
                        <span className={`badge badge-${goal.status === 'completed' ? 'completed' : 'active'}`} style={{ marginLeft: '10px' }}>
                          {goal.status}
                        </span>
                        <p style={{ fontSize: '0.9rem', color: '#6c757d' }}>{goal.description}</p>
                        <small>Progress updates: {goal.progressUpdates?.length || 0}</small>
                      </div>
                    ))}
                  </div>
                )}

                {selectedMentorship.checkIns && selectedMentorship.checkIns.length > 0 && (
                  <div className="card" style={{ marginTop: '15px' }}>
                    <h4>Recent Check-ins ({selectedMentorship.checkIns.length})</h4>
                    {selectedMentorship.checkIns.slice(0, 3).map((checkIn) => (
                      <div key={checkIn.id} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                        <strong>Week of {new Date(checkIn.weekStartDate).toLocaleDateString()}</strong>
                        {checkIn.isLate && <span className="badge badge-at-risk" style={{ marginLeft: '10px' }}>Late</span>}
                        <p style={{ fontSize: '0.9rem' }}><strong>Completed:</strong> {checkIn.completedTasks}</p>
                        {checkIn.blockers && <p style={{ fontSize: '0.9rem', color: '#dc3545' }}><strong>Blockers:</strong> {checkIn.blockers}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {selectedMentorship.adminAuditHistory && selectedMentorship.adminAuditHistory.length > 0 && (
                  <div className="card" style={{ marginTop: '15px' }}>
                    <h4>Admin Action History</h4>
                    {selectedMentorship.adminAuditHistory.map((log, i) => (
                      <div key={i} className="audit-log-item">
                        <div className="audit-action">{log.actionType.replace(/_/g, ' ')}</div>
                        <div className="audit-details">{log.details?.reason}</div>
                        <div className="audit-time">{new Date(log.createdAt).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={closeModal}>Close</button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminMentorships;
