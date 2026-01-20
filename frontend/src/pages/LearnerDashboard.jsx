import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { mentorshipAPI } from '../services/api';

function LearnerDashboard() {
  const [activeMentorship, setActiveMentorship] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [activeRes, requestsRes] = await Promise.all([
        mentorshipAPI.getActiveMentorship(),
        mentorshipAPI.getMyRequests(),
      ]);
      setActiveMentorship(activeRes.data.data);
      setMyRequests(requestsRes.data.data);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
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
              {activeMentorship.status === 'at-risk' ? 'At Risk' :
               activeMentorship.status.charAt(0).toUpperCase() + activeMentorship.status.slice(1)}
            </span>
            <div style={{ marginTop: '15px' }}>
              <Link to="/goals" className="btn btn-primary">
                Manage Goals
              </Link>
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

      {/* Pending Requests */}
      <section style={{ marginTop: '30px' }}>
        <h3>My Mentorship Requests</h3>
        {myRequests.length === 0 ? (
          <div className="card empty-state">
            <p>No mentorship requests yet</p>
          </div>
        ) : (
          myRequests.map((request) => (
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
