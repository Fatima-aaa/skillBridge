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

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2 className="page-title">My Goals</h2>
      {error && <div className="error">{error}</div>}

      {!hasActiveMentorship ? (
        <div className="card empty-state">
          <p>You need an active mentorship to have goals</p>
          <Link to="/mentors" className="btn btn-primary" style={{ marginTop: '10px' }}>
            Find a Mentor
          </Link>
        </div>
      ) : (
        <>
          {/* Info about goals */}
          <div className="card" style={{ marginBottom: '20px', backgroundColor: '#e7f3ff' }}>
            <p style={{ margin: 0, color: '#004085' }}>
              Your mentor sets goals for you. Focus on updating your progress regularly
              to keep your mentorship active.
            </p>
          </div>

          {/* Goals List */}
          {goals.length === 0 ? (
            <div className="card empty-state">
              <p>No goals yet. Your mentor will create goals for you.</p>
            </div>
          ) : (
            goals.map((goal) => (
              <div className="card" key={goal._id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <h3>{goal.title}</h3>
                    <span className={`badge badge-${goal.status}`}>{goal.status}</span>
                  </div>
                </div>
                <p style={{ marginTop: '10px' }}>{goal.description}</p>
                <small style={{ color: '#6c757d' }}>
                  Created: {new Date(goal.createdAt).toLocaleDateString()}
                </small>
                <div style={{ marginTop: '10px' }}>
                  <Link to={`/goals/${goal._id}`} className="btn btn-primary">
                    View Details & Add Progress
                  </Link>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}

export default Goals;
