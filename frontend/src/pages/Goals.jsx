import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { goalAPI, mentorshipAPI } from '../services/api';

function Goals() {
  const [goals, setGoals] = useState([]);
  const [hasActiveMentorship, setHasActiveMentorship] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formLoading, setFormLoading] = useState(false);

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

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      await goalAPI.create({ title, description });
      setTitle('');
      setDescription('');
      setShowForm(false);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create goal');
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusToggle = async (goalId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'completed' : 'active';
    try {
      await goalAPI.updateStatus(goalId, newStatus);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update goal');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2 className="page-title">My Goals</h2>
      {error && <div className="error">{error}</div>}

      {!hasActiveMentorship ? (
        <div className="card empty-state">
          <p>You need an active mentorship to create goals</p>
          <Link to="/mentors" className="btn btn-primary" style={{ marginTop: '10px' }}>
            Find a Mentor
          </Link>
        </div>
      ) : (
        <>
          {/* Create Goal Button/Form */}
          {!showForm ? (
            <button
              className="btn btn-primary"
              onClick={() => setShowForm(true)}
              style={{ marginBottom: '20px' }}
            >
              Create New Goal
            </button>
          ) : (
            <div className="card" style={{ marginBottom: '20px' }}>
              <h3>Create New Goal</h3>
              <form onSubmit={handleCreateGoal}>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    maxLength={500}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? 'Creating...' : 'Create Goal'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginLeft: '10px' }}
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
              </form>
            </div>
          )}

          {/* Goals List */}
          {goals.length === 0 ? (
            <div className="card empty-state">
              <p>No goals yet. Create your first goal above!</p>
            </div>
          ) : (
            goals.map((goal) => (
              <div className="card" key={goal._id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <h3>{goal.title}</h3>
                    <span className={`badge badge-${goal.status}`}>{goal.status}</span>
                  </div>
                  <button
                    className={`btn ${goal.status === 'active' ? 'btn-success' : 'btn-secondary'}`}
                    onClick={() => handleStatusToggle(goal._id, goal.status)}
                  >
                    {goal.status === 'active' ? 'Mark Complete' : 'Reopen'}
                  </button>
                </div>
                <p style={{ marginTop: '10px' }}>{goal.description}</p>
                <small style={{ color: '#6c757d' }}>
                  Created: {new Date(goal.createdAt).toLocaleDateString()}
                </small>
                <div style={{ marginTop: '10px' }}>
                  <Link to={`/goals/${goal._id}`} className="btn btn-primary">
                    View Details & Progress
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
