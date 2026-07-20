import API_BASE from '../config';
import React, { useEffect, useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Button, Box, Dialog, DialogTitle, DialogContent,
  DialogActions, Divider, Chip, CircularProgress, Snackbar, Checkbox,
  Grid, Card, CardContent, Accordion, AccordionSummary, AccordionDetails,
  Stack, IconButton, Tooltip, ToggleButton, ToggleButtonGroup, Container,
  Avatar, FormControlLabel, Switch,
} from '@mui/material';
import MuiAlert from '@mui/material/Alert';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import RestoreIcon from '@mui/icons-material/Restore';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined';
import ViewModuleOutlinedIcon from '@mui/icons-material/ViewModuleOutlined';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import DashboardIcon from '@mui/icons-material/Dashboard';

/* ─── Excel-style design tokens (mirrors StudentsPage) ───────────────── */
const T = {
  brand:    '#1A3557',
  accent:   '#2E7D32',
  border:   '#D0D7DE',
  headerBg: '#F0F4F8',
  rowHover: '#F0F5FF',
  rowAlt:   '#FAFBFC',
  text:     '#1A2332',
  muted:    '#6B7C93',
  white:    '#FFFFFF',
};

/* Shared cell styles — same pattern as StudentsPage headCell / bodyCell */
const headCell = {
  backgroundColor: T.headerBg,
  color: T.brand,
  fontWeight: 700,
  fontSize: '0.75rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  borderBottom: `2px solid ${T.brand}`,
  borderRight: `1px solid ${T.border}`,
  borderTop: `1px solid ${T.border}`,
  padding: '10px 14px',
  whiteSpace: 'nowrap',
  fontFamily: "'IBM Plex Sans', sans-serif",
  lineHeight: 1.3,
};
const headCellLast = { ...headCell, borderRight: 'none' };

const bodyCell = {
  fontSize: '0.855rem',
  color: T.text,
  borderBottom: `1px solid ${T.border}`,
  borderRight: `1px solid ${T.border}`,
  padding: '9px 14px',
  fontFamily: "'IBM Plex Sans', sans-serif",
  lineHeight: 1.4,
};
const bodyCellLast = { ...bodyCell, borderRight: 'none' };

const PAGE_SIZE = 9;

/* Inline status badge — styled like a compact coloured tag */
const StatusBadge = ({ status }) => {
  const s = (status || 'pending').toLowerCase();
  const map = {
    approved: { bg: '#E8F5E9', color: '#1B5E20', border: '#A5D6A7' },
    rejected: { bg: '#FFEBEE', color: '#B71C1C', border: '#EF9A9A' },
    pending:  { bg: '#FFF8E1', color: '#E65100', border: '#FFE082' },
  };
  const st = map[s] || map.pending;
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      px: 1.25, py: 0.3, borderRadius: '4px',
      border: `1px solid ${st.border}`, bgcolor: st.bg, minWidth: 76,
    }}>
      <Typography sx={{
        fontSize: '0.72rem', fontWeight: 700, color: st.color,
        textTransform: 'capitalize', fontFamily: "'IBM Plex Sans', sans-serif",
        letterSpacing: '0.03em',
      }}>
        {s}
      </Typography>
    </Box>
  );
};

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

/* ─── MUI theme (dialogs + grouped view still use it) ────────────────── */
const professionalTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2563eb', dark: '#1d4ed8', light: '#3b82f6' },
    success: { main: '#16a34a', light: '#dcfce7', dark: '#15803d' },
    warning: { main: '#f59e0b', light: '#fef3c7', dark: '#b45309' },
    error:   { main: '#dc2626', light: '#fee2e2', dark: '#b91c1c' },
    background: { default: '#F0F4F8', paper: '#ffffff' },
    text: { primary: '#0f172a', secondary: '#64748b' },
    divider: '#e2e8f0',
  },
  typography: {
    fontFamily: '"IBM Plex Sans","Inter","Roboto","Helvetica","Arial",sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    subtitle2: { fontWeight: 600, color: '#64748b' },
    body2: { color: '#475569' },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { textTransform: 'none', fontWeight: 600, borderRadius: 8 } },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
          borderRadius: 12,
        },
      },
    },
    MuiPaper:  { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiChip:   { styleOverrides: { root: { fontWeight: 600, borderRadius: 6 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 14 } } },
  },
});

/* ─── Stat card ──────────────────────────────────────────────────────── */
const StatCard = ({ icon, label, value, color = 'primary.main', bg = '#eff6ff', subtitle }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Avatar variant="rounded" sx={{ bgcolor: bg, color, width: 44, height: 44, borderRadius: 2 }}>
          {icon}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, fontSize: '0.68rem' }}>
            {label}
          </Typography>
          <Typography variant="h5" sx={{ lineHeight: 1.2, mt: 0.25 }}>{value}</Typography>
        </Box>
      </Stack>
      {subtitle && <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed #e2e8f0' }}>{subtitle}</Box>}
    </CardContent>
  </Card>
);

