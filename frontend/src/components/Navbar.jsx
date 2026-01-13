import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <h1>SkillBridge</h1>
        <div className="navbar-links">
          <Link to="/">Dashboard</Link>
          {user?.role === 'learner' && (
            <>
              <Link to="/mentors">Find Mentors</Link>
              <Link to="/goals">My Goals</Link>
            </>
          )}
          <span>
            {user?.name} ({user?.role})
          </span>
          <button className="btn btn-secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
