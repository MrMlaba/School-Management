import React from 'react';
import { Navigate } from 'react-router-dom';

const ADMIN_KEYS = ['adminToken', 'adminSchool', 'adminName'];

const clearAdmin = () => ADMIN_KEYS.forEach(k => sessionStorage.removeItem(k));

// Decode JWT payload without verifying signature (client-side expiry check only).
const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp ? Date.now() / 1000 > payload.exp : false;
  } catch {
    return true; // malformed token → treat as expired
  }
};

const AdminProtectedRoute = ({ children }) => {
  const token = sessionStorage.getItem('adminToken');

  if (!token || isTokenExpired(token)) {
    clearAdmin();
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default AdminProtectedRoute;
