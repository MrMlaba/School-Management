import React from 'react';
import { Navigate } from 'react-router-dom';

// Wraps any system admin page.
// If there is no systemToken in localStorage, redirect to /system (login).
const SystemProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('systemToken');
  if (!token) return <Navigate to="/system" replace />;
  return children;
};

export default SystemProtectedRoute;