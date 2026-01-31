import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { mentorProfileAPI, mentorshipAPI, feedbackAPI } from '../services/api';

function MentorDashboard() {
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [mentees, setMentees] = useState([]);
  const [completedMentorships, setCompletedMentorships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showProfileForm, setShowProfileForm] = useState(false);

  // Profile form state
  const [skills, setSkills] = useState('');
  const [bio, setBio] = useState('');
  const [capacity, setCapacity] = useState(5);
  const [formLoading, setFormLoading] = useState(false);

  // Rating form state
  const [showRatingForm, setShowRatingForm] = useState(null);
  const [rating, setRating] = useState(5);
  const [ratingLoading, setRatingLoading] = useState(false);

  // Reactivation state
  const [reactivating, setReactivating] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [requestsRes, menteesRes, completedRes] = await Promise.all([
        mentorshipAPI.getIncomingRequests(),
        mentorshipAPI.getMentees(),
        mentorshipAPI.getCompletedMentorships(),
      ]);
      setRequests(requestsRes.data.data);
      setMentees(menteesRes.data.data);
      setCompletedMentorships(completedRes.data.data);

      try {
        const profileRes = await mentorProfileAPI.getMyProfile();
        setProfile(profileRes.data.data);
        setSkills(profileRes.data.data.skills.join(', '));
        setBio(profileRes.data.data.bio);
        setCapacity(profileRes.data.data.capacity);
      } catch {
        setShowProfileForm(true);
      }
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    const profileData = {
      skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
      bio,
      capacity: parseInt(capacity),
    };

    try {
      if (profile) {
        await mentorProfileAPI.update(profileData);
      } else {
        await mentorProfileAPI.create(profileData);
      }
      await fetchData();
      setShowProfileForm(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile');
    } finally {
      setFormLoading(false);
    }
  };

  const handleRequestAction = async (requestId, status) => {
    try {
      await mentorshipAPI.updateStatus(requestId, status);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update request');
    }
  };

  const handleReactivate = async (mentorshipId) => {
    setReactivating(mentorshipId);
    setError('');

    try {
      await mentorshipAPI.reactivateMentorship(mentorshipId, 'Mentorship reactivated by mentor');
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reactivate mentorship');
    } finally {
      setReactivating(null);
    }
  };

  const handleSubmitRating = async (mentorshipId) => {
    setRatingLoading(true);
    setError('');

    try {
      await feedbackAPI.submitRating(mentorshipId, rating);
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

  const getRiskLevelClass = (riskLevel) => {
    switch (riskLevel) {
      case 'high':
        return 'alert-danger';
      case 'medium':
        return 'alert-warning';
      default:
        return 'alert-success';
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Manage your mentoring activities</p>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Profile Section */}
      <section className="dashboard-section">
        <h2 className="section-title">My Profile</h2>
        {showProfileForm || !profile ? (
          <div className="card">
            <form onSubmit={handleProfileSubmit}>
              <div className="form-group">
                <label>Skills (comma-separated)</label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g., JavaScript, React, Node.js"
                  required
                />
              </div>
              <div className="form-group">
                <label>Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Tell learners about yourself and your experience..."
                />
              </div>
              <div className="form-group">
                <label>Mentee Capacity (1-20)</label>
                <input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  min={1}
                  max={20}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? 'Saving...' : profile ? 'Update Profile' : 'Create Profile'}
                </button>
                {profile && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowProfileForm(false)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : (
          <div className="card">
            <div className="skills-list">
              {profile.skills.map((skill, idx) => (
                <span key={idx} className="skill-tag">
                  {skill}
                </span>
              ))}
            </div>
            <p className="card-body mt-4">{profile.bio || 'No bio added'}</p>
            <div className="capacity-indicator mt-4">
              <span className="text-muted text-sm">Capacity:</span>
              <span className="capacity-value">
                {profile.currentMenteeCount} / {profile.capacity}
              </span>
            </div>
            <div className="card-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowProfileForm(true)}
              >
                Edit Profile
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Incoming Requests */}
      <section className="dashboard-section">
        <h2 className="section-title">Incoming Requests</h2>
        {pendingRequests.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <p>No pending requests</p>
            </div>
          </div>
        ) : (
          <div className="cards-list">
            {pendingRequests.map((request) => (
              <div className="card" key={request._id}>
                <div className="card-header">
                  <div>
                    <h3 className="card-title">{request.learner.name}</h3>
                    <p className="card-subtitle">{request.learner.email}</p>
                  </div>
                  <span className="badge badge-pending">Pending</span>
                </div>

                {request.message && (
                  <p className="card-body request-message">"{request.message}"</p>
                )}

                {/* Learner Reliability Info */}
                {request.learnerReliability && (
                  <div className={`alert ${getRiskLevelClass(request.learnerReliability.riskLevel)} mt-4`}>
                    <p className="reliability-title">Learner History</p>
                    <div className="reliability-stats">
                      {request.learnerReliability.reliabilityScore !== null && (
                        <p>
                          Reliability Score: <strong>{request.learnerReliability.reliabilityScore}/100</strong>
                        </p>
                      )}
                      {request.learnerReliability.completedMentorships > 0 && (
                        <p>
                          Completed Mentorships: {request.learnerReliability.completedMentorships}
                        </p>
                      )}
                      {request.learnerReliability.averageRating !== null && (
                        <p>
                          Avg Rating: {request.learnerReliability.averageRating}/5
                        </p>
                      )}
                      {request.learnerReliability.checkInConsistencyRate !== null && (
                        <p>
                          Check-in Consistency: {request.learnerReliability.checkInConsistencyRate}%
                        </p>
                      )}
                      {request.learnerReliability.warnings?.length > 0 && (
                        <div className="reliability-warnings">
                          {request.learnerReliability.warnings.map((warning, idx) => (
                            <p key={idx}>&#9888; {warning}</p>
                          ))}
                        </div>
                      )}
                      {request.learnerReliability.completedMentorships === 0 &&
                       request.learnerReliability.reliabilityScore === null && (
                        <p className="text-muted">New learner - no history yet</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="card-footer">
                  <button
                    className="btn btn-success"
                    onClick={() => handleRequestAction(request._id, 'active')}
                  >
                    Accept
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleRequestAction(request._id, 'rejected')}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Current Mentees */}
      <section className="dashboard-section">
        <h2 className="section-title">My Mentees</h2>
        {mentees.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <p>No mentees yet</p>
            </div>
          </div>
        ) : (
          <div className="grid">
            {mentees.map((mentorship) => (
              <div className="card" key={mentorship._id}>
                <div className="card-header">
                  <div>
                    <h3 className="card-title">{mentorship.learner.name}</h3>
                    <p className="card-subtitle">{mentorship.learner.email}</p>
                  </div>
                  <span className={`badge badge-${mentorship.status}`}>
                    {getStatusDisplay(mentorship.status)}
                  </span>
                </div>

                {/* Show warning for at-risk or paused */}
                {mentorship.status === 'at-risk' && (
                  <p className="status-warning text-warning">
                    Mentee has not updated progress in over a week.
                  </p>
                )}
                {mentorship.status === 'paused' && (
                  <p className="status-warning text-danger">
                    Mentorship paused due to inactivity.
                  </p>
                )}

                <div className="card-footer">
                  <Link
                    to={`/mentee/${mentorship.learner._id}/goals`}
                    className="btn btn-primary"
                  >
                    View Goals
                  </Link>
                  {mentorship.status === 'paused' && (
                    <button
                      className="btn btn-success"
                      onClick={() => handleReactivate(mentorship._id)}
                      disabled={reactivating === mentorship._id}
                    >
                      {reactivating === mentorship._id ? 'Reactivating...' : 'Reactivate'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Completed Mentorships - Rate Learner */}
      {completedMentorships.length > 0 && (
        <section className="dashboard-section">
          <h2 className="section-title">Completed Mentorships</h2>
          <div className="cards-list">
            {completedMentorships.map((mentorship) => (
              <div className="card" key={mentorship._id}>
                <div className="card-header">
                  <div>
                    <h3 className="card-title">{mentorship.learner.name}</h3>
                    <p className="card-subtitle">
                      Completed {new Date(mentorship.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="badge badge-completed">Completed</span>
                </div>

                {showRatingForm === mentorship._id ? (
                  <div className="rating-form">
                    <label className="form-label">Rate your learner (1-5)</label>
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
                      Rate Learner
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default MentorDashboard;
