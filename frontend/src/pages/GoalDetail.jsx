import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { goalAPI, progressAPI } from '../services/api';

function GoalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [goal, setGoal] = useState(null);
  const [progressUpdates, setProgressUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Progress form state
  const [content, setContent] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [goalRes, progressRes] = await Promise.all([
        goalAPI.getOne(id),
        progressAPI.getByGoal(id),
      ]);
      setGoal(goalRes.data.data);
      setProgressUpdates(progressRes.data.data);
    } catch (err) {
      setError('Failed to load goal details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProgress = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      await progressAPI.create(id, content);
      setContent('');
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit progress update');
    } finally {
      setFormLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!goal) return <div className="error">Goal not found</div>;

  const isOwner = user?.role === 'learner' && goal.learner._id === user.id;

  return (
    <div>
      <button className="btn btn-secondary btn-sm mb-6" onClick={() => navigate(-1)}>
        Back
      </button>

      {error && <div className="error">{error}</div>}

      {/* Goal Details */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title" style={{ fontSize: 'var(--font-size-2xl)' }}>
              {goal.title}
            </h2>
            <p className="card-subtitle">
              Created by {goal.learner.name} on {new Date(goal.createdAt).toLocaleDateString()}
            </p>
          </div>
          <span className={`badge badge-${goal.status}`}>
            {getStatusLabel(goal.status)}
          </span>
        </div>
        <p className="card-body">{goal.description}</p>
      </div>

      {/* Progress Update Form - Only for goal owner */}
      {isOwner && (
        <div className="section-card mt-6">
          <h3>Add Progress Update</h3>
          <form onSubmit={handleSubmitProgress}>
            <div className="form-group">
              <label>What progress have you made?</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                maxLength={1000}
                required
                placeholder="Describe your progress, challenges faced, and next steps..."
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={formLoading}>
              {formLoading ? 'Submitting...' : 'Submit Update'}
            </button>
          </form>
        </div>
      )}

      {/* Progress Updates List */}
      <div className="mt-6">
        <h3 className="section-title">Progress Timeline</h3>
        {progressUpdates.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <h3>No progress updates yet</h3>
              <p>Start documenting your progress to track your learning journey</p>
            </div>
          </div>
        ) : (
          <div className="progress-timeline">
            {progressUpdates.map((update) => (
              <div className="progress-item" key={update._id}>
                <p>{update.content}</p>
                <small>
                  {update.learner.name} &middot; {new Date(update.createdAt).toLocaleString()}
                </small>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default GoalDetail;
