import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { mentorProfileAPI, mentorshipAPI } from '../services/api';

function MentorList() {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasActiveMentorship, setHasActiveMentorship] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [mentorsRes, mentorshipRes] = await Promise.all([
        mentorProfileAPI.getAll(),
        mentorshipAPI.getActiveMentorship(),
      ]);
      setMentors(mentorsRes.data.data);
      setHasActiveMentorship(!!mentorshipRes.data.data);
    } catch (err) {
      setError('Failed to load mentors');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Find a Mentor</h1>
        <p className="page-subtitle">Browse available mentors and start your learning journey</p>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Show banner if learner has active mentorship */}
      {hasActiveMentorship && (
        <div className="alert alert-warning">
          <strong>Note:</strong> You already have an active mentorship.
          You can browse mentors but cannot send new requests until your current mentorship is completed.
          <div className="mt-4">
            <Link to="/" className="btn btn-secondary btn-sm">
              Go to Dashboard
            </Link>
          </div>
        </div>
      )}

      {mentors.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <h3>No mentors available</h3>
            <p>Check back later for available mentors</p>
          </div>
        </div>
      ) : (
        <div className="grid">
          {mentors.map((mentor) => {
            // Handle both old format (direct profile) and new format (profile wrapper with reputation)
            const profile = mentor.profile || mentor;
            const profileId = profile.id || profile._id;
            const spotsAvailable = profile.capacity - profile.currentMenteeCount;

            return (
              <div className="card mentor-card" key={profileId}>
                <div className="card-header">
                  <div>
                    <h3 className="card-title">{profile.user.name}</h3>
                    <p className="card-subtitle">{profile.user.email}</p>
                  </div>
                  {profile.isAvailable ? (
                    <span className="badge badge-active">
                      {spotsAvailable} {spotsAvailable === 1 ? 'spot' : 'spots'}
                    </span>
                  ) : (
                    <span className="badge badge-paused">Full</span>
                  )}
                </div>

                <div className="skills-list">
                  {profile.skills.map((skill, idx) => (
                    <span key={idx} className="skill-tag">
                      {skill}
                    </span>
                  ))}
                </div>

                <p className="card-body mt-4">
                  {profile.bio || 'No bio provided'}
                </p>

                <div className="card-footer">
                  <Link to={`/mentors/${profileId}`} className="btn btn-primary">
                    View Profile
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MentorList;
