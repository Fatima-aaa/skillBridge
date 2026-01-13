import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { goalAPI } from '../services/api';

function MenteeGoals() {
  const { menteeId } = useParams();
  const navigate = useNavigate();

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGoals();
  }, [menteeId]);

  const fetchGoals = async () => {
    try {
      const response = await goalAPI.getMenteeGoals(menteeId);
      setGoals(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load mentee goals');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <button
        className="btn btn-secondary"
        onClick={() => navigate(-1)}
        style={{ marginBottom: '20px' }}
      >
        Back to Dashboard
      </button>

      <h2 className="page-title">Mentee Goals</h2>
      {error && <div className="error">{error}</div>}

      {goals.length === 0 ? (
        <div className="card empty-state">
          <p>This mentee hasn't created any goals yet</p>
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
                View Progress Updates
              </Link>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default MenteeGoals;
