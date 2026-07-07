import React, { useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { core, fontFamily } from './theme/tokens';

// ── Public pages ──────────────────────────────────────────────
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import ApplyPage from './pages/ApplyPage';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import LoginApplicant from './pages/LoginApplicant';
import ApplicantDashboard from './pages/ApplicantDashboard';
import StudentsPage from './pages/StudentsPage';
import StudentDashboard from './pages/StudentDashboard';
import ClassroomChat from './pages/ClassroomChat';
import SchoolSetupPage from './pages/SchoolSetupPage';
import StudentLogin from './pages/StudentLogin';
import StudentChangePassword from './pages/StudentChangePassword';
import StudentTimetable      from './pages/StudentTimetable';
import AssignmentDetail from './pages/AssignmentDetail';   // ← ADD
import StudentQuizAttempt from './pages/StudentQuizAttempt';

// ── System admin pages ────────────────────────────────────────
import SystemLoginPage    from './pages/system/SystemLoginPage';
import SystemDashboard    from './pages/system/SystemDashboard';
import SystemSchoolsPage  from './pages/system/SystemSchoolsPage';
import SystemAdminsPage   from './pages/system/SystemAdminsPage';
import SystemLogsPage     from './pages/system/SystemLogsPage';
import SystemTicketsPage  from './pages/system/SystemTicketsPage';
import SystemTeamPage     from './pages/system/SystemTeamPage';
import SystemProtectedRoute from './components/system/SystemProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import TeacherProtectedRoute from './components/TeacherProtectedRoute';
import StudentProtectedRoute from './components/StudentProtectedRoute';
import TimetablePage from './pages/TimetablePage';
import TeacherLoginPage from './pages/TeacherLoginPage';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherGradebook from './pages/TeacherGradebook';
import ManagementDashboard from './pages/ManagementDashboard';
import ParentLoginPage from './pages/ParentLoginPage';
import ParentDashboard from './pages/ParentDashboard';
import ParentProtectedRoute from './components/ParentProtectedRoute';


// ── Wrapper: hides public Navbar on /system/* routes ─────────
const AppShell = () => {
  const location = useLocation();
  const isSystemRoute = location.pathname.startsWith('/system');
  const hideNav = isSystemRoute
  || location.pathname.startsWith('/management')
  || location.pathname.startsWith('/teacher')
  || location.pathname.startsWith('/student-dashboard')
  || location.pathname.startsWith('/assignments')
  || location.pathname.startsWith('/student/timetable')   // ← ADD: hide navbar on assignment detail
  || location.pathname.startsWith('/student/quiz')
  || location.pathname.startsWith('/classroom-chat')
  || location.pathname.startsWith('/parent/dashboard');
  // Navbar is position:"absolute" so it floats on top of the Home hero image on purpose.
  // Every other page has no hero to bleed behind it, so it must reserve the navbar's height
  // as top padding or the navbar covers that page's own header content.
  const isHome = location.pathname === '/';

  return (
    <Box sx={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: '#ffffff',
    }}>
      
      {!hideNav && <Navbar />}

      <Box
        component="main"
        sx={{
          flex: 1,
          width: '100%',
          pt: (!hideNav && !isHome) ? { xs: '60px', sm: '68px' } : 0,
          overflowX: 'hidden',
          bgcolor: 'transparent',
        }}
      >
        <Routes>
          {/* ── Public routes ─────────────────────────────── */}
          <Route path="/"                    element={<HomePage />} />
          <Route path="/apply"               element={<ApplyPage />} />
          <Route path="/login"               element={<LoginPage />} />
          <Route path="/admin-login"         element={<LoginPage />} />
          <Route path="/admin"               element={<AdminProtectedRoute><AdminPage /></AdminProtectedRoute>} />
          <Route path="/login-applicant"     element={<LoginApplicant />} />
          <Route path="/applicant-dashboard" element={<ApplicantDashboard />} />
          <Route path="/students"            element={<AdminProtectedRoute><StudentsPage /></AdminProtectedRoute>} />
          <Route path="/student-dashboard"   element={<StudentProtectedRoute><StudentDashboard /></StudentProtectedRoute>} />
          <Route path="/student-login"       element={<StudentLogin />} />
          <Route path="/student/change-password" element={<StudentProtectedRoute><StudentChangePassword /></StudentProtectedRoute>} />
          <Route path="/assignments/:id"     element={<StudentProtectedRoute><AssignmentDetail /></StudentProtectedRoute>} />
          <Route path="/student/timetable"   element={<StudentProtectedRoute><StudentTimetable /></StudentProtectedRoute>} />
          <Route path="/student/quiz/:id" element={<StudentProtectedRoute><StudentQuizAttempt /></StudentProtectedRoute>} />
          <Route path="/classroom-chat/:classId" element={<StudentProtectedRoute><ClassroomChat /></StudentProtectedRoute>} />
          <Route path="/setup"               element={<AdminProtectedRoute><SchoolSetupPage /></AdminProtectedRoute>} />
          <Route path="/timetable"           element={<AdminProtectedRoute><TimetablePage /></AdminProtectedRoute>} />
          <Route path="/teacher-login"       element={<TeacherLoginPage />} />
          <Route path="/teacher/dashboard"   element={<TeacherProtectedRoute><TeacherDashboard /></TeacherProtectedRoute>} />
          <Route path="/teacher/gradebook/:classId" element={<TeacherProtectedRoute><TeacherGradebook /></TeacherProtectedRoute>} />
          <Route path="/management"          element={<AdminProtectedRoute><ManagementDashboard /></AdminProtectedRoute>} />
          <Route path="/parent-login"        element={<ParentLoginPage />} />
          <Route path="/parent/dashboard"    element={<ParentProtectedRoute><ParentDashboard /></ParentProtectedRoute>} />

          {/* ── System admin routes ────────────────────────── */}
          <Route path="/system" element={<SystemLoginPage />} />

          <Route path="/system/dashboard" element={
            <SystemProtectedRoute><SystemDashboard /></SystemProtectedRoute>
          } />
          <Route path="/system/schools" element={
            <SystemProtectedRoute><SystemSchoolsPage /></SystemProtectedRoute>
          } />
          <Route path="/system/admins" element={
            <SystemProtectedRoute><SystemAdminsPage /></SystemProtectedRoute>
          } />
          <Route path="/system/logs" element={
            <SystemProtectedRoute><SystemLogsPage /></SystemProtectedRoute>
          } />
          <Route path="/system/tickets" element={
            <SystemProtectedRoute><SystemTicketsPage /></SystemProtectedRoute>
          } />
          <Route path="/system/team" element={
            <SystemProtectedRoute><SystemTeamPage /></SystemProtectedRoute>
          } />
        </Routes>
      </Box>
    </Box>
  );
};

