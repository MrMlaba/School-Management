import React, { useMemo, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, CircularProgress, Typography, Button } from '@mui/material';

// ── Public pages (lazy loaded — only downloaded when needed) ──
import Navbar from './components/Navbar';
const HomePage              = lazy(() => import('./pages/HomePage'));
const ApplyPage             = lazy(() => import('./pages/ApplyPage'));
const LoginPage             = lazy(() => import('./pages/LoginPage'));
const AdminPage             = lazy(() => import('./pages/AdminPage'));
const LoginApplicant        = lazy(() => import('./pages/LoginApplicant'));
const ApplicantDashboard    = lazy(() => import('./pages/ApplicantDashboard'));
const StudentsPage          = lazy(() => import('./pages/StudentsPage'));
const StudentDashboard      = lazy(() => import('./pages/StudentDashboard'));
const ClassroomChat         = lazy(() => import('./pages/ClassroomChat'));
const SchoolSetupPage       = lazy(() => import('./pages/SchoolSetupPage'));
const StudentLogin          = lazy(() => import('./pages/StudentLogin'));
const StudentChangePassword = lazy(() => import('./pages/StudentChangePassword'));
const StudentTimetable      = lazy(() => import('./pages/StudentTimetable'));
const AssignmentDetail      = lazy(() => import('./pages/AssignmentDetail'));
const StudentQuizAttempt    = lazy(() => import('./pages/StudentQuizAttempt'));

// ── Teacher pages ─────────────────────────────────────────────
const TimetablePage    = lazy(() => import('./pages/TimetablePage'));
const TeacherLoginPage = lazy(() => import('./pages/TeacherLoginPage'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const TeacherGradebook = lazy(() => import('./pages/TeacherGradebook'));

// ── Management ────────────────────────────────────────────────
const ManagementDashboard = lazy(() => import('./pages/ManagementDashboard'));

// ── System admin pages ────────────────────────────────────────
import SystemProtectedRoute from './components/system/SystemProtectedRoute';
const SystemLoginPage   = lazy(() => import('./pages/system/SystemLoginPage'));
const SystemDashboard   = lazy(() => import('./pages/system/SystemDashboard'));
const SystemSchoolsPage = lazy(() => import('./pages/system/SystemSchoolsPage'));
const SystemAdminsPage  = lazy(() => import('./pages/system/SystemAdminsPage'));
const SystemLogsPage    = lazy(() => import('./pages/system/SystemLogsPage'));

// ─────────────────────────────────────────────────────────────
//  ERROR BOUNDARY
//  Catches any unhandled React error so the whole app
//  doesn't go blank — shows a friendly recovery screen instead.
// ─────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console — replace with a real error tracking service
    // (e.g. Sentry) when you go to production with real schools
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#F0F4F8',
        p: 3,
        textAlign: 'center',
      }}>
        <Box sx={{
          background: '#fff',
          borderRadius: '12px',
          p: 5,
          maxWidth: 480,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          border: '1px solid #E2E8F0',
        }}>
          <Typography sx={{ fontSize: '3rem', mb: 2 }}>⚠️</Typography>
          <Typography sx={{
            fontWeight: 800, fontSize: '1.3rem', color: '#1A3557', mb: 1,
            fontFamily: '"IBM Plex Sans", sans-serif',
          }}>
            Something went wrong
          </Typography>
          <Typography sx={{
            color: '#6B7C93', fontSize: '0.9rem', mb: 3,
            fontFamily: '"IBM Plex Sans", sans-serif', lineHeight: 1.6,
          }}>
            An unexpected error occurred. Your data is safe.
            Try refreshing the page — if the problem continues,
            contact your system administrator.
          </Typography>
          {/* Show error details in development only */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <Box sx={{
              background: '#FFF5F5', border: '1px solid #FED7D7',
              borderRadius: '6px', p: 2, mb: 3, textAlign: 'left',
            }}>
              <Typography sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#C62828', wordBreak: 'break-word' }}>
                {this.state.error.toString()}
              </Typography>
            </Box>
          )}
          <Button
            variant="contained"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = '/';
            }}
            sx={{
              background: '#1A3557', textTransform: 'none', fontWeight: 700,
              fontFamily: '"IBM Plex Sans", sans-serif', boxShadow: 'none',
              px: 4, py: 1.25,
              '&:hover': { background: '#122740' },
            }}
          >
            Go to Home Page
          </Button>
          <Button
            variant="outlined"
            onClick={() => window.location.reload()}
            sx={{
              ml: 1.5, textTransform: 'none', fontWeight: 700,
              fontFamily: '"IBM Plex Sans", sans-serif',
              borderColor: '#1A3557', color: '#1A3557', px: 3, py: 1.25,
            }}
          >
            Refresh Page
          </Button>
        </Box>
      </Box>
    );
  }
}

// ─────────────────────────────────────────────────────────────
//  PAGE LOADING SPINNER
//  Shown while a lazy-loaded page chunk is downloading.
//  Adapts its message based on the current route.
// ─────────────────────────────────────────────────────────────
const PageLoader = ({ message = 'Loading…' }) => (
  <Box sx={{
    minHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  }}>
    <CircularProgress size={36} sx={{ color: '#1A3557' }} />
    <Typography sx={{
      color: '#6B7C93', fontSize: '0.85rem',
      fontFamily: '"IBM Plex Sans", sans-serif',
    }}>
      {message}
    </Typography>
  </Box>
);

