import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PublicLayout from '../components/layout/PublicLayout.jsx';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import GuestRoute from './GuestRoute.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

import HomePage from '../pages/HomePage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import RegisterPage from '../pages/RegisterPage.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import NewAnalysisPage from '../pages/NewAnalysisPage.jsx';
import MyProblemsPage from '../pages/MyProblemsPage.jsx';
import ProblemDetailPage from '../pages/ProblemDetailPage.jsx';
import AnalysisDetailPage from '../pages/AnalysisDetailPage.jsx';
import EditProblemPage from '../pages/EditProblemPage.jsx';
import AnalysisComparisonPage from '../pages/AnalysisComparisonPage.jsx';
import ReviseTodayPage from '../pages/ReviseTodayPage.jsx';
import LearningPreferencesPage from '../pages/LearningPreferencesPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';

/**
 * Main application routing configuration.
 * Groups routes under layouts (public/dashboard) and guarding endpoints.
 */
const AppRoutes = () => {
  return (
    <Routes>
      {/* Publicly accessible layout */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />

        {/* Guest only endpoints (login/register) */}
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
      </Route>

      {/* Protected workspace layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/problems/new" element={<NewAnalysisPage />} />
          <Route path="/problems" element={<MyProblemsPage />} />
          <Route path="/problems/:problemId" element={<ProblemDetailPage />} />
          <Route path="/problems/:problemId/edit" element={<EditProblemPage />} />
          <Route path="/problems/:problemId/analyses/compare" element={<AnalysisComparisonPage />} />
          <Route path="/analyses/:analysisId" element={<AnalysisDetailPage />} />
          <Route path="/revise" element={<ReviseTodayPage />} />
          <Route path="/preferences" element={<LearningPreferencesPage />} />
        </Route>
      </Route>

      {/* 404 Fallback endpoint */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;
export { AppRoutes };