function App() {
  const theme = useMemo(() => createTheme({
    palette: {
      mode: 'light',
      primary:   { main: core.brand, dark: core.brandDark },
      secondary: { main: core.accent },
      error:     { main: core.danger },
      warning:   { main: core.warn },
      background: {
        default: '#ffffff',
        paper:   '#ffffff',
      },
    },
    typography: {
      fontFamily: fontFamily.body,
      h1: { fontSize: '2.5rem', '@media (max-width:600px)': { fontSize: '2rem' } },
      h2: { fontSize: '2rem',   '@media (max-width:600px)': { fontSize: '1.75rem' } },
      h3: { fontSize: '1.75rem','@media (max-width:600px)': { fontSize: '1.5rem' } },
      h4: { fontSize: '1.5rem', '@media (max-width:600px)': { fontSize: '1.25rem' } },
      h5: { fontSize: '1.25rem','@media (max-width:600px)': { fontSize: '1.1rem' } },
      h6: { fontSize: '1.1rem', '@media (max-width:600px)': { fontSize: '1rem' } },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { '@media (max-width:600px)': { fontSize: '0.875rem', padding: '8px 16px' } },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { '@media (max-width:600px)': { padding: '8px 4px', fontSize: '0.75rem' } },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { '@media (max-width:600px)': { margin: '16px', maxWidth: 'calc(100% - 32px)' } },
        },
      },
    },
  }), []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppShell />
      </Router>
    </ThemeProvider>
  );
}

export default App;




