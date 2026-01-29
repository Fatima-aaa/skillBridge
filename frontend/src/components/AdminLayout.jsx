import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

function AdminLayout() {
  const { admin, logout, loading } = useAdminAuth();

  if (loading) {
    return <div className="admin-loading">Loading...</div>;
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="admin-layout">
      <nav className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>SkillBridge</h2>
          <span className="admin-badge">Admin</span>
        </div>
        <ul className="admin-nav">
          <li>
            <NavLink to="/admin" end className={({ isActive }) => isActive ? 'active' : ''}>
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/users" className={({ isActive }) => isActive ? 'active' : ''}>
              Users
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/mentorships" className={({ isActive }) => isActive ? 'active' : ''}>
              Mentorships
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/audit-logs" className={({ isActive }) => isActive ? 'active' : ''}>
              Audit Logs
            </NavLink>
          </li>
        </ul>
        <div className="admin-sidebar-footer">
          <span>{admin.name}</span>
          <button className="btn btn-secondary btn-sm" onClick={logout}>
            Logout
          </button>
        </div>
      </nav>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
