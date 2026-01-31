import { useState, useEffect } from 'react';
import { adminAuditAPI } from '../../services/adminApi';

function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [actionType, setActionType] = useState('');
  const [targetType, setTargetType] = useState('');
  const [page, setPage] = useState(1);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 30 };
      if (actionType) params.actionType = actionType;
      if (targetType) params.targetType = targetType;

      const res = await adminAuditAPI.getLogs(params);
      setLogs(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionType, targetType]);

  const formatActionType = (action) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getActionColor = (action) => {
    if (action.includes('suspend')) return '#dc3545';
    if (action.includes('reinstate')) return '#28a745';
    if (action.includes('pause')) return '#fd7e14';
    if (action.includes('complete')) return '#28a745';
    if (action.includes('login')) return '#4a90d9';
    return '#6c757d';
  };

  if (loading && logs.length === 0) return <div className="admin-loading">Loading audit logs...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Audit Logs</h1>
        <p className="page-subtitle">View all admin actions and platform events</p>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Filters */}
      <div className="admin-filters">
        <select value={actionType} onChange={(e) => { setActionType(e.target.value); setPage(1); }}>
          <option value="">All Actions</option>
          <option value="admin_login">Admin Login</option>
          <option value="user_suspended">User Suspended</option>
          <option value="user_reinstated">User Reinstated</option>
          <option value="mentorship_paused">Mentorship Paused</option>
          <option value="mentorship_completed">Mentorship Completed</option>
        </select>
        <select value={targetType} onChange={(e) => { setTargetType(e.target.value); setPage(1); }}>
          <option value="">All Targets</option>
          <option value="user">User</option>
          <option value="mentorship">Mentorship</option>
          <option value="session">Session</option>
        </select>
      </div>

      {/* Logs List */}
      <div className="section-card">
        {logs.length > 0 ? (
          logs.map((log) => (
            <div
              key={log._id}
              className="audit-log-item"
              style={{ borderLeftColor: getActionColor(log.actionType) }}
            >
              <div className="audit-action">
                {formatActionType(log.actionType)}
              </div>
              <div className="audit-details">
                <strong>Admin:</strong> {log.adminId?.name || 'Unknown'} ({log.adminId?.email || 'N/A'})
                <br />
                <strong>Target:</strong> {log.targetType}
                {log.targetId && ` (${log.targetId})`}
                {log.reason && (
                  <>
                    <br />
                    <strong>Reason:</strong> {log.reason}
                  </>
                )}
                {log.metadata?.previousStatus && (
                  <>
                    <br />
                    <strong>Previous Status:</strong> {log.metadata.previousStatus}
                  </>
                )}
                {log.metadata?.ipAddress && (
                  <>
                    <br />
                    <strong>IP:</strong> {log.metadata.ipAddress}
                  </>
                )}
              </div>
              <div className="audit-time">
                {new Date(log.createdAt).toLocaleString()}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">No audit logs found</div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span className="pagination-info">
            Page {page} of {pagination.totalPages}
          </span>
          <button disabled={page === pagination.totalPages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default AdminAuditLogs;
