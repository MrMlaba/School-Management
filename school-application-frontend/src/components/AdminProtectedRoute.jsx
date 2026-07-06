import React from 'react';
import { Navigate } from 'react-router-dom';

// Wraps any school-admin page.
// If there is no adminToken in sessionStorage, redirect to /login before the
// page ever mounts — avoids the protected UI flashing on screen first.
const AdminProtectedRoute = ({ children }) => {
  const token = sessionStorage.getItem('adminToken');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

export default AdminProtectedRoute;
