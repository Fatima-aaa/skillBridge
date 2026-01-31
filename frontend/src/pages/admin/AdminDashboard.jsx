import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminPlatformAPI, adminAuditAPI } from '../../services/adminApi';

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, activityRes] = await Promise.all([
          adminPlatformAPI.getStats(),
          adminAuditAPI.getRecent(24),
        ]);
        setStats(statsRes.data.data);
        setRecentActivity(activityRes.data.data);
      } catch (err) {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="admin-loading">Loading dashboard...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Platform overview and recent activity</p>
      </div>

      {/* User Stats */}
      <section className="admin-section">
        <h2 className="admin-section-title">Users</h2>
        <div className="stats-grid">
          <div className="stat-card info">
            <h3>Total Users</h3>
            <div className="stat-value">{stats.users.total}</div>
          </div>
          <div className="stat-card">
            <h3>Learners</h3>
            <div className="stat-value">{stats.users.learners}</div>
          </div>
          <div className="stat-card">
            <h3>Mentors</h3>
            <div className="stat-value">{stats.users.mentors}</div>
          </div>
          <div className="stat-card success">
            <h3>Active</h3>
            <div className="stat-value">{stats.users.active}</div>
          </div>
          <div className="stat-card danger">
            <h3>Suspended</h3>
            <div className="stat-value">{stats.users.suspended}</div>
            {stats.users.suspended > 0 && (
              <Link to="/admin/users?status=suspended" className="stat-link">
                View suspended users
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Mentorship Stats */}
      <section className="admin-section">
        <h2 className="admin-section-title">Mentorships</h2>
        <div className="stats-grid">
          <div className="stat-card info">
            <h3>Total</h3>
            <div className="stat-value">{stats.mentorships.total}</div>
          </div>
          <div className="stat-card">
            <h3>Pending</h3>
            <div className="stat-value">{stats.mentorships.pending}</div>
          </div>
          <div className="stat-card success">
            <h3>Active</h3>
            <div className="stat-value">{stats.mentorships.active}</div>
          </div>
          <div className="stat-card warning">
            <h3>At Risk</h3>
            <div className="stat-value">{stats.mentorships.atRisk}</div>
            {stats.mentorships.atRisk > 0 && (
              <Link to="/admin/mentorships?status=at-risk" className="stat-link">
                View at-risk
              </Link>
            )}
          </div>
          <div className="stat-card">
            <h3>Paused</h3>
            <div className="stat-value">{stats.mentorships.paused}</div>
          </div>
          <div className="stat-card success">
            <h3>Completed</h3>
            <div className="stat-value">{stats.mentorships.completed}</div>
          </div>
        </div>
      </section>

      {/* Recent Admin Activity */}
      <section className="admin-section">
        <div className="section-card">
          <h3>Recent Activity</h3>
          {recentActivity && recentActivity.logs && recentActivity.logs.length > 0 ? (
            <>
              <p className="activity-summary">
                {recentActivity.summary.totalActions} actions in the last 24 hours
              </p>
              <div className="activity-list">
                {recentActivity.logs.slice(0, 5).map((log) => (
                  <div key={log._id} className="audit-log-item">
                    <div className="audit-action">{log.actionType.replace(/_/g, ' ')}</div>
                    <div className="audit-details">
                      Target: {log.targetType} &middot; Admin: {log.adminId?.name || 'Unknown'}
                    </div>
                    <div className="audit-time">
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              {recentActivity.logs.length > 5 && (
                <Link to="/admin/audit-logs" className="btn btn-secondary mt-4">
                  View All Logs
                </Link>
              )}
            </>
          ) : (
            <div className="empty-state">
              <p>No recent admin activity</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;
