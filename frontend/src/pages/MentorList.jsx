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

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2 className="page-title">Find a Mentor</h2>
      {error && <div className="error">{error}</div>}

      {/* Show banner if learner has active mentorship */}
      {hasActiveMentorship && (
        <div className="card" style={{
          backgroundColor: '#fff3cd',
          borderColor: '#ffc107',
          marginBottom: '20px'
        }}>
          <p style={{ margin: 0, color: '#856404' }}>
            <strong>Note:</strong> You already have an active mentorship.
            You can browse mentors but cannot send new requests until your current mentorship is completed.
          </p>
          <Link to="/dashboard" className="btn btn-secondary" style={{ marginTop: '10px' }}>
            Go to Dashboard
          </Link>
        </div>
      )}

      {mentors.length === 0 ? (
        <div className="card empty-state">
          <p>No mentors available at the moment</p>
        </div>
      ) : (
        <div className="grid">
          {mentors.map((mentor) => {
            // Handle both old format (direct profile) and new format (profile wrapper with reputation)
            const profile = mentor.profile || mentor;
            const profileId = profile.id || profile._id;

            return (
              <div className="card" key={profileId}>
                <h3>{profile.user.name}</h3>
                <p>{profile.user.email}</p>
                <div className="skills-list">
                  {profile.skills.map((skill, idx) => (
                    <span key={idx} className="skill-tag">
                      {skill}
                    </span>
                  ))}
                </div>
                <p style={{ marginTop: '10px' }}>
                  {profile.bio || 'No bio provided'}
                </p>
                <p>
                  <strong>Availability:</strong>{' '}
                  {profile.isAvailable ? (
                    <span style={{ color: '#28a745' }}>
                      Available ({profile.capacity - profile.currentMenteeCount} spots)
                    </span>
                  ) : (
                    <span style={{ color: '#dc3545' }}>At capacity</span>
                  )}
                </p>
                <Link
                  to={`/mentors/${profileId}`}
                  className="btn btn-primary"
                  style={{ marginTop: '10px' }}
                >
                  View Profile
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MentorList;
