import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <h1>SkillBridge</h1>
        </Link>
        <div className="navbar-links">
          <Link to="/" className={isActive('/') && location.pathname === '/' ? 'active' : ''}>
            Dashboard
          </Link>
          {user?.role === 'learner' && (
            <>
              <Link to="/mentors" className={isActive('/mentors') ? 'active' : ''}>
                Find Mentors
              </Link>
              <Link to="/goals" className={isActive('/goals') ? 'active' : ''}>
                My Goals
              </Link>
            </>
          )}
          <span className="navbar-user">
            {user?.name}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={logout}>
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
