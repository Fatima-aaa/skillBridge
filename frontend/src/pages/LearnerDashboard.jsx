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

  const getStatusMessage = (status) => {
    switch (status) {
      case 'at-risk':
        return {
          message: 'Your mentorship is at risk due to inactivity. Please update your goal progress to restore it to active status.',
          color: '#856404',
          bg: '#fff3cd'
        };
      case 'paused':
        return {
          message: 'Your mentorship has been paused due to extended inactivity. Only your mentor can resume it. You cannot mark this mentorship as completed while it is paused.',
          color: '#721c24',
          bg: '#f8d7da'
        };
      default:
        return null;
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2 className="page-title">Learner Dashboard</h2>
      {error && <div className="error">{error}</div>}

      {/* Active Mentorship */}
      <section>
        <h3>Active Mentorship</h3>
        {activeMentorship ? (
          <div className="card">
            <h4>Mentor: {activeMentorship.mentor.name}</h4>
            <p>Email: {activeMentorship.mentor.email}</p>
            <span className={`badge badge-${activeMentorship.status}`}>
              {getStatusDisplay(activeMentorship.status)}
            </span>

            {/* Status explanation for at-risk or paused */}
            {getStatusMessage(activeMentorship.status) && (
              <div style={{
                marginTop: '15px',
                padding: '10px',
                backgroundColor: getStatusMessage(activeMentorship.status).bg,
                borderRadius: '4px',
                color: getStatusMessage(activeMentorship.status).color
              }}>
                {getStatusMessage(activeMentorship.status).message}
              </div>
            )}

            <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
          <div className="card empty-state">
            <p>No active mentorship</p>
            <Link to="/mentors" className="btn btn-primary" style={{ marginTop: '10px' }}>
              Find a Mentor
            </Link>
          </div>
        )}
      </section>

      {/* Completed Mentorships - Rate Mentor */}
      {completedMentorships.length > 0 && (
        <section style={{ marginTop: '30px' }}>
          <h3>Completed Mentorships</h3>
          {completedMentorships.map((mentorship) => (
            <div className="card" key={mentorship._id}>
              <h4>Mentor: {mentorship.mentor.name}</h4>
              <span className="badge badge-completed">Completed</span>
              <small style={{ display: 'block', marginTop: '10px', color: '#6c757d' }}>
                Completed: {new Date(mentorship.completedAt).toLocaleDateString()}
              </small>

              {showRatingForm === mentorship._id ? (
                <div style={{ marginTop: '15px' }}>
                  <label>Rate your mentor (1-5):</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                    <select
                      value={rating}
                      onChange={(e) => setRating(parseInt(e.target.value))}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                      <option value={1}>1 - Poor</option>
                      <option value={2}>2 - Fair</option>
                      <option value={3}>3 - Good</option>
                      <option value={4}>4 - Very Good</option>
                      <option value={5}>5 - Excellent</option>
                    </select>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleSubmitRating(mentorship._id)}
                      disabled={ratingLoading}
                    >
                      {ratingLoading ? 'Submitting...' : 'Submit Rating'}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowRatingForm(null)}
                    >
                      Cancel
                    </button>
                  </div>
                  <small style={{ color: '#6c757d', marginTop: '5px', display: 'block' }}>
                    Your rating is anonymous.
                  </small>
                </div>
              ) : (
                <button
                  className="btn btn-primary"
                  style={{ marginTop: '10px' }}
                  onClick={() => setShowRatingForm(mentorship._id)}
                >
                  Rate Mentor
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Pending Requests */}
      <section style={{ marginTop: '30px' }}>
        <h3>My Mentorship Requests</h3>
        {myRequests.filter(r => r.status === 'pending').length === 0 ? (
          <div className="card empty-state">
            <p>No pending mentorship requests</p>
          </div>
        ) : (
          myRequests.filter(r => r.status === 'pending').map((request) => (
            <div className="card" key={request._id}>
              <h4>To: {request.mentor.name}</h4>
              <p>{request.message}</p>
              <span className={`badge badge-${request.status}`}>
                {request.status}
              </span>
              <small style={{ display: 'block', marginTop: '10px', color: '#6c757d' }}>
                Sent: {new Date(request.createdAt).toLocaleDateString()}
              </small>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

export default LearnerDashboard;
