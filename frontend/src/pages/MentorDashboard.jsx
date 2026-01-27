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

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2 className="page-title">Mentor Dashboard</h2>
      {error && <div className="error">{error}</div>}

      {/* Profile Section */}
      <section>
        <h3>My Profile</h3>
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
              <button type="submit" className="btn btn-primary" disabled={formLoading}>
                {formLoading ? 'Saving...' : profile ? 'Update Profile' : 'Create Profile'}
              </button>
              {profile && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginLeft: '10px' }}
                  onClick={() => setShowProfileForm(false)}
                >
                  Cancel
                </button>
              )}
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
            <p style={{ marginTop: '15px' }}>{profile.bio || 'No bio added'}</p>
            <p>
              <strong>Capacity:</strong> {profile.currentMenteeCount} / {profile.capacity}
            </p>
            <button
              className="btn btn-secondary"
              onClick={() => setShowProfileForm(true)}
            >
              Edit Profile
            </button>
          </div>
        )}
      </section>

      {/* Incoming Requests */}
      <section style={{ marginTop: '30px' }}>
        <h3>Incoming Requests</h3>
        {requests.filter((r) => r.status === 'pending').length === 0 ? (
          <div className="card empty-state">
            <p>No pending requests</p>
          </div>
        ) : (
          requests
            .filter((r) => r.status === 'pending')
            .map((request) => (
              <div className="card" key={request._id}>
                <h4>From: {request.learner.name}</h4>
                <p>{request.learner.email}</p>
                {request.message && <p>"{request.message}"</p>}

                {/* Learner Reliability Info */}
                {request.learnerReliability && (
                  <div style={{
                    marginTop: '15px',
                    padding: '10px',
                    backgroundColor: request.learnerReliability.riskLevel === 'high' ? '#f8d7da' :
                                     request.learnerReliability.riskLevel === 'medium' ? '#fff3cd' : '#d4edda',
                    borderRadius: '4px'
                  }}>
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9em' }}>
                      Learner History
                    </p>
                    <div style={{ fontSize: '0.85em', marginTop: '5px' }}>
                      {request.learnerReliability.reliabilityScore !== null && (
                        <p style={{ margin: '3px 0' }}>
                          Reliability Score: <strong>{request.learnerReliability.reliabilityScore}/100</strong>
                        </p>
                      )}
                      {request.learnerReliability.completedMentorships > 0 && (
                        <p style={{ margin: '3px 0' }}>
                          Completed Mentorships: {request.learnerReliability.completedMentorships}
                        </p>
                      )}
                      {request.learnerReliability.averageRating !== null && (
                        <p style={{ margin: '3px 0' }}>
                          Avg Rating from Mentors: {request.learnerReliability.averageRating}/5
                        </p>
                      )}
                      {request.learnerReliability.checkInConsistencyRate !== null && (
                        <p style={{ margin: '3px 0' }}>
                          Check-in Consistency: {request.learnerReliability.checkInConsistencyRate}%
                        </p>
                      )}
                      {request.learnerReliability.warnings && request.learnerReliability.warnings.length > 0 && (
                        <div style={{ marginTop: '8px', color: '#721c24' }}>
                          {request.learnerReliability.warnings.map((warning, idx) => (
                            <p key={idx} style={{ margin: '2px 0', fontSize: '0.85em' }}>
                              ⚠ {warning}
                            </p>
                          ))}
                        </div>
                      )}
                      {request.learnerReliability.completedMentorships === 0 &&
                       request.learnerReliability.reliabilityScore === null && (
                        <p style={{ margin: '3px 0', color: '#6c757d' }}>
                          New learner - no history yet
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '10px' }}>
                  <button
                    className="btn btn-success"
                    onClick={() => handleRequestAction(request._id, 'active')}
                  >
                    Accept
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ marginLeft: '10px' }}
                    onClick={() => handleRequestAction(request._id, 'rejected')}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
        )}
      </section>

      {/* Current Mentees */}
      <section style={{ marginTop: '30px' }}>
        <h3>My Mentees</h3>
        {mentees.length === 0 ? (
          <div className="card empty-state">
            <p>No mentees yet</p>
          </div>
        ) : (
          <div className="grid">
            {mentees.map((mentorship) => (
              <div className="card" key={mentorship._id}>
                <h4>{mentorship.learner.name}</h4>
                <p>{mentorship.learner.email}</p>
                <span className={`badge badge-${mentorship.status}`}>
                  {getStatusDisplay(mentorship.status)}
                </span>

                {/* Show warning for at-risk or paused */}
                {mentorship.status === 'at-risk' && (
                  <p style={{ color: '#856404', marginTop: '10px', fontSize: '0.9em' }}>
                    Mentee has not updated progress in over a week.
                  </p>
                )}
                {mentorship.status === 'paused' && (
                  <p style={{ color: '#721c24', marginTop: '10px', fontSize: '0.9em' }}>
                    Mentorship paused due to inactivity. You can reactivate it.
                  </p>
                )}

                <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
        <section style={{ marginTop: '30px' }}>
          <h3>Completed Mentorships</h3>
          {completedMentorships.map((mentorship) => (
            <div className="card" key={mentorship._id}>
              <h4>Learner: {mentorship.learner.name}</h4>
              <span className="badge badge-completed">Completed</span>
              <small style={{ display: 'block', marginTop: '10px', color: '#6c757d' }}>
                Completed: {new Date(mentorship.completedAt).toLocaleDateString()}
              </small>

              {showRatingForm === mentorship._id ? (
                <div style={{ marginTop: '15px' }}>
                  <label>Rate your learner (1-5):</label>
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
                  Rate Learner
                </button>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

export default MentorDashboard;
