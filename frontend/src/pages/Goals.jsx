import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { goalAPI, mentorshipAPI } from '../services/api';

function Goals() {
  const [goals, setGoals] = useState([]);
  const [hasActiveMentorship, setHasActiveMentorship] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [goalsRes, mentorshipRes] = await Promise.all([
        goalAPI.getMyGoals(),
        mentorshipAPI.getActiveMentorship(),
      ]);
      setGoals(goalsRes.data.data);
      setHasActiveMentorship(!!mentorshipRes.data.data);
    } catch (err) {
      setError('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Goals</h1>
        <p className="page-subtitle">Track and update your learning goals</p>
      </div>

      {error && <div className="error">{error}</div>}

      {!hasActiveMentorship ? (
        <div className="card">
          <div className="empty-state">
            <h3>No active mentorship</h3>
            <p>You need an active mentorship to have goals</p>
            <Link to="/mentors" className="btn btn-primary mt-4">
              Find a Mentor
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Info about goals */}
          <div className="alert alert-info">
            Your mentor sets goals for you. Focus on updating your progress regularly
            to keep your mentorship active.
          </div>

          {/* Goals List */}
          {goals.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <h3>No goals yet</h3>
                <p>Your mentor will create goals for you to work on</p>
              </div>
            </div>
          ) : (
            <div className="goals-list">
              {goals.map((goal) => (
                <div className="card goal-card" key={goal._id}>
                  <div className="card-header">
                    <div>
                      <h3 className="card-title">{goal.title}</h3>
                      <p className="card-subtitle">
                        Created {new Date(goal.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`badge badge-${goal.status}`}>
                      {getStatusLabel(goal.status)}
                    </span>
                  </div>
                  <p className="card-body">{goal.description}</p>
                  <div className="card-footer">
                    <Link to={`/goals/${goal._id}`} className="btn btn-primary">
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Goals;
