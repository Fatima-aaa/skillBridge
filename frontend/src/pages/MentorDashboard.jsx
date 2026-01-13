import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { mentorProfileAPI, mentorshipAPI } from '../services/api';

function MentorDashboard() {
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [mentees, setMentees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showProfileForm, setShowProfileForm] = useState(false);

  // Profile form state
  const [skills, setSkills] = useState('');
  const [bio, setBio] = useState('');
  const [capacity, setCapacity] = useState(5);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [requestsRes, menteesRes] = await Promise.all([
        mentorshipAPI.getIncomingRequests(),
        mentorshipAPI.getMentees(),
      ]);
      setRequests(requestsRes.data.data);
      setMentees(menteesRes.data.data);

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
                <div style={{ marginTop: '10px' }}>
                  <button
                    className="btn btn-success"
                    onClick={() => handleRequestAction(request._id, 'accepted')}
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
                <Link
                  to={`/mentee/${mentorship.learner._id}/goals`}
                  className="btn btn-primary"
                  style={{ marginTop: '10px' }}
                >
                  View Goals
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default MentorDashboard;
