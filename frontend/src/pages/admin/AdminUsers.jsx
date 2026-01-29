import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminUsersAPI } from '../../services/adminApi';

function AdminUsers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [role, setRole] = useState(searchParams.get('role') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);

  // Modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalType, setModalType] = useState(null); // 'suspend', 'reinstate', 'view'
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (role) params.role = role;
      if (status) params.status = status;

      const res = await adminUsersAPI.getAll(params);
      setUsers(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // Update URL params
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (role) params.set('role', role);
    if (status) params.set('status', status);
    if (page > 1) params.set('page', page);
    setSearchParams(params);
  }, [page, role, status]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const openModal = (user, type) => {
    setSelectedUser(user);
    setModalType(type);
    setReason('');
  };

  const closeModal = () => {
    setSelectedUser(null);
    setModalType(null);
    setReason('');
  };

  const handleSuspend = async () => {
    if (!reason.trim()) return;
    setActionLoading(true);
    try {
      await adminUsersAPI.suspend(selectedUser._id, reason);
      closeModal();
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to suspend user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReinstate = async () => {
    if (!reason.trim()) return;
    setActionLoading(true);
    try {
      await adminUsersAPI.reinstate(selectedUser._id, reason);
      closeModal();
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reinstate user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewActivity = async (user) => {
    try {
      const res = await adminUsersAPI.getActivity(user._id);
      setSelectedUser({ ...user, activity: res.data.data });
      setModalType('view');
    } catch (err) {
      setError('Failed to load user activity');
    }
  };

  if (loading && users.length === 0) return <div className="admin-loading">Loading users...</div>;

  return (
    <div>
      <h2 className="page-title">User Management</h2>

      {error && <div className="error">{error}</div>}

      {/* Filters */}
      <form onSubmit={handleSearch} className="admin-filters">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: '250px' }}
        />
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">All Roles</option>
          <option value="learner">Learner</option>
          <option value="mentor">Mentor</option>
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <button type="submit" className="btn btn-primary">Search</button>
      </form>

      {/* Users Table */}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user._id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>
                <span className={`badge badge-${user.role === 'mentor' ? 'active' : 'pending'}`}>
                  {user.role}
                </span>
              </td>
              <td>
                <span className={`badge badge-${user.status === 'active' ? 'accepted' : 'suspended'}`}>
                  {user.status}
                </span>
              </td>
              <td>{new Date(user.createdAt).toLocaleDateString()}</td>
              <td className="actions">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleViewActivity(user)}
                >
                  View
                </button>
                {user.status === 'active' ? (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => openModal(user, 'suspend')}
                  >
                    Suspend
                  </button>
                ) : (
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => openModal(user, 'reinstate')}
                  >
                    Reinstate
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {users.length === 0 && !loading && (
        <div className="empty-state">No users found</div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
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
          <button
            disabled={page === pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* Modals */}
      {modalType === 'suspend' && selectedUser && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Suspend User</h3>
            <p>You are about to suspend <strong>{selectedUser.name}</strong> ({selectedUser.email})</p>
            <div className="form-group">
              <label>Reason for suspension *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Enter reason for suspension..."
                required
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button
                className="btn btn-danger"
                onClick={handleSuspend}
                disabled={!reason.trim() || actionLoading}
              >
                {actionLoading ? 'Suspending...' : 'Suspend User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === 'reinstate' && selectedUser && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Reinstate User</h3>
            <p>You are about to reinstate <strong>{selectedUser.name}</strong> ({selectedUser.email})</p>
            {selectedUser.suspendedReason && (
              <p style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                <strong>Suspension reason:</strong> {selectedUser.suspendedReason}
              </p>
            )}
            <div className="form-group">
              <label>Reason for reinstatement *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Enter reason for reinstatement..."
                required
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button
                className="btn btn-success"
                onClick={handleReinstate}
                disabled={!reason.trim() || actionLoading}
              >
                {actionLoading ? 'Reinstating...' : 'Reinstate User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === 'view' && selectedUser && selectedUser.activity && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h3>User Activity: {selectedUser.name}</h3>

            <div className="user-detail-header">
              <div className="user-info">
                <p className="user-meta">{selectedUser.email} | {selectedUser.activity.user.role}</p>
                <p className="user-meta">
                  Status: <span className={`badge badge-${selectedUser.activity.user.status === 'active' ? 'accepted' : 'suspended'}`}>
                    {selectedUser.activity.user.status}
                  </span>
                </p>
                {selectedUser.activity.user.suspendedReason && (
                  <p className="user-meta" style={{ color: '#dc3545' }}>
                    Suspended: {selectedUser.activity.user.suspendedReason}
                  </p>
                )}
              </div>
            </div>

            <div className="activity-section">
              <h4>Activity Summary</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="card">
                  <strong>Mentorships:</strong> {selectedUser.activity.activity.mentorships?.total || 0}
                  <br />
                  <small>Active: {selectedUser.activity.activity.mentorships?.active || 0}</small>
                </div>
                {selectedUser.activity.activity.goals && (
                  <div className="card">
                    <strong>Goals:</strong> {selectedUser.activity.activity.goals.total}
                    <br />
                    <small>Completed: {selectedUser.activity.activity.goals.completed}</small>
                  </div>
                )}
                {selectedUser.activity.activity.checkIns && (
                  <div className="card">
                    <strong>Check-ins:</strong> {selectedUser.activity.activity.checkIns.total}
                    <br />
                    <small>Late: {selectedUser.activity.activity.checkIns.lateSubmissions}</small>
                  </div>
                )}
                {selectedUser.activity.activity.reviewsReceived && (
                  <div className="card">
                    <strong>Reviews:</strong> {selectedUser.activity.activity.reviewsReceived.total}
                    <br />
                    <small>Avg Rating: {selectedUser.activity.activity.reviewsReceived.averageRating || 'N/A'}</small>
                  </div>
                )}
              </div>
            </div>

            {selectedUser.activity.auditHistory && selectedUser.activity.auditHistory.length > 0 && (
              <div className="activity-section">
                <h4>Admin Action History</h4>
                {selectedUser.activity.auditHistory.map((log, i) => (
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
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;
