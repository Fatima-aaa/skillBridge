import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
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

// Admin imports
import AdminLayout from './components/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminMentorships from './pages/admin/AdminMentorships';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';

// Wrapper for admin routes
function AdminRoutes() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="login" element={<AdminLogin />} />
        <Route element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="mentorships" element={<AdminMentorships />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
        </Route>
      </Routes>
    </AdminAuthProvider>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <Routes>
      {/* Admin Routes - Must be before catch-all */}
      <Route path="/admin/*" element={<AdminRoutes />} />

      {/* Main App Routes */}
      <Route
        path="/*"
        element={
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
        }
      />
    </Routes>
  );
}

export default App;