/* ═══════════════════════════════════════════════════════════════════════ */
const AdminPage = () => {
  const [applications, setApplications]             = useState([]);
  const [loading, setLoading]                       = useState(false);
  const [page, setPage]                             = useState(1);
  const [selectedApp, setSelectedApp]               = useState(null);
  const [dialogOpen, setDialogOpen]                 = useState(false);
  const [snackbar, setSnackbar]                     = useState({ open: false, message: '', severity: 'success' });
  const [selectedIds, setSelectedIds]               = useState([]);
  const [bulkMode, setBulkMode]                     = useState(false);
  const [viewMode, setViewMode]                     = useState('table');
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument]     = useState(null);
  const [docPreviewUrl, setDocPreviewUrl]           = useState(null);
  const [docPreviewLoading, setDocPreviewLoading]   = useState(false);
  const [selectedGrade, setSelectedGrade]           = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen]   = useState(false);
  const [deleteTarget, setDeleteTarget]             = useState(null); // { type: 'selected'|'all'|'one', ids: [], label: '' }
  const [deleteLoading, setDeleteLoading]           = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = sessionStorage.getItem('adminToken');
    if (!token) navigate('/login');
  }, [navigate]);

  const fetchApplications = () => {
    setLoading(true);
    const token = sessionStorage.getItem('adminToken');
    fetch(`${API_BASE}/api/applications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setApplications(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchApplications(); }, []);

  const adminSchool = sessionStorage.getItem('adminSchool');

  /* ── Derived data ───────────────────────────────────────────────────── */
  const filteredApps = applications.filter(app => app.status !== 'accepted');

  const stats = useMemo(() => {
    const total = applications.length;
    const byGrade = {};
    const byStatus = { pending: 0, approved: 0, rejected: 0 };
    const bySubject = { Physics: 0, Commerce: 0, Humanities: 0 };
    applications.forEach(app => {
      byGrade[app.grade] = (byGrade[app.grade] || 0) + 1;
      const k = (app.status || 'pending').toLowerCase();
      byStatus[k] = (byStatus[k] || 0) + 1;
      if (app.subject && Object.prototype.hasOwnProperty.call(bySubject, app.subject))
        bySubject[app.subject] = (bySubject[app.subject] || 0) + 1;
    });
    return { total, byGrade, byStatus, bySubject };
  }, [applications]);

  const groupedApplications = useMemo(() => {
    const grouped = {};
    filteredApps.forEach(app => {
      const grade = app.grade || 'Unknown Grade';
      if (!grouped[grade]) grouped[grade] = [];
      grouped[grade].push(app);
    });
    return grouped;
  }, [filteredApps]);

  const filteredGrades = Object.keys(groupedApplications).sort();

  useEffect(() => {
    if (filteredGrades.length === 0) { setSelectedGrade(null); return; }
    if (!selectedGrade || !filteredGrades.includes(selectedGrade))
      setSelectedGrade(filteredGrades[0]);
  }, [filteredGrades]);

  const selectedGradeApps = selectedGrade ? (groupedApplications[selectedGrade] || []) : [];

  const totalPages    = Math.ceil(filteredApps.length / PAGE_SIZE) || 1;
  const paginatedApps = filteredApps.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ── Handlers ───────────────────────────────────────────────────────── */
  const handleSelectAll = e => {
    if (e.target.checked) setSelectedIds(selectedGradeApps.map(a => a.id));
    else setSelectedIds([]);
  };
  const handleSelectOne = id =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const updateStatus = async (id, status, silent) => {
    let comment = '';
    if (!silent && (status === 'approved' || status === 'rejected')) {
      comment = window.prompt('Enter a comment for this action (optional):', '');
      if (comment === null) return;
    }
    try {
      const token = sessionStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE}/api/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, comment }),
      });
      if (dialogOpen) { setDialogOpen(false); setSelectedApp(null); }
      if (!silent) await fetchApplications();
      if (!silent && res.ok)  setSnackbar({ open: true, message: `Application ${status}`, severity: 'success' });
      else if (!silent)       setSnackbar({ open: true, message: 'Failed to update application', severity: 'error' });
    } catch {
      if (!silent) setSnackbar({ open: true, message: 'Network error', severity: 'error' });
    }
  };

  const handleBulkAction = async status => {
    for (const id of selectedIds) await updateStatus(id, status, true);
    setSnackbar({ open: true, message: `Bulk ${status} complete`, severity: 'success' });
    setSelectedIds([]);
    await fetchApplications();
  };

  const confirmDelete = (type, ids = []) => {
    const label = type === 'all'
      ? `all ${applications.length} application${applications.length !== 1 ? 's' : ''}`
      : type === 'one'
      ? '1 application'
      : `${ids.length} selected application${ids.length !== 1 ? 's' : ''}`;
    setDeleteTarget({ type, ids, label });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const token = sessionStorage.getItem('adminToken');
    try {
      let res;
      if (deleteTarget.type === 'one') {
        res = await fetch(
          `${API_BASE}/api/applications/${deleteTarget.ids[0]}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        res = await fetch(
          `${API_BASE}/api/applications`,
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ids: deleteTarget.type === 'all' ? 'all' : deleteTarget.ids }),
          }
        );
      }
      const data = await res.json();
      if (data.success) {
        const count = data.deleted ?? 1;
        setSnackbar({ open: true, message: `${count} application${count !== 1 ? 's' : ''} deleted.`, severity: 'success' });
        setSelectedIds([]);
        setDeleteConfirmOpen(false);
        setDeleteTarget(null);
        await fetchApplications();
      } else {
        setSnackbar({ open: true, message: 'Failed to delete applications.', severity: 'error' });
      }
    } catch {
      setSnackbar({ open: true, message: 'Network error.', severity: 'error' });
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => { setPage(1); if (!bulkMode) setSelectedIds([]); }, [bulkMode]);

  const handleRowClick       = app => { setSelectedApp(app); setDialogOpen(true); };
  const handleDialogClose    = () => { setDialogOpen(false); setSelectedApp(null); };
  const handleSnackbarClose  = () => setSnackbar(s => ({ ...s, open: false }));
  const handleViewDocument = async (doc) => {
    setSelectedDocument(doc);
    setDocPreviewUrl(null);
    setDocumentViewerOpen(true);
    if (!doc.filename) return;
    setDocPreviewLoading(true);
    const token = sessionStorage.getItem('adminToken');
    try {
      const res = await fetch(
        `${API_BASE}/api/documents/${doc.filename}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed');
      const blob = await res.blob();
      setDocPreviewUrl(URL.createObjectURL(blob));
    } catch {
      setSnackbar({ open: true, message: 'Could not load document preview.', severity: 'error' });
    } finally {
      setDocPreviewLoading(false);
    }
  };
  const handleCloseDocViewer = () => {
    setDocumentViewerOpen(false);
    setSelectedDocument(null);
    if (docPreviewUrl) { URL.revokeObjectURL(docPreviewUrl); setDocPreviewUrl(null); }
  };

  const openDocument = async (filename, download = false) => {
    const token = sessionStorage.getItem('adminToken');
    try {
      const res = await fetch(
        `${API_BASE}/api/documents/${filename}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      if (download) {
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
      } else {
        window.open(url, '_blank');
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setSnackbar({ open: true, message: 'Could not open document. Please try again.', severity: 'error' });
    }
  };

  const getDocumentTypeName = type => {
    if (!type) return 'Unknown Document';
    if (type.startsWith('schoolForm_')) return `School Form — ${type.replace('schoolForm_', '')}`;
    const map = { id: 'South African ID Copy', parentId: 'Parent / Guardian ID Copy', removal: 'School Removal Letter', gradeResult: 'Previous Grade Result', gradeReport: 'Grade Report', additional: 'Additional Document' };
    return map[type] || type;
  };
  const getDocumentIcon = type => {
    if (!type) return 'DOC';
    if (type.startsWith('schoolForm_')) return 'SCH';
    return ({ id: 'ID', parentId: 'PID', removal: 'REM', gradeResult: 'GRD', gradeReport: 'RPT', additional: 'ADD' })[type] || 'DOC';
  };
  const getDocumentFilename = doc  => doc.filename || doc.originalname || doc.name || 'File not available';

  const handleExportCSV = () => {
    const rows = paginatedApps.map(app => ({
      'First Name': app.firstName || '', 'Last Name': app.lastName || '',
      'Date of Birth': app.dateOfBirth || '', 'Email': app.email || '',
      'Phone': app.phone || '', 'Address': app.address || '', 'City': app.city || '',
      'Parent Name': app.parentName || '', 'Parent Phone': app.parentPhone || '',
      'Parent Email': app.parentEmail || '', 'Parent Occupation': app.parentOccupation || '',
      'Relationship': app.relationship || '', 'School': app.school || '',
      'Grade': app.grade || '', 'Subject Stream': app.subject || 'N/A',
      'Previous School': app.previousSchool || '', 'Achievements': app.achievements || '',
      'Why Attend': app.whyAttend || '', 'Emergency Contact': app.emergencyContact || '',
      'Emergency Phone': app.emergencyPhone || '', 'Status': app.status || 'pending',
      'Submitted At': app.submittedAt ? new Date(app.submittedAt).toLocaleString() : '',
      'Documents': Array.isArray(app.documents) ? app.documents.map(d => d.type || 'unknown').join(', ') : 'None',
      'Document Count': app.documentCount || 0, 'Comment': app.comment || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] || {}).map(key => ({
      wch: Math.max(key.length, ...rows.map(r => String(r[key] || '').length), 10),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Applications');
    XLSX.writeFile(wb, `applications_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  /* ── Small icon action buttons (Excel-toolbar style) ─────────────── */
  const ActionButtons = ({ app }) => (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
      <Tooltip title="Approve">
        <span>
          <IconButton
            className="action-btn" size="small"
            disabled={app.status === 'approved'}
            onClick={e => { e.stopPropagation(); updateStatus(app.id, 'approved'); }}
            sx={{
              width: 28, height: 28, borderRadius: '4px',
              bgcolor: app.status === 'approved' ? '#F1F5F9' : '#E8F5E9',
              color:  app.status === 'approved' ? '#CBD5E1'  : '#2E7D32',
              border: `1px solid ${app.status === 'approved' ? '#E2E8F0' : '#A5D6A7'}`,
              '&:hover': { bgcolor: '#2E7D32', color: '#fff', borderColor: '#2E7D32' },
            }}
          >
            <CheckCircleOutlineIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Reject">
        <span>
          <IconButton
            className="action-btn" size="small"
            disabled={app.status === 'rejected'}
            onClick={e => { e.stopPropagation(); updateStatus(app.id, 'rejected'); }}
            sx={{
              width: 28, height: 28, borderRadius: '4px',
              bgcolor: app.status === 'rejected' ? '#F1F5F9' : '#FFEBEE',
              color:  app.status === 'rejected' ? '#CBD5E1'  : '#C62828',
              border: `1px solid ${app.status === 'rejected' ? '#E2E8F0' : '#EF9A9A'}`,
              '&:hover': { bgcolor: '#C62828', color: '#fff', borderColor: '#C62828' },
            }}
          >
            <CancelOutlinedIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Reset to Pending">
        <span>
          <IconButton
            className="action-btn" size="small"
            disabled={!app.status || app.status === 'pending'}
            onClick={e => { e.stopPropagation(); updateStatus(app.id, 'pending'); }}
            sx={{
              width: 28, height: 28, borderRadius: '4px',
              bgcolor: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0',
              '&:hover': { bgcolor: '#E2E8F0', color: T.brand },
              '&.Mui-disabled': { bgcolor: '#F8FAFC', color: '#CBD5E1', borderColor: '#F1F5F9' },
            }}
          >
            <RestoreIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton
          className="action-btn" size="small"
          onClick={e => { e.stopPropagation(); confirmDelete('one', [app.id]); }}
          sx={{
            width: 28, height: 28, borderRadius: '4px',
            bgcolor: '#FFF1F2', color: '#B91C1C', border: '1px solid #FECDD3',
            '&:hover': { bgcolor: '#B91C1C', color: '#fff', borderColor: '#B91C1C' },
          }}
        >
          <DeleteOutlineIcon sx={{ fontSize: 15 }} />
        </IconButton>
      </Tooltip>
    </Stack>
  );

  const PaginationControls = () => (
    <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1.5} sx={{ mt: 2 }}>
      <Typography variant="body2" color="text.secondary">Page <b>{page}</b> of <b>{totalPages}</b></Typography>
      <Button variant="outlined" size="small" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
      <Button variant="outlined" size="small" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
    </Stack>
  );

  /* ═══════════════════════════════════════════════════════════════════ */
  return (
    <ThemeProvider theme={professionalTheme}>
      <CssBaseline />
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      <Box sx={{ bgcolor: '#F0F4F8', minHeight: '100vh', fontFamily: "'IBM Plex Sans', sans-serif" }}>

        {/* ── Top nav bar ─────────────────────────────────────────────── */}
        <Box sx={{
          background: T.brand, px: '32px', height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1rem', letterSpacing: '0.04em', fontFamily: "'IBM Plex Sans', sans-serif" }}>
            📋 APPLICATIONS PORTAL
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', fontFamily: "'IBM Plex Sans', sans-serif" }}>
            Admin Portal
          </Typography>
        </Box>

        <Container maxWidth="100%" sx={{ py: 4 }}>

          {/* ── Page title ──────────────────────────────────────────────── */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: '1.6rem', color: T.text, fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1.2 }}>
                Applications
              </Typography>
              <Typography sx={{ color: T.muted, fontSize: '0.875rem', mt: 0.5, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                Review, approve, and manage incoming student applications.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              {adminSchool && (
                <Chip
                  icon={<SchoolOutlinedIcon />}
                  label={adminSchool}
                  variant="outlined"
                  sx={{ bgcolor: T.white, borderColor: T.border, fontFamily: "'IBM Plex Sans', sans-serif", '& .MuiChip-icon': { color: T.brand } }}
                />
              )}
              <Button
                variant="outlined"
                startIcon={<PeopleAltOutlinedIcon />}
                onClick={() => navigate('/students')}
                sx={{ borderColor: T.brand, color: T.brand, fontFamily: "'IBM Plex Sans', sans-serif", '&:hover': { bgcolor: '#EEF2FF', borderColor: T.brand } }}
              >
                Students accepted offer
              </Button>
              <Button
                variant="contained"
                startIcon={<DashboardIcon />}
                onClick={() => navigate('/management')}
                sx={{
                  background: '#1A3557', color: '#fff', fontWeight: 700,
                  textTransform: 'none', boxShadow: 'none',
                  '&:hover': { background: '#122740', boxShadow: 'none' },
                }}
              >
                Management Dashboard
              </Button>
            </Stack>
          </Box>

          {/* ── Toolbar ─────────────────────────────────────────────────── */}
          <Box sx={{
            background: T.white, border: `1px solid ${T.border}`, borderRadius: '8px',
            p: '12px 18px', mb: 2.5, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
              <ToggleButtonGroup
                value={viewMode} exclusive size="small"
                onChange={(_, val) => { if (val) setViewMode(val); }}
                sx={{
                  '& .MuiToggleButton-root': {
                    textTransform: 'none', fontWeight: 600,
                    fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.8rem',
                    px: 2, py: 0.75, border: `1px solid ${T.border}`, color: T.muted,
                    '&.Mui-selected': {
                      bgcolor: T.brand, color: T.white, borderColor: T.brand,
                      '&:hover': { bgcolor: '#122740' },
                    },
                  },
                }}
              >
                <ToggleButton value="table"><TableRowsOutlinedIcon sx={{ fontSize: 16, mr: 0.75 }} />Table</ToggleButton>
                <ToggleButton value="grouped"><ViewModuleOutlinedIcon sx={{ fontSize: 16, mr: 0.75 }} />Grouped</ToggleButton>
              </ToggleButtonGroup>

              <FormControlLabel
                control={<Switch checked={bulkMode} onChange={e => setBulkMode(e.target.checked)} size="small" inputProps={{ id: 'bulk-select', name: 'bulk-select' }}/>}
                label={<Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: T.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>Bulk select</Typography>}
              />
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              {bulkMode && selectedIds.length > 0 && (
                <>
                  <Chip
                    label={`${selectedIds.length} selected`} size="small"
                    sx={{ bgcolor: '#EEF2FF', color: T.brand, fontWeight: 700, fontFamily: "'IBM Plex Sans', sans-serif" }}
                  />
                  <Button
                    size="small" variant="contained"
                    startIcon={<CheckCircleOutlineIcon />}
                    onClick={() => handleBulkAction('approved')}
                    sx={{ bgcolor: '#2E7D32', '&:hover': { bgcolor: '#1B5E20' }, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.8rem' }}
                  >
                    Approve All
                  </Button>
                  <Button
                    size="small" variant="contained" color="error"
                    startIcon={<CancelOutlinedIcon />}
                    onClick={() => handleBulkAction('rejected')}
                    sx={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.8rem' }}
                  >
                    Reject All
                  </Button>
                  <Button
                    size="small" variant="contained"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={() => confirmDelete('selected', selectedIds)}
                    sx={{ bgcolor: '#B91C1C', '&:hover': { bgcolor: '#991B1B' }, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.8rem' }}
                  >
                    Delete Selected
                  </Button>
                </>
              )}
              <Button
                variant="outlined"
                startIcon={<DeleteOutlineIcon />}
                onClick={() => confirmDelete('all')}
                disabled={applications.length === 0}
                sx={{
                  borderColor: '#FECDD3', color: '#B91C1C', fontWeight: 700, fontSize: '0.82rem',
                  textTransform: 'none', borderRadius: '6px', px: '16px', py: '9px',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  '&:hover': { bgcolor: '#FFF1F2', borderColor: '#B91C1C' },
                  '&.Mui-disabled': { borderColor: '#E2E8F0', color: T.muted },
                }}
              >
                Delete All
              </Button>
              <Button
                variant="contained"
                startIcon={<FileDownloadOutlinedIcon />}
                onClick={handleExportCSV}
                disabled={paginatedApps.length === 0}
                sx={{
                  bgcolor: T.accent, color: T.white, fontWeight: 700, fontSize: '0.82rem',
                  textTransform: 'none', borderRadius: '6px', px: '20px', py: '9px',
                  boxShadow: 'none', fontFamily: "'IBM Plex Sans', sans-serif",
                  '&:hover': { bgcolor: '#1B5E20', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
                  '&.Mui-disabled': { bgcolor: '#E2E8F0', color: T.muted },
                }}
              >
                Export to Excel
              </Button>
            </Stack>
          </Box>

          {/* ══ TABLE VIEW ══════════════════════════════════════════════ */}
          {viewMode === 'table' ? (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>

              {/* ── Grade sidebar ────────────────────────────────────── */}
              {filteredGrades.length > 0 && (
                <Box sx={{ width: 250, minWidth: 210, flexShrink: 0 }}>
                  <Box sx={{
                    background: T.white, border: `1px solid ${T.border}`,
                    borderRadius: '8px', p: 1.5,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}>
                    <Typography sx={{
                      display: 'block', fontWeight: 700, color: T.brand,
                      textTransform: 'uppercase', letterSpacing: '0.07em',
                      fontSize: '0.72rem', px: 1, mb: 1,
                      fontFamily: "'IBM Plex Sans', sans-serif",
                    }}>
                      Grades
                    </Typography>
                    <Divider sx={{ mb: 1, borderColor: T.border }} />
                    <Stack spacing={0.5}>
                      {filteredGrades.map(g => (
                        <Button
                          key={g}
                          onClick={() => setSelectedGrade(g)}
                          disableElevation
                          sx={{
                            justifyContent: 'space-between', textTransform: 'none',
                            borderRadius: '6px', px: 1.5, py: 0.9,
                            fontFamily: "'IBM Plex Sans', sans-serif",
                            background: g === selectedGrade ? T.brand : 'transparent',
                            color: g === selectedGrade ? T.white : T.text,
                            '&:hover': { background: g === selectedGrade ? '#122740' : '#E8EEF5' },
                          }}
                        >
                          <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                            {g}
                          </Typography>
                          <Chip
                            label={groupedApplications[g]?.length ?? 0}
                            size="small"
                            sx={{
                              height: 20, fontSize: '0.7rem', fontWeight: 700,
                              pointerEvents: 'none',
                              bgcolor: g === selectedGrade ? 'rgba(255,255,255,0.2)' : '#E8F5E9',
                              color:  g === selectedGrade ? T.white : '#2E7D32',
                              fontFamily: "'IBM Plex Sans', sans-serif",
                            }}
                          />
                        </Button>
                      ))}
                    </Stack>
                  </Box>
                </Box>
              )}

              {/* ── Table panel ──────────────────────────────────────── */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{
                  background: T.white, border: `1px solid ${T.border}`,
                  borderRadius: '8px', overflow: 'hidden',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}>

                  {/* Grade header strip */}
                  {selectedGrade && (
                    <Box sx={{
                      px: 2.5, py: 1.4,
                      background: T.headerBg,
                      borderBottom: `2px solid ${T.brand}`,
                      display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
                    }}>
                      <SchoolOutlinedIcon sx={{ color: T.brand, fontSize: 18 }} />
                      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: T.brand, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                        {selectedGrade}
                      </Typography>
                      <Chip
                        label={`${selectedGradeApps.length} application${selectedGradeApps.length !== 1 ? 's' : ''}`}
                        size="small"
                        sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 700, fontSize: '0.72rem', height: 20, fontFamily: "'IBM Plex Sans', sans-serif" }}
                      />
                      {/* Status breakdown pills */}
                      <Box sx={{ ml: 'auto', display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                        {[
                          { label: 'Pending',  bg: '#FFF8E1', color: '#E65100', border: '#FFE082', count: selectedGradeApps.filter(a => !a.status || a.status === 'pending').length },
                          { label: 'Approved', bg: '#E8F5E9', color: '#1B5E20', border: '#A5D6A7', count: selectedGradeApps.filter(a => a.status === 'approved').length },
                          { label: 'Rejected', bg: '#FFEBEE', color: '#B71C1C', border: '#EF9A9A', count: selectedGradeApps.filter(a => a.status === 'rejected').length },
                        ].map(s => (
                          <Box key={s.label} sx={{
                            display: 'inline-flex', alignItems: 'center', gap: 0.5,
                            px: 1, py: 0.25, borderRadius: '4px',
                            bgcolor: s.bg, border: `1px solid ${s.border}`,
                          }}>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: s.color, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                              {s.label} {s.count}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 240 }}>
                      <CircularProgress sx={{ color: T.brand }} />
                    </Box>
                  ) : (
                    <TableContainer sx={{ maxHeight: 620, overflowX: 'auto' }}>
                      <Table size="small" stickyHeader sx={{ borderCollapse: 'collapse', minWidth: 860 }}>

                        <TableHead>
                          <TableRow>
                            {bulkMode && (
                              <TableCell sx={{ ...headCell, width: 44, textAlign: 'center' }}>
                                <Checkbox
                                  indeterminate={selectedIds.length > 0 && selectedIds.length < selectedGradeApps.length}
                                  checked={selectedGradeApps.length > 0 && selectedIds.length === selectedGradeApps.length}
                                  onChange={handleSelectAll} size="small"
                                  inputProps={{ id: 'select-all', name: 'select-all' }}
                                  sx={{ color: T.brand, '&.Mui-checked': { color: T.brand } }}
                                />
                              </TableCell>
                            )}
                            <TableCell sx={{ ...headCell, width: 40, textAlign: 'center' }}>#</TableCell>
                            <TableCell sx={headCell}>Full Name</TableCell>
                            <TableCell sx={headCell}>Email</TableCell>
                            <TableCell sx={headCell}>School</TableCell>
                            <TableCell sx={headCell}>Subject Stream</TableCell>
                            <TableCell sx={headCell}>Status</TableCell>
                            <TableCell sx={headCell}>Submitted</TableCell>
                            <TableCell sx={{ ...headCellLast, textAlign: 'right' }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>

                        <TableBody>
                          {selectedGradeApps.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={bulkMode ? 9 : 8}
                                align="center"
                                sx={{ ...bodyCell, borderRight: 'none', py: 6 }}
                              >
                                <Stack alignItems="center" spacing={1}>
                                  <DescriptionOutlinedIcon sx={{ fontSize: 40, color: T.muted, opacity: 0.4 }} />
                                  <Typography sx={{ color: T.muted, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.9rem' }}>
                                    No applications for this grade.
                                  </Typography>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ) : (
                            selectedGradeApps.map((app, idx) => (
                              <TableRow
                                key={app.id}
                                onClick={e => { if (e.target.closest('.action-btn')) return; handleRowClick(app); }}
                                sx={{
                                  backgroundColor: idx % 2 === 0 ? T.white : T.rowAlt,
                                  cursor: 'pointer',
                                  '&:hover': { backgroundColor: T.rowHover },
                                  transition: 'background 0.1s',
                                }}
                              >
                                {bulkMode && (
                                  <TableCell sx={{ ...bodyCell, width: 44, textAlign: 'center' }}>
                                    <Checkbox
                                      checked={selectedIds.includes(app.id)}
                                      onChange={() => handleSelectOne(app.id)}
                                      onClick={e => e.stopPropagation()} size="small"
                                      inputProps={{ id: `select-${app.id}`, name: `select-${app.id}` }}
                                      sx={{ color: T.brand, '&.Mui-checked': { color: T.brand } }}
                                    />
                                  </TableCell>
                                )}
                                {/* Row number */}
                                <TableCell sx={{ ...bodyCell, color: T.muted, textAlign: 'center', fontSize: '0.78rem', width: 40 }}>
                                  {idx + 1}
                                </TableCell>
                                {/* Full name */}
                                <TableCell sx={{ ...bodyCell, fontWeight: 600 }}>
                                  {app.firstName ? `${app.firstName} ${app.lastName}` : (app.name || '—')}
                                </TableCell>
                                {/* Email */}
                                <TableCell sx={{ ...bodyCell, color: '#1565C0' }}>
                                  {app.email || '—'}
                                </TableCell>
                                {/* School */}
                                <TableCell sx={bodyCell}>{app.school || '—'}</TableCell>
                                {/* Subject stream */}
                                <TableCell sx={bodyCell}>
                                  {app.subject ? (
                                    <Chip
                                      label={app.subject} size="small"
                                      sx={{ bgcolor: '#EEF2FF', color: '#3730A3', fontWeight: 600, fontSize: '0.72rem', height: 22, fontFamily: "'IBM Plex Sans', sans-serif" }}
                                    />
                                  ) : (
                                    <Typography sx={{ fontSize: '0.82rem', color: T.muted, fontStyle: 'italic', fontFamily: "'IBM Plex Sans', sans-serif" }}>N/A</Typography>
                                  )}
                                </TableCell>
                                {/* Status */}
                                <TableCell sx={bodyCell}><StatusBadge status={app.status} /></TableCell>
                                {/* Submitted date */}
                                <TableCell sx={{ ...bodyCell, color: T.muted, fontSize: '0.8rem' }}>
                                  {app.submittedAt
                                    ? new Date(app.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                    : '—'}
                                </TableCell>
                                {/* Actions */}
                                <TableCell sx={bodyCellLast}><ActionButtons app={app} /></TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              </Box>
            </Box>

          ) : (
            /* ══ GROUPED VIEW ══════════════════════════════════════════ */
            <Box>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 240 }}>
                  <CircularProgress sx={{ color: T.brand }} />
                </Box>
              ) : Object.keys(groupedApplications).length === 0 ? (
                <Box sx={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: '8px', py: 6, textAlign: 'center' }}>
                  <Typography sx={{ color: T.muted, fontFamily: "'IBM Plex Sans', sans-serif" }}>No applications found.</Typography>
                </Box>
              ) : (
                Object.entries(groupedApplications).map(([grade, apps]) => (
                  <Accordion
                    key={grade}
                    defaultExpanded
                    sx={{
                      mb: 1.5, border: `1px solid ${T.border}`,
                      borderRadius: '8px !important', boxShadow: 'none',
                      '&:before': { display: 'none' }, overflow: 'hidden',
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{ bgcolor: T.headerBg, '& .MuiAccordionSummary-content': { my: 1.25 } }}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%', pr: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1.25}>
                          <Avatar sx={{ bgcolor: T.brand, width: 32, height: 32, fontSize: '0.8rem' }}>{apps.length}</Avatar>
                          <Typography sx={{ fontWeight: 700, color: T.brand, fontFamily: "'IBM Plex Sans', sans-serif" }}>{grade}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.75} flexWrap="wrap">
                          <Chip label={`Pending ${apps.filter(a => a.status === 'pending').length}`}  color="warning" size="small" variant="outlined" />
                          <Chip label={`Approved ${apps.filter(a => a.status === 'approved').length}`} color="success" size="small" variant="outlined" />
                          <Chip label={`Rejected ${apps.filter(a => a.status === 'rejected').length}`} color="error"   size="small" variant="outlined" />
                        </Stack>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                      <TableContainer>
                        <Table size="small" sx={{ borderCollapse: 'collapse' }}>
                          <TableHead>
                            <TableRow>
                              {['#', 'Name', 'School', 'Status', 'Subject', 'Documents', 'Submitted'].map(h => (
                                <TableCell key={h} sx={headCell}>{h}</TableCell>
                              ))}
                              <TableCell sx={headCellLast}>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {apps.map((app, idx) => (
                              <TableRow
                                key={app.id}
                                hover
                                sx={{
                                  cursor: 'pointer',
                                  backgroundColor: idx % 2 === 0 ? T.white : T.rowAlt,
                                  '&:hover': { backgroundColor: T.rowHover },
                                  transition: 'background 0.1s',
                                }}
                                onClick={e => { if (e.target.closest('.action-btn')) return; handleRowClick(app); }}
                              >
                                <TableCell sx={{ ...bodyCell, color: T.muted, textAlign: 'center', width: 40, fontSize: '0.78rem' }}>{idx + 1}</TableCell>
                                <TableCell sx={{ ...bodyCell, fontWeight: 600 }}>
                                  {app.firstName ? `${app.firstName} ${app.lastName}` : (app.name || '')}
                                </TableCell>
                                <TableCell sx={bodyCell}>{app.school}</TableCell>
                                <TableCell sx={bodyCell}><StatusBadge status={app.status} /></TableCell>
                                <TableCell sx={bodyCell}>
                                  {app.subject ? (
                                    <Chip label={app.subject} size="small" sx={{ bgcolor: '#EEF2FF', color: '#3730A3', fontWeight: 600, fontSize: '0.72rem', height: 22 }} />
                                  ) : (
                                    <Typography sx={{ fontSize: '0.82rem', color: T.muted, fontStyle: 'italic' }}>N/A</Typography>
                                  )}
                                </TableCell>
                                <TableCell sx={bodyCell}>
                                  {app.documents?.length > 0 ? (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                      {app.documents.map((doc, i) => (
                                        <Chip
                                          key={i} label={getDocumentIcon(doc.type)} size="small" variant="outlined"
                                          onClick={e => { e.stopPropagation(); handleViewDocument(doc); }}
                                          sx={{ cursor: 'pointer', fontSize: '0.7rem', height: 20, fontWeight: 700, borderColor: T.border, color: T.brand, '&:hover': { bgcolor: '#EEF2FF', borderColor: T.brand } }}
                                        />
                                      ))}
                                    </Box>
                                  ) : (
                                    <Typography sx={{ fontSize: '0.8rem', color: T.muted }}>None</Typography>
                                  )}
                                </TableCell>
                                <TableCell sx={{ ...bodyCell, color: T.muted, fontSize: '0.8rem' }}>
                                  {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                </TableCell>
                                <TableCell sx={bodyCellLast}><ActionButtons app={app} /></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                ))
              )}
              <PaginationControls />
            </Box>
          )}

        </Container>

        {/* ── Application Details Dialog ──────────────────────────────── */}
        <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
          <DialogTitle sx={{ borderBottom: '1px solid #e2e8f0', pb: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h6">Application Details</Typography>
                {selectedApp && (
                  <Typography variant="body2" color="text.secondary">
                    {selectedApp.firstName} {selectedApp.lastName} · {selectedApp.grade}
                  </Typography>
                )}
              </Box>
              {selectedApp && <StatusBadge status={selectedApp.status} />}
            </Stack>
          </DialogTitle>
          <DialogContent dividers sx={{ bgcolor: '#f8fafc' }}>
            {selectedApp && (
              <Stack spacing={2}>
                <Card><CardContent>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'primary.main' }}>Personal Information</Typography>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={6}><Typography variant="body2"><b>Name:</b> {selectedApp.firstName} {selectedApp.lastName}</Typography></Grid>
                    <Grid item xs={12} sm={6}><Typography variant="body2"><b>DOB:</b> {selectedApp.dateOfBirth}</Typography></Grid>
                    <Grid item xs={12} sm={6}><Typography variant="body2"><b>Email:</b> {selectedApp.email}</Typography></Grid>
                    <Grid item xs={12} sm={6}><Typography variant="body2"><b>Phone:</b> {selectedApp.phone}</Typography></Grid>
                    <Grid item xs={12} sm={6}><Typography variant="body2"><b>Address:</b> {selectedApp.address}</Typography></Grid>
                    <Grid item xs={12} sm={6}><Typography variant="body2"><b>City:</b> {selectedApp.city}</Typography></Grid>
                  </Grid>
                </CardContent></Card>

                <Card><CardContent>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'primary.main' }}>Parent / Guardian</Typography>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={6}><Typography variant="body2"><b>Name:</b> {selectedApp.parentName}</Typography></Grid>
                    <Grid item xs={12} sm={6}><Typography variant="body2"><b>Relationship:</b> {selectedApp.relationship}</Typography></Grid>
                    <Grid item xs={12} sm={6}><Typography variant="body2"><b>Phone:</b> {selectedApp.parentPhone}</Typography></Grid>
                    <Grid item xs={12} sm={6}><Typography variant="body2"><b>Email:</b> {selectedApp.parentEmail}</Typography></Grid>
                    <Grid item xs={12} sm={6}><Typography variant="body2"><b>Occupation:</b> {selectedApp.parentOccupation}</Typography></Grid>
                  </Grid>
                </CardContent></Card>

                <Card><CardContent>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'primary.main' }}>Academic Information</Typography>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={6}><Typography variant="body2"><b>School:</b> {selectedApp.school}</Typography></Grid>
                    <Grid item xs={12} sm={6}><Typography variant="body2"><b>Grade:</b> {selectedApp.grade}</Typography></Grid>
                    <Grid item xs={12} sm={6}><Typography variant="body2"><b>Subject:</b> {selectedApp.subject}</Typography></Grid>
                    <Grid item xs={12} sm={6}><Typography variant="body2"><b>Previous School:</b> {selectedApp.previousSchool}</Typography></Grid>
                    <Grid item xs={12}><Typography variant="body2"><b>Achievements:</b> {selectedApp.achievements}</Typography></Grid>
                    <Grid item xs={12}><Typography variant="body2"><b>Why Attend:</b> {selectedApp.whyAttend}</Typography></Grid>
                  </Grid>
                </CardContent></Card>

                <Card><CardContent>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'primary.main' }}>Emergency Contact</Typography>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={6}><Typography variant="body2"><b>Name:</b> {selectedApp.emergencyContact}</Typography></Grid>
                    <Grid item xs={12} sm={6}><Typography variant="body2"><b>Phone:</b> {selectedApp.emergencyPhone}</Typography></Grid>
                  </Grid>
                </CardContent></Card>

                <Card><CardContent>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'primary.main' }}>Documents</Typography>
                  {selectedApp.documents?.length > 0 ? (
                    <>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Click on any document to view or download it before making a decision.
                      </Typography>
                      <Stack spacing={1.25}>
                        {selectedApp.documents.map((doc, idx) => {
                          const isSchoolForm = doc.type?.startsWith('schoolForm_');
                          return (
                            <Paper key={idx} variant="outlined" sx={{
                              p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              gap: 1.5, flexWrap: 'wrap', transition: '0.15s',
                              borderColor: isSchoolForm ? '#fde68a' : undefined,
                              bgcolor: isSchoolForm ? '#fffbeb' : undefined,
                              borderLeft: isSchoolForm ? '4px solid #e8a020' : undefined,
                              '&:hover': { borderColor: isSchoolForm ? '#d97706' : 'primary.main', bgcolor: isSchoolForm ? '#fef3c7' : '#f8fafc' },
                            }}>
                              <Stack direction="row" alignItems="center" spacing={1.5}>
                                <Avatar variant="rounded" sx={{ bgcolor: isSchoolForm ? '#fef3c7' : '#eff6ff', color: isSchoolForm ? '#92400e' : 'primary.dark', fontSize: '0.72rem', fontWeight: 700, width: 40, height: 40 }}>
                                  {getDocumentIcon(doc.type)}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{getDocumentTypeName(doc.type)}</Typography>
                                  <Typography variant="caption" color="text.secondary">{getDocumentFilename(doc)}</Typography>
                                </Box>
                              </Stack>
                              <Stack direction="row" spacing={0.75}>
                                <Button size="small" variant="outlined" startIcon={<VisibilityIcon />} onClick={() => handleViewDocument(doc)}>View</Button>
                                {doc.filename && (
                                  <Button size="small" variant="contained" startIcon={<DownloadIcon />} onClick={() => openDocument(doc.filename, true)}>Download</Button>
                                )}
                              </Stack>
                            </Paper>
                          );
                        })}
                      </Stack>
                      <Box sx={{ mt: 2, p: 2, bgcolor: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.dark', mb: 0.75 }}>Review Checklist</Typography>
                        <Stack spacing={0.25}>
                          <Typography variant="body2" sx={{ color: 'primary.dark' }}>• Verify all required documents are present and legible</Typography>
                          <Typography variant="body2" sx={{ color: 'primary.dark' }}>• Check Grade Report confirms pass of previous grade</Typography>
                          <Typography variant="body2" sx={{ color: 'primary.dark' }}>• Review academic performance and achievements</Typography>
                          <Typography variant="body2" sx={{ color: 'primary.dark' }}>• Ensure all documents are properly formatted and complete</Typography>
                        </Stack>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
                        Total Documents: {selectedApp.documentCount || selectedApp.documents.length}
                      </Typography>
                    </>
                  ) : (
                    <Typography color="text.secondary">No documents uploaded.</Typography>
                  )}
                </CardContent></Card>

                <Card><CardContent>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={4}><Typography variant="body2"><b>Status:</b> {selectedApp.status}</Typography></Grid>
                    <Grid item xs={12} sm={8}><Typography variant="body2"><b>Comment:</b> {selectedApp.comment || '—'}</Typography></Grid>
                    <Grid item xs={12}><Typography variant="body2" color="text.secondary"><b>Submitted:</b> {new Date(selectedApp.submittedAt).toLocaleString()}</Typography></Grid>
                  </Grid>
                </CardContent></Card>
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            {selectedApp && (
              <>
                <Button color="error" variant="outlined" startIcon={<CancelOutlinedIcon />}       disabled={selectedApp.status === 'rejected'} onClick={() => updateStatus(selectedApp.id, 'rejected')}>Reject</Button>
                <Button color="success" variant="contained" startIcon={<CheckCircleOutlineIcon />} disabled={selectedApp.status === 'approved'} onClick={() => updateStatus(selectedApp.id, 'approved')}>Approve</Button>
              </>
            )}
            <Box sx={{ flexGrow: 1 }} />
            <Button onClick={handleDialogClose} variant="outlined">Close</Button>
          </DialogActions>
        </Dialog>

        {/* Application form require/upload settings moved to System Admin — see SystemSchoolSetup.jsx */}

        {/* ── Document Viewer Dialog ──────────────────────────────────── */}
        <Dialog open={documentViewerOpen} onClose={handleCloseDocViewer} maxWidth="lg" fullWidth
          PaperProps={{ sx: { height: '90vh', display: 'flex', flexDirection: 'column' } }}>
          <DialogTitle sx={{ borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
                  {selectedDocument && getDocumentTypeName(selectedDocument.type)}
                </Typography>
                {selectedDocument && (
                  <Typography variant="caption" color="text.secondary">
                    {getDocumentFilename(selectedDocument)}
                    {selectedDocument.filename && ` · ${selectedDocument.filename.split('.').pop().toUpperCase()}`}
                  </Typography>
                )}
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                {selectedDocument?.filename && (
                  <Button size="small" variant="outlined" startIcon={<DownloadIcon />}
                    onClick={() => openDocument(selectedDocument.filename, true)}>
                    Download
                  </Button>
                )}
                <IconButton onClick={handleCloseDocViewer} size="small"><CancelOutlinedIcon /></IconButton>
              </Stack>
            </Stack>
          </DialogTitle>

          <DialogContent sx={{ p: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {docPreviewLoading && (
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <CircularProgress size={28} />
                <Typography variant="body2" color="text.secondary">Loading document…</Typography>
              </Box>
            )}

            {!docPreviewLoading && docPreviewUrl && selectedDocument && (() => {
              const isImage = selectedDocument.mimetype?.startsWith('image/') ||
                /\.(jpg|jpeg|png)$/i.test(selectedDocument.filename || '');
              return isImage ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, bgcolor: '#1a1a1a', overflow: 'auto' }}>
                  <img src={docPreviewUrl} alt={getDocumentFilename(selectedDocument)}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 4 }} />
                </Box>
              ) : (
                <iframe src={docPreviewUrl} title={getDocumentFilename(selectedDocument)}
                  style={{ flex: 1, width: '100%', height: '100%', border: 'none' }} />
              );
            })()}

            {!docPreviewLoading && !docPreviewUrl && selectedDocument && (
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">Preview not available.</Typography>
              </Box>
            )}
          </DialogContent>
        </Dialog>

        {/* ── Delete Confirmation Dialog ──────────────────────────────── */}
        <Dialog open={deleteConfirmOpen} onClose={() => !deleteLoading && setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ borderBottom: '1px solid #e2e8f0', pb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1.25}>
              <Avatar sx={{ bgcolor: '#FFF1F2', color: '#B91C1C', width: 36, height: 36 }}>
                <DeleteOutlineIcon fontSize="small" />
              </Avatar>
              <Typography variant="h6" sx={{ color: '#B91C1C' }}>Delete Applications</Typography>
            </Stack>
          </DialogTitle>
          <DialogContent sx={{ pt: 2.5 }}>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              You are about to permanently delete <strong>{deleteTarget?.label}</strong>.
            </Typography>
            <Box sx={{ p: 1.5, bgcolor: '#FFF1F2', border: '1px solid #FECDD3', borderLeft: '4px solid #B91C1C', borderRadius: '6px' }}>
              <Typography variant="body2" sx={{ color: '#991B1B', fontWeight: 600 }}>
                This action cannot be undone. All application data and associated records will be removed.
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleteLoading}
              sx={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleDeleteConfirmed}
              disabled={deleteLoading}
              startIcon={deleteLoading ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : <DeleteOutlineIcon />}
              sx={{ bgcolor: '#B91C1C', '&:hover': { bgcolor: '#991B1B' }, fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              {deleteLoading ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default AdminPage;




