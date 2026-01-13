import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mentorProfileAPI, mentorshipAPI } from '../services/api';

function MentorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      const response = await mentorProfileAPI.getOne(id);
      setProfile(response.data.data);
    } catch (err) {
      setError('Failed to load mentor profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await mentorshipAPI.sendRequest({
        mentorId: profile.user._id,
        message,
      });
      setSuccess('Mentorship request sent successfully!');
      setMessage('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!profile) return <div className="error">Mentor not found</div>;

  return (
    <div>
      <button
        className="btn btn-secondary"
        onClick={() => navigate(-1)}
        style={{ marginBottom: '20px' }}
      >
        Back
      </button>

      <div className="card">
        <h2>{profile.user.name}</h2>
        <p>{profile.user.email}</p>

        <h4 style={{ marginTop: '20px' }}>Skills</h4>
        <div className="skills-list">
          {profile.skills.map((skill, idx) => (
            <span key={idx} className="skill-tag">
              {skill}
            </span>
          ))}
        </div>

        <h4 style={{ marginTop: '20px' }}>About</h4>
        <p>{profile.bio || 'No bio provided'}</p>

        <h4 style={{ marginTop: '20px' }}>Availability</h4>
        <p>
          {profile.isAvailable ? (
            <span style={{ color: '#28a745' }}>
              Available - {profile.capacity - profile.currentMenteeCount} of {profile.capacity} spots open
            </span>
          ) : (
            <span style={{ color: '#dc3545' }}>Currently at full capacity</span>
          )}
        </p>
      </div>

      {/* Request Form - Only for learners */}
      {user?.role === 'learner' && profile.isAvailable && (
        <div className="card" style={{ marginTop: '20px' }}>
          <h3>Send Mentorship Request</h3>
          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}
          <form onSubmit={handleSendRequest}>
            <div className="form-group">
              <label>Message (optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="Introduce yourself and explain why you'd like this mentor..."
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Sending...' : 'Send Request'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default MentorProfile;
