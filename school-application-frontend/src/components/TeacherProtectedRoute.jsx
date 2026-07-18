import React from 'react';
import { Navigate } from 'react-router-dom';

const TEACHER_KEYS = ['teacherToken', 'teacherName', 'teacherSchool'];

const clearTeacher = () => TEACHER_KEYS.forEach(k => sessionStorage.removeItem(k));

const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp ? Date.now() / 1000 > payload.exp : false;
  } catch {
    return true;
  }
};

const TeacherProtectedRoute = ({ children }) => {
  const token = sessionStorage.getItem('teacherToken');
  if (!token || isTokenExpired(token)) {
    clearTeacher();
    return <Navigate to="/teacher-login" replace />;
  }
  return children;
};

export default TeacherProtectedRoute;
