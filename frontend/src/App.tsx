import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OnboardingFlow } from './components/OnboardingFlow';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { DeveloperDashboard } from './pages/DeveloperDashboard';
import { UserMarketplace } from './pages/UserMarketplace';
import { AdminDashboard } from './pages/AdminDashboard';
import { AppDetails } from './pages/AppDetails';

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  // Show onboarding if user hasn't completed it
  if (user && !user.onboarding_completed) {
    return <OnboardingFlow onComplete={() => window.location.reload()} />;
  }
  
  return children;
};

const DashboardRoute = () => {
  const { user } = useAuth();
  
  if (user?.role === 'developer') {
    return <DeveloperDashboard />;
  } else if (user?.role === 'admin') {
    return <AdminDashboard />;
  } else {
    return <UserMarketplace />;
  }
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<PrivateRoute><DashboardRoute /></PrivateRoute>} />
          <Route path="/marketplace" element={<PrivateRoute><UserMarketplace /></PrivateRoute>} />
          <Route path="/app/:id" element={<PrivateRoute><AppDetails /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
