import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { mentorshipAPI, reviewAPI } from '../services/api';

function LearnerDashboard() {
  const [activeMentorship, setActiveMentorship] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [completedMentorships, setCompletedMentorships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completingMentorship, setCompletingMentorship] = useState(false);

  // Rating form state
  const [showRatingForm, setShowRatingForm] = useState(null);
  const [rating, setRating] = useState(5);
  const [ratingLoading, setRatingLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [activeRes, requestsRes, completedRes] = await Promise.all([
        mentorshipAPI.getActiveMentorship(),
        mentorshipAPI.getMyRequests(),
        mentorshipAPI.getCompletedMentorships(),
      ]);
      setActiveMentorship(activeRes.data.data);
      setMyRequests(requestsRes.data.data);
      setCompletedMentorships(completedRes.data.data);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteMentorship = async () => {
    if (!window.confirm('Are you sure you want to mark this mentorship as completed?')) {
      return;
    }

    setCompletingMentorship(true);
    setError('');

    try {
      await mentorshipAPI.completeMentorship(activeMentorship._id);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete mentorship');
    } finally {
      setCompletingMentorship(false);
    }
  };

  const handleSubmitRating = async (mentorshipId) => {
    setRatingLoading(true);
    setError('');

    try {
      await reviewAPI.submitRating(mentorshipId, rating);
      setShowRatingForm(null);
      setRating(5);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit rating');
    } finally {
      setRatingLoading(false);
    }
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'at-risk':
        return 'At Risk';
      case 'paused':
        return 'Paused';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'at-risk':
        return 'alert-warning';
      case 'paused':
        return 'alert-danger';
      default:
        return '';
    }
  };

  const getStatusMessage = (status) => {
    switch (status) {
      case 'at-risk':
        return 'Your mentorship is at risk due to inactivity. Please update your goal progress to restore it to active status.';
      case 'paused':
        return 'Your mentorship has been paused due to extended inactivity. Only your mentor can resume it.';
      default:
        return null;
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  const pendingRequests = myRequests.filter(r => r.status === 'pending');

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back! Here's your learning progress.</p>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Active Mentorship */}
      <section className="dashboard-section">
        <h2 className="section-title">Active Mentorship</h2>
        {activeMentorship ? (
          <div className="card mentorship-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">{activeMentorship.mentor.name}</h3>
                <p className="card-subtitle">{activeMentorship.mentor.email}</p>
              </div>
              <span className={`badge badge-${activeMentorship.status}`}>
                {getStatusDisplay(activeMentorship.status)}
              </span>
            </div>

            {getStatusMessage(activeMentorship.status) && (
              <div className={`alert ${getStatusClass(activeMentorship.status)}`}>
                {getStatusMessage(activeMentorship.status)}
              </div>
            )}

            <div className="card-footer">
              <Link to="/goals" className="btn btn-primary">
                Manage Goals
              </Link>
              {activeMentorship.status === 'active' && (
                <button
                  className="btn btn-success"
                  onClick={handleCompleteMentorship}
                  disabled={completingMentorship}
                >
                  {completingMentorship ? 'Completing...' : 'Mark as Completed'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="empty-state">
              <h3>No active mentorship</h3>
              <p>Find a mentor to start your learning journey</p>
              <Link to="/mentors" className="btn btn-primary mt-4">
                Find a Mentor
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Completed Mentorships - Rate Mentor */}
      {completedMentorships.length > 0 && (
        <section className="dashboard-section">
          <h2 className="section-title">Completed Mentorships</h2>
          <div className="cards-list">
            {completedMentorships.map((mentorship) => (
              <div className="card" key={mentorship._id}>
                <div className="card-header">
                  <div>
                    <h3 className="card-title">{mentorship.mentor.name}</h3>
                    <p className="card-subtitle">
                      Completed {new Date(mentorship.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="badge badge-completed">Completed</span>
                </div>

                {showRatingForm === mentorship._id ? (
                  <div className="rating-form">
                    <label className="form-label">Rate your mentor (1-5)</label>
                    <div className="rating-controls">
                      <select
                        value={rating}
                        onChange={(e) => setRating(parseInt(e.target.value))}
                        className="rating-select"
                      >
                        <option value={1}>1 - Poor</option>
                        <option value={2}>2 - Fair</option>
                        <option value={3}>3 - Good</option>
                        <option value={4}>4 - Very Good</option>
                        <option value={5}>5 - Excellent</option>
                      </select>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleSubmitRating(mentorship._id)}
                        disabled={ratingLoading}
                      >
                        {ratingLoading ? 'Submitting...' : 'Submit'}
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowRatingForm(null)}
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="rating-note">Your rating is anonymous</p>
                  </div>
                ) : (
                  <div className="card-footer">
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowRatingForm(mentorship._id)}
                    >
                      Rate Mentor
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pending Requests */}
      <section className="dashboard-section">
        <h2 className="section-title">Pending Requests</h2>
        {pendingRequests.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <p>No pending mentorship requests</p>
            </div>
          </div>
        ) : (
          <div className="cards-list">
            {pendingRequests.map((request) => (
              <div className="card" key={request._id}>
                <div className="card-header">
                  <div>
                    <h3 className="card-title">Request to {request.mentor.name}</h3>
                    <p className="card-subtitle">
                      Sent {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="badge badge-pending">Pending</span>
                </div>
                <p className="card-body">{request.message}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default LearnerDashboard;
