import React from 'react';
import { Navigate } from 'react-router-dom';

// Wraps any parent-portal page.
// If there is no parentToken in sessionStorage, redirect to /parent-login
// before the page ever mounts — avoids the protected UI flashing on screen first.
const ParentProtectedRoute = ({ children }) => {
  const token = sessionStorage.getItem('parentToken');
  if (!token) return <Navigate to="/parent-login" replace />;
  return children;
};

export default ParentProtectedRoute;
