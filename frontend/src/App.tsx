import { Routes, Route, Navigate, HashRouter } from 'react-router-dom';
import WorkspacePage from './pages/WorkspacePage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import SearchHistoryPage from './pages/SearchHistoryPage';
import DocumentsPage from './pages/DocumentsPage';
import LandingPage from './pages/LandingPage';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <HashRouter>
      <div className="app-container">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<LandingPage />} />
          <Route 
            path="/app" 
            element={
              <ProtectedRoute>
                <WorkspacePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/history" 
            element={
              <ProtectedRoute>
                <SearchHistoryPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/documents" 
            element={
              <ProtectedRoute>
                <DocumentsPage />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;
