import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mentorProfileAPI, mentorshipAPI, reviewAPI } from '../services/api';

function MentorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [mentorRating, setMentorRating] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [activeMentorship, setActiveMentorship] = useState(null);
  const [myRequests, setMyRequests] = useState([]);

  useEffect(() => {
    fetchData();
  }, [id, user]);

  const fetchData = async () => {
    try {
      const profileRes = await mentorProfileAPI.getOne(id);
      // Handle both old format (direct profile) and new format (profile wrapper with reputation)
      const profileData = profileRes.data.data.profile || profileRes.data.data;
      setProfile(profileData);

      // Fetch mentor rating
      try {
        const ratingRes = await reviewAPI.getMentorRatings(profileData.user._id);
        setMentorRating(ratingRes.data.stats);
      } catch (err) {
        // No ratings yet, that's fine
        setMentorRating(null);
      }

      // If user is a learner, also fetch their active mentorship and requests
      if (user?.role === 'learner') {
        const [activeRes, requestsRes] = await Promise.all([
          mentorshipAPI.getActiveMentorship(),
          mentorshipAPI.getMyRequests(),
        ]);
        setActiveMentorship(activeRes.data.data);
        setMyRequests(requestsRes.data.data);
      }
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

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <span className="star-rating">
        {'★'.repeat(fullStars)}
        {hasHalfStar && '½'}
        {'☆'.repeat(emptyStars)}
      </span>
    );
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!profile) return <div className="error">Mentor not found</div>;

  const spotsAvailable = profile.capacity - profile.currentMenteeCount;

  return (
    <div>
      <button className="btn btn-secondary btn-sm mb-6" onClick={() => navigate(-1)}>
        Back
      </button>

      <div className="card profile-card">
        <div className="profile-header">
          <div className="profile-avatar">
            {profile.user.name.charAt(0).toUpperCase()}
          </div>
          <div className="profile-info">
            <h2>{profile.user.name}</h2>
            <p className="text-muted">{profile.user.email}</p>
          </div>
        </div>

        {/* Rating Display */}
        {mentorRating && (
          <div className="rating-display">
            {renderStars(mentorRating.averageRating)}
            <span className="rating-value">{mentorRating.averageRating.toFixed(1)}</span>
            <span className="rating-count">
              ({mentorRating.totalRatings} {mentorRating.totalRatings === 1 ? 'rating' : 'ratings'})
            </span>
          </div>
        )}

        <div className="profile-section">
          <h4 className="profile-section-title">Skills</h4>
          <div className="skills-list">
            {profile.skills.map((skill, idx) => (
              <span key={idx} className="skill-tag">
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="profile-section">
          <h4 className="profile-section-title">About</h4>
          <p>{profile.bio || 'No bio provided'}</p>
        </div>

        <div className="profile-section">
          <h4 className="profile-section-title">Availability</h4>
          {profile.isAvailable ? (
            <span className="availability-badge available">
              {spotsAvailable} of {profile.capacity} spots open
            </span>
          ) : (
            <span className="availability-badge full">
              Currently at full capacity
            </span>
          )}
        </div>
      </div>

      {/* Request Form - Only for learners */}
      {user?.role === 'learner' && (
        <div className="card mt-6">
          {activeMentorship ? (
            // Learner already has an active mentorship
            <div className="status-message">
              <h3>Mentorship Status</h3>
              <p className="text-warning">
                You already have an active mentorship with {activeMentorship.mentor.name}.
                Complete your current mentorship before requesting a new one.
              </p>
            </div>
          ) : myRequests.some(
              (r) => r.mentor._id === profile.user._id && r.status === 'pending'
            ) ? (
            // Learner has a pending request to this mentor
            <div className="status-message">
              <h3>Request Pending</h3>
              <p className="text-warning">
                You already have a pending request to this mentor.
              </p>
            </div>
          ) : !profile.isAvailable ? (
            // Mentor is not available
            <div className="status-message">
              <h3>Mentor Unavailable</h3>
              <p className="text-danger">
                This mentor is currently at full capacity.
              </p>
            </div>
          ) : (
            // Can send a request
            <>
              <h3 className="card-title mb-4">Send Mentorship Request</h3>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default MentorProfile;
