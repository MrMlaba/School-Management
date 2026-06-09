import React from 'react';
import { Navigate } from 'react-router-dom';

// Wraps any system admin page.
// If there is no systemToken in sessionStorage, redirect to /system (login).
const SystemProtectedRoute = ({ children }) => {
  const token = sessionStorage.getItem('systemToken');
  if (!token) return <Navigate to="/system" replace />;
  return children;
};

export default SystemProtectedRoute;