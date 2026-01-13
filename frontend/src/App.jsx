import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import LearnerDashboard from './pages/LearnerDashboard';
import MentorDashboard from './pages/MentorDashboard';
import MentorList from './pages/MentorList';
import MentorProfile from './pages/MentorProfile';
import Goals from './pages/Goals';
import GoalDetail from './pages/GoalDetail';
import MenteeGoals from './pages/MenteeGoals';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <>
      {user && <Navbar />}
      <div className="container">
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={!user ? <Login /> : <Navigate to="/" />}
          />
          <Route
            path="/register"
            element={!user ? <Register /> : <Navigate to="/" />}
          />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              user ? (
                user.role === 'learner' ? (
                  <LearnerDashboard />
                ) : (
                  <MentorDashboard />
                )
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Learner Routes */}
          <Route
            path="/mentors"
            element={
              user?.role === 'learner' ? (
                <MentorList />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/mentors/:id"
            element={user ? <MentorProfile /> : <Navigate to="/login" />}
          />
          <Route
            path="/goals"
            element={
              user?.role === 'learner' ? <Goals /> : <Navigate to="/" />
            }
          />
          <Route
            path="/goals/:id"
            element={user ? <GoalDetail /> : <Navigate to="/login" />}
          />

          {/* Mentor Routes */}
          <Route
            path="/mentee/:menteeId/goals"
            element={
              user?.role === 'mentor' ? (
                <MenteeGoals />
              ) : (
                <Navigate to="/" />
              )
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
