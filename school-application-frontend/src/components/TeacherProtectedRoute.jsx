import React from 'react';
import { Navigate } from 'react-router-dom';

// Wraps any teacher-portal page.
// If there is no teacherToken in sessionStorage, redirect to /teacher-login
// before the page ever mounts — avoids the protected UI flashing on screen first.
const TeacherProtectedRoute = ({ children }) => {
  const token = sessionStorage.getItem('teacherToken');
  if (!token) return <Navigate to="/teacher-login" replace />;
  return children;
};

export default TeacherProtectedRoute;
