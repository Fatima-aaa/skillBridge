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

  if (loading) return <div>Loading...</div>;
  if (!goal) return <div className="error">Goal not found</div>;

  const isOwner = user?.role === 'learner' && goal.learner._id === user.id;

  return (
    <div>
      <button
        className="btn btn-secondary"
        onClick={() => navigate(-1)}
        style={{ marginBottom: '20px' }}
      >
        Back
      </button>

      {error && <div className="error">{error}</div>}

      {/* Goal Details */}
      <div className="card">
        <h2>{goal.title}</h2>
        <span className={`badge badge-${goal.status}`}>{goal.status}</span>
        <p style={{ marginTop: '15px' }}>{goal.description}</p>
        <small style={{ color: '#6c757d' }}>
          Created by: {goal.learner.name} on {new Date(goal.createdAt).toLocaleDateString()}
        </small>
      </div>

      {/* Progress Update Form - Only for goal owner */}
      {isOwner && (
        <div className="card" style={{ marginTop: '20px' }}>
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
      <div style={{ marginTop: '20px' }}>
        <h3>Progress Updates</h3>
        {progressUpdates.length === 0 ? (
          <div className="card empty-state">
            <p>No progress updates yet</p>
          </div>
        ) : (
          progressUpdates.map((update) => (
            <div className="progress-item" key={update._id}>
              <p>{update.content}</p>
              <small>
                {update.learner.name} - {new Date(update.createdAt).toLocaleString()}
              </small>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default GoalDetail;
