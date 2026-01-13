import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { mentorProfileAPI } from '../services/api';

function MentorList() {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMentors();
  }, []);

  const fetchMentors = async () => {
    try {
      const response = await mentorProfileAPI.getAll();
      setMentors(response.data.data);
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

      {mentors.length === 0 ? (
        <div className="card empty-state">
          <p>No mentors available at the moment</p>
        </div>
      ) : (
        <div className="grid">
          {mentors.map((profile) => (
            <div className="card" key={profile._id}>
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
                to={`/mentors/${profile._id}`}
                className="btn btn-primary"
                style={{ marginTop: '10px' }}
              >
                View Profile
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MentorList;
