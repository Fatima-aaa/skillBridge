import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { goalAPI } from '../services/api';

function MenteeGoals() {
  const { menteeId } = useParams();
  const navigate = useNavigate();

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formLoading, setFormLoading] = useState(false);

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

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      await goalAPI.createForMentee({ menteeId, title, description });
      setTitle('');
      setDescription('');
      setShowForm(false);
      await fetchGoals();
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
      await fetchGoals();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update goal');
    }
  };

  const getStatusLabel = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <button className="btn btn-secondary btn-sm mb-6" onClick={() => navigate(-1)}>
        Back to Dashboard
      </button>

      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">Mentee Goals</h1>
          <p className="page-subtitle">Create and track learning goals for your mentee</p>
        </div>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            Create Goal
          </button>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {/* Create Goal Form */}
      {showForm && (
        <div className="section-card mb-6">
          <h3>Create New Goal</h3>
          <form onSubmit={handleCreateGoal}>
            <div className="form-group">
              <label>Goal Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                required
                placeholder="e.g., Complete React fundamentals"
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
                placeholder="Describe what the learner should accomplish..."
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn btn-primary" disabled={formLoading}>
                {formLoading ? 'Creating...' : 'Create Goal'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <h3>No goals yet</h3>
            <p>Create a goal for your mentee to start tracking their progress</p>
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
                <div className="flex gap-2">
                  <span className={`badge badge-${goal.status}`}>
                    {getStatusLabel(goal.status)}
                  </span>
                  <button
                    className={`btn btn-sm ${goal.status === 'active' ? 'btn-success' : 'btn-secondary'}`}
                    onClick={() => handleStatusToggle(goal._id, goal.status)}
                  >
                    {goal.status === 'active' ? 'Complete' : 'Reopen'}
                  </button>
                </div>
              </div>
              <p className="card-body">{goal.description}</p>
              <div className="card-footer">
                <Link to={`/goals/${goal._id}`} className="btn btn-primary">
                  View Progress
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MenteeGoals;