// ─────────────────────────────────────────────────────────────
//  ROUTE LOADING MESSAGE HOOK
//  Returns a context-appropriate loading message per route
// ─────────────────────────────────────────────────────────────
const useLoadingMessage = (pathname) => {
  const messages = {
    '/':                    'Loading school portal…',
    '/apply':               'Loading application form…',
    '/admin':               'Loading applications…',
    '/management':          'Loading management dashboard…',
    '/student-dashboard':   'Loading student portal…',
    '/teacher/dashboard':   'Loading teacher portal…',
    '/teacher/gradebook':   'Loading gradebook…',
    '/classroom-chat':      'Loading classroom chat…',
    '/student/quiz':        'Loading quiz…',
    '/student/timetable':   'Loading timetable…',
    '/assignments':         'Loading assignment…',
    '/system/dashboard':    'Loading system dashboard…',
    '/system/schools':      'Loading schools…',
    '/system/admins':       'Loading administrators…',
    '/system/logs':         'Loading audit logs…',
  };
  const match = Object.keys(messages).find(k => pathname.startsWith(k));
  return messages[match] || 'Loading…';
};

// ─────────────────────────────────────────────────────────────
//  APP SHELL — layout wrapper with nav hide logic
// ─────────────────────────────────────────────────────────────
const AppShell = () => {
  const location = useLocation();
  const isSystemRoute = location.pathname.startsWith('/system');
  const loadingMessage = useLoadingMessage(location.pathname);

  const hideNav = isSystemRoute
    || location.pathname.startsWith('/management')
    || location.pathname.startsWith('/teacher')
    || location.pathname.startsWith('/student-dashboard')
    || location.pathname.startsWith('/assignments')
    || location.pathname.startsWith('/student/timetable')
    || location.pathname.startsWith('/student/quiz')
    || location.pathname.startsWith('/classroom-chat');

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
          overflowX: 'hidden',
          bgcolor: 'transparent',
        }}
      >
        {/* Suspense shows PageLoader while lazy chunks download */}
        <Suspense fallback={<PageLoader message={loadingMessage} />}>
          <Routes>
            {/* ── Public routes ─────────────────────────────── */}
            <Route path="/"                        element={<HomePage />} />
            <Route path="/apply"                   element={<ApplyPage />} />
            <Route path="/login"                   element={<LoginPage />} />
            <Route path="/admin-login"             element={<LoginPage />} />
            <Route path="/admin"                   element={<AdminPage />} />
            <Route path="/login-applicant"         element={<LoginApplicant />} />
            <Route path="/applicant-dashboard"     element={<ApplicantDashboard />} />
            <Route path="/students"                element={<StudentsPage />} />
            <Route path="/student-dashboard"       element={<StudentDashboard />} />
            <Route path="/student-login"           element={<StudentLogin />} />
            <Route path="/student/change-password" element={<StudentChangePassword />} />
            <Route path="/assignments/:id"         element={<AssignmentDetail />} />
            <Route path="/student/timetable"       element={<StudentTimetable />} />
            <Route path="/student/quiz/:id"        element={<StudentQuizAttempt />} />
            <Route path="/classroom-chat/:classId" element={<ClassroomChat />} />
            <Route path="/setup"                   element={<SchoolSetupPage />} />
            <Route path="/timetable"               element={<TimetablePage />} />
            <Route path="/teacher-login"           element={<TeacherLoginPage />} />
            <Route path="/teacher/dashboard"       element={<TeacherDashboard />} />
            <Route path="/teacher/gradebook/:classId" element={<TeacherGradebook />} />
            <Route path="/management"              element={<ManagementDashboard />} />

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

            {/* ── 404 fallback ───────────────────────────────── */}
            <Route path="*" element={
              <Box sx={{
                minHeight:'60vh', display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'center', gap:2, p:3, textAlign:'center',
              }}>
                <Typography sx={{ fontSize:'4rem' }}>🔍</Typography>
                <Typography sx={{ fontWeight:800, fontSize:'1.3rem', color:'#1A3557', fontFamily:'"IBM Plex Sans",sans-serif' }}>
                  Page not found
                </Typography>
                <Typography sx={{ color:'#6B7C93', fontFamily:'"IBM Plex Sans",sans-serif' }}>
                  The page you're looking for doesn't exist.
                </Typography>
                <Button variant="contained" onClick={()=>window.location.href='/'}
                  sx={{ background:'#1A3557', textTransform:'none', fontWeight:700, boxShadow:'none', fontFamily:'"IBM Plex Sans",sans-serif', '&:hover':{ background:'#122740' } }}>
                  Go Home
                </Button>
              </Box>
            } />
          </Routes>
        </Suspense>
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────
//  APP ROOT
// ─────────────────────────────────────────────────────────────
function App() {
  const theme = useMemo(() => createTheme({
    palette: {
      mode: 'light',
      primary:   { main: '#1976d2' },
      secondary: { main: '#dc004e' },
      background: { default: '#ffffff', paper: '#ffffff' },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
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
      {/* ErrorBoundary wraps everything — catches any unhandled error anywhere in the app */}
      <ErrorBoundary>
        <Router>
          <AppShell />
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;