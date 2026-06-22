import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import MAPReviewPage from './pages/MAPReviewPage';
import CircularsPage from './pages/CircularsPage';
import UploadCircularPage from './pages/UploadCircularPage';
import MyTasksPage from './pages/MyTasksPage';
import ValidationSignOffPage from './pages/ValidationSignOffPage';
import DepartmentHeadPortal from './pages/DepartmentHeadPortal';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<LandingPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* General Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/circulars" element={<CircularsPage />} />
        </Route>

        {/* Compliance Officer & Admin Routes */}
        <Route element={<ProtectedRoute allowedRoles={['compliance_officer', 'system_admin']} />}>
          <Route path="/upload" element={<UploadCircularPage />} />
          <Route path="/map-review-screen" element={<MAPReviewPage />} />
          <Route path="/gate-2" element={<ValidationSignOffPage />} />
        </Route>

        {/* Department User Routes */}
        <Route element={<ProtectedRoute allowedRoles={['department_user', 'system_admin']} />}>
          <Route path="/my-tasks" element={<MyTasksPage />} />
        </Route>

        {/* Department Head Routes */}
        <Route element={<ProtectedRoute allowedRoles={['department_head', 'system_admin']} />}>
          <Route path="/department-portal" element={<DepartmentHeadPortal />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster position="bottom-right" theme="light" />
    </>
  );
}
