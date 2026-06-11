import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './routes/PrivateRoute';
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import Datasets from './pages/Datasets';
import Experiments from './pages/Experiments';
import ExperimentDetails from './pages/ExperimentDetails';
import Compare from './pages/Compare';
import Leaderboard from './pages/Leaderboard';

import Reproducibility from './pages/Reproducibility';
import XAIEvidence from './pages/XAIEvidence';
import Reports from './pages/Reports';
import Manuscript from './pages/Manuscript';
import ReproPackage from './pages/ReproPackage';
import QualityReview from './pages/QualityReview';
import ModelCards from './pages/ModelCards';
import PublishedResearch from './pages/PublishedResearch';
import Profile from './pages/Profile';
import ReviewRequests from './pages/ReviewRequests';

const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
              borderRadius: '8px',
            },
            success: { iconTheme: { primary: 'var(--accent-green)', secondary: '#fff' } },
            error: { iconTheme: { primary: 'var(--accent-red)', secondary: '#fff' } },
          }}
        />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetails />} />
            <Route path="datasets" element={<Datasets />} />
            <Route path="experiments" element={<Experiments />} />
            <Route path="experiments/:id" element={<ExperimentDetails />} />
            <Route path="compare" element={<Compare />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            
            {/* New Routes */}
            <Route path="reproducibility" element={<Reproducibility />} />
            <Route path="xai-evidence" element={<XAIEvidence />} />
            <Route path="reports" element={<Reports />} />
            <Route path="repro-package" element={<ReproPackage />} />
            <Route path="quality-review" element={<QualityReview />} />
            <Route path="model-cards" element={<ModelCards />} />
            <Route path="published-research" element={<PublishedResearch />} />
            <Route path="manuscript" element={<Manuscript />} />
            <Route path="review-requests" element={<ReviewRequests />} />
            <Route path="profile" element={<Profile />} />
            <Route path="clinical-triage" element={<Navigate to="/dashboard" replace />} />
            <Route path="clinical-cases" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
