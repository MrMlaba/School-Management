import React from 'react';
import { Navigate } from 'react-router-dom';

// Wraps any student-portal page.
// If there is no studentToken in sessionStorage, redirect to /student-login
// before the page ever mounts — avoids the protected UI flashing on screen first.
const StudentProtectedRoute = ({ children }) => {
  const token = sessionStorage.getItem('studentToken');
  if (!token) return <Navigate to="/student-login" replace />;
  return children;
};

export default StudentProtectedRoute;
