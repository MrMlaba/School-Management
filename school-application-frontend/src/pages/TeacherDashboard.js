import API_BASE from '../config';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Chip, Divider,
  TextField, MenuItem, CircularProgress, Snackbar, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AddIcon            from '@mui/icons-material/Add';
import DeleteIcon         from '@mui/icons-material/Delete';
import EditIcon           from '@mui/icons-material/Edit';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import CalendarMonthIcon  from '@mui/icons-material/CalendarMonth';
import PeopleAltIcon      from '@mui/icons-material/PeopleAlt';
import MenuBookIcon       from '@mui/icons-material/MenuBook';
import AssignmentIcon     from '@mui/icons-material/Assignment';
import GradeIcon          from '@mui/icons-material/Grade';
import LogoutIcon         from '@mui/icons-material/Logout';
import DashboardIcon      from '@mui/icons-material/Dashboard';
import AccessTimeIcon     from '@mui/icons-material/AccessTime';
import EventIcon          from '@mui/icons-material/Event';
import SchoolIcon         from '@mui/icons-material/School';
import WarningAmberIcon   from '@mui/icons-material/WarningAmber';
import TableChartIcon     from '@mui/icons-material/TableChart';
import ListAltIcon        from '@mui/icons-material/ListAlt';
import QuizIcon from '@mui/icons-material/Quiz';
import ArticleIcon from '@mui/icons-material/Article';
import QuizTab  from './QuizTab';
import MaterialsTab from './MaterialsTab';
import SchoolLogoHeader from '../components/SchoolLogoHeader';

/* ─── Tokens ─────────────────────────────────────────────────────────── */
const C = {
  sidebar:   '#0F2137',
  sideHover: '#1A3557',
  sideActive:'#1E4B8A',
  brand:     '#1A3557',
  accent:    '#2E7D32',
  accentBg:  '#E8F5E9',
  sky:       '#0288D1',
  skyBg:     '#E1F5FE',
  amber:     '#E65100',
  amberBg:   '#FFF3E0',
  purple:    '#6A1B9A',
  purpleBg:  '#F3E5F5',
  border:    '#E2E8F0',
  headerBg:  '#F8FAFC',
  bg:        '#F0F4F8',
  rowAlt:    '#FAFBFC',
  text:      '#000000',
  muted:     '#64748B',
  white:     '#FFFFFF',
  danger:    '#C62828',
  success:   '#1A8A5A',
  successBg: '#E6F7F0',
  warnColor: '#B45309',
  warnBg:    '#FEF3C7',
  dangerBg:  '#FEE2E2',
};

const BASE  = `${API_BASE}`;
const authH = () => {
  const t = sessionStorage.getItem('teacherToken');
  return t ? { Authorization: `Bearer ${t}` } : {};
};
const jsonH = () => ({ 'Content-Type': 'application/json', ...authH() });

const redirectOn401 = (responses, navigate) => {
  if (responses.some(r => r.status === 401)) {
    ['teacherToken', 'teacherFirstName', 'teacherLastName', 'teacherSchool'].forEach(k => sessionStorage.removeItem(k));
    navigate('/teacher-login');
    return true;
  }
  return false;
};

const openDoc = async (filename, onError) => {
  try {
    const res  = await fetch(`${BASE}/api/documents/${filename}`, { headers: authH() });
    if (!res.ok) throw new Error('Not found');
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch { if (onError) onError('Could not open document.'); }
};
const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
const DAY_S = { Monday:'Mon', Tuesday:'Tue', Wednesday:'Wed', Thursday:'Thu', Friday:'Fri' };
const SIDEBAR_W = 220;

const headCell = {
  backgroundColor: C.headerBg, color: C.text, fontWeight: 700,
  fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase',
  borderBottom: `2px solid ${C.brand}`, borderRight: `1px solid ${C.border}`,
  padding: '9px 14px', whiteSpace: 'nowrap', fontFamily: "'IBM Plex Sans', sans-serif",
};
const bodyCell = {
  fontSize: '0.845rem', color: C.text, borderBottom: `1px solid ${C.border}`,
  borderRight: `1px solid ${C.border}`, padding: '8px 14px',
  fontFamily: "'IBM Plex Sans', sans-serif",
};

/* ─── Shared UI ─────────────────────────────────────────────────────── */
const NavItem = ({ active, onClick, icon, label, badge }) => (
  <Box onClick={onClick} sx={{
    display:'flex', alignItems:'center', gap:1.5,
    px:2.5, py:1.4, mx:1, borderRadius:'8px', cursor:'pointer', mb:0.5,
    background: active ? C.sideActive : 'transparent',
    borderLeft: active ? '3px solid #5B9BD5' : '3px solid transparent',
    transition:'all 0.15s',
    '&:hover':{ background: active ? C.sideActive : C.sideHover },
  }}>
    <Box sx={{ color: active?'#fff':'rgba(255,255,255,0.55)', fontSize:20, display:'flex' }}>{icon}</Box>
    <Typography sx={{ fontSize:'0.82rem', fontWeight:active?700:500, color:active?'#fff':'rgba(255,255,255,0.7)', fontFamily:"'IBM Plex Sans', sans-serif", flex:1 }}>{label}</Typography>
    {badge > 0 && <Box sx={{ width:18, height:18, borderRadius:'50%', background:'#EF4444', display:'flex', alignItems:'center', justifyContent:'center' }}><Typography sx={{ fontSize:'0.6rem', fontWeight:800, color:'#fff' }}>{badge}</Typography></Box>}
  </Box>
);

const Card = ({ children, sx={} }) => (
  <Box sx={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:'10px', overflow:'hidden', ...sx }}>{children}</Box>
);

const CardHeader = ({ title, subtitle, action }) => (
  <Box sx={{ px:2.5, pt:2.5, pb:1.5 }}>
    <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
      <Box>
        <Typography sx={{ fontWeight:700, fontSize:'0.92rem', color:C.text, fontFamily:"'IBM Plex Sans', sans-serif" }}>{title}</Typography>
        {subtitle && <Typography sx={{ fontSize:'0.78rem', color:C.muted, mt:0.25, fontFamily:"'IBM Plex Sans', sans-serif" }}>{subtitle}</Typography>}
      </Box>
      {action}
    </Box>
    <Divider sx={{ mt:1.5, borderColor:C.border }} />
  </Box>
);

const StatCard = ({ icon, label, value, sub, color, bg }) => (
  <Card sx={{ flex:1, minWidth:160 }}>
    <Box sx={{ p:2.5, display:'flex', gap:2, alignItems:'center' }}>
      <Box sx={{ width:46, height:46, borderRadius:'10px', background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Box sx={{ color, fontSize:22, display:'flex' }}>{icon}</Box>
      </Box>
      <Box>
        <Typography sx={{ fontSize:'1.5rem', fontWeight:800, color:C.text, lineHeight:1, fontFamily:"'IBM Plex Sans', sans-serif" }}>{value}</Typography>
        <Typography sx={{ fontSize:'0.78rem', fontWeight:600, color:C.muted, mt:0.25, fontFamily:"'IBM Plex Sans', sans-serif" }}>{label}</Typography>
        {sub && <Typography sx={{ fontSize:'0.7rem', color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>{sub}</Typography>}
      </Box>
    </Box>
  </Card>
);

/* ─── Percentage colour helper ──────────────────────────────────────── */
const pctTheme = (pct) => {
  if (pct == null) return { text: C.muted, bg: 'transparent', border: 'transparent' };
  const p = parseFloat(pct);
  if (p >= 75) return { text: C.success,    bg: C.successBg, border: '#6EE7B7' };
  if (p >= 50) return { text: C.warnColor,  bg: C.warnBg,    border: '#FCD34D' };
  return             { text: C.danger,      bg: C.dangerBg,  border: '#FCA5A5' };
};

/* ══════════════════════════════════════════════════════════════════════
   MARKS TABLE VIEW  (new component inside AssignmentsTab)
══════════════════════════════════════════════════════════════════════ */
const MarksTableView = () => {
  const [classes,  setClasses]  = useState([]);
  const [selClass, setSelClass] = useState('');
  const [selTerm,  setSelTerm]  = useState('');   // '' = all terms
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);

  // Load teacher's classes
  useEffect(() => {
    fetch(`${BASE}/api/teacher/dashboard`, { headers: authH() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setClasses(d.myClasses || []); });
  }, []);

  // Load marks table whenever class or term changes
  useEffect(() => {
    if (!selClass) return;
    setLoading(true);
    setData(null);
    const params = new URLSearchParams({ classId: selClass });
    if (selTerm) params.append('termId', selTerm);
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/teacher/marks-table?${params}`, { headers: authH() });
        if (res.status === 401) { window.location.href = '/teacher-login'; return; }
        if (res.status === 404) { setData({ assignments: [], students: [], terms: [] }); setLoading(false); return; }
        if (!res.ok) { console.error('Failed loading marks table', res.status); setData(null); setLoading(false); return; }
        const d = await res.json(); setData(d);
      } catch (err) {
        console.error('Failed to fetch marks table', err);
        setData(null);
      } finally { setLoading(false); }
    })();
  }, [selClass, selTerm]);

  // Average across all graded assignments for one student
  const studentAvg = (marks, assignments) => {
    const graded = assignments.filter(a => marks[String(a.id)]?.percentage != null);
    if (!graded.length) return null;
    const sum = graded.reduce((acc, a) => acc + parseFloat(marks[String(a.id)].percentage), 0);
    return (sum / graded.length).toFixed(1);
  };

  // Class average per assignment
  const assignAvg = (students, assignId) => {
    const graded = students.filter(s => s.marks[String(assignId)]?.percentage != null);
    if (!graded.length) return null;
    const sum = graded.reduce((acc, s) => acc + parseFloat(s.marks[String(assignId)].percentage), 0);
    return (sum / graded.length).toFixed(1);
  };

  const terms        = data?.terms        || [];
  const assignments  = data?.assignments  || [];
  const students     = data?.students     || [];

  // Style for sticky first column
  const stickyCol = {
    position: 'sticky', left: 0, zIndex: 2,
    background: C.white, borderRight: `2px solid ${C.brand}`,
  };
  const stickyHeadCol = {
    position: 'sticky', left: 0, zIndex: 3,
    background: C.headerBg, borderRight: `2px solid ${C.brand}`,
  };

  return (
    <Box>
      {/* ── Filters row ── */}
      <Box sx={{ display:'flex', gap:2, mb:3, flexWrap:'wrap', alignItems:'center' }}>
        <TextField select label="Class" value={selClass} onChange={e=>{ setSelClass(e.target.value); setSelTerm(''); }} size="small" sx={{ minWidth:180 }}>
          <MenuItem value="">— Select class —</MenuItem>
          {classes.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.name}{c.stream?` (${c.stream})`:''}</MenuItem>)}
        </TextField>

        {/* Term filter — only shown once data with terms is loaded */}
        {selClass && terms.length > 0 && (
          <Box sx={{ display:'flex', gap:0.75, flexWrap:'wrap' }}>
            {[{ id:'', label:'All Terms' }, ...terms.map(t=>({ id:String(t.id), label:`Term ${t.termNumber}` }))].map(opt => (
              <Button key={opt.id} size="small" onClick={()=>setSelTerm(opt.id)} sx={{
                textTransform:'none', fontWeight:700, fontFamily:"'IBM Plex Sans', sans-serif",
                fontSize:'0.78rem', px:1.75, py:0.5, borderRadius:'6px',
                background: selTerm===opt.id ? C.brand : 'transparent',
                color:      selTerm===opt.id ? C.white : C.muted,
                border:     `1.5px solid ${selTerm===opt.id ? C.brand : C.border}`,
                '&:hover':  { background: selTerm===opt.id ? C.brand : C.headerBg },
              }}>{opt.label}</Button>
            ))}
          </Box>
        )}
      </Box>

      {/* ── Empty / loading states ── */}
      {!selClass && (
        <Box sx={{ textAlign:'center', py:8 }}>
          <TableChartIcon sx={{ fontSize:52, color:C.border, mb:1.5 }} />
          <Typography sx={{ color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif", fontWeight:600 }}>Select a class to view the marks table</Typography>
        </Box>
      )}

      {selClass && loading && (
        <Box sx={{ display:'flex', justifyContent:'center', py:8 }}><CircularProgress sx={{ color:C.brand }} /></Box>
      )}

      {selClass && !loading && data && assignments.length === 0 && (
        <Box sx={{ textAlign:'center', py:8 }}>
          <AssignmentIcon sx={{ fontSize:52, color:C.border, mb:1.5 }} />
          <Typography sx={{ color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif", fontWeight:600 }}>
            No assignments{selTerm ? ' for this term' : ''} yet
          </Typography>
          <Typography sx={{ fontSize:'0.82rem', color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif", mt:0.5 }}>
            Create assignments in the List view and they'll appear here.
          </Typography>
        </Box>
      )}

      {selClass && !loading && data && assignments.length > 0 && (
        <>
          {/* Summary bar */}
          <Box sx={{ display:'flex', gap:2, mb:2, flexWrap:'wrap' }}>
            {[
              { label:'Students',    value: students.length },
              { label:'Assignments', value: assignments.length },
              { label:'Graded',      value: students.reduce((n,s) => n + assignments.filter(a => s.marks[String(a.id)]?.graded).length, 0) },
            ].map(stat => (
              <Box key={stat.label} sx={{ px:2, py:1, borderRadius:'8px', background:C.headerBg, border:`1px solid ${C.border}` }}>
                <Typography sx={{ fontSize:'1.1rem', fontWeight:800, color:C.text, lineHeight:1, fontFamily:"'IBM Plex Sans', sans-serif" }}>{stat.value}</Typography>
                <Typography sx={{ fontSize:'0.7rem', color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>{stat.label}</Typography>
              </Box>
            ))}
            <Box sx={{ px:2, py:1, borderRadius:'8px', background:'#EEF2FF', border:'1px solid #C7D2FE' }}>
              <Typography sx={{ fontSize:'0.75rem', color:'#3730A3', fontFamily:"'IBM Plex Sans', sans-serif", fontWeight:700 }}>
                Class: {data.class.name}{data.class.stream ? ` · ${data.class.stream}` : ''}
              </Typography>
              <Typography sx={{ fontSize:'0.68rem', color:'#6366F1', fontFamily:"'IBM Plex Sans', sans-serif" }}>
                Grade {data.class.grade}
              </Typography>
            </Box>
          </Box>

          {/* Legend */}
          <Box sx={{ display:'flex', gap:1.5, mb:1.5, flexWrap:'wrap', alignItems:'center' }}>
            <Typography sx={{ fontSize:'0.7rem', fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:"'IBM Plex Sans', sans-serif" }}>Legend:</Typography>
            {[
              { bg: C.successBg, border:'#6EE7B7', text: C.success,   label:'≥ 75%' },
              { bg: C.warnBg,    border:'#FCD34D', text: C.warnColor, label:'50–74%' },
              { bg: C.dangerBg,  border:'#FCA5A5', text: C.danger,    label:'< 50%' },
              { bg:'#EEF2FF',    border:'#C7D2FE', text:'#3730A3',    label:'Submitted / Pending' },
              { bg:'transparent',border:C.border,  text: C.muted,     label:'Not submitted' },
            ].map(l => (
              <Box key={l.label} sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
                <Box sx={{ width:14, height:14, borderRadius:'3px', background:l.bg, border:`1px solid ${l.border}` }} />
                <Typography sx={{ fontSize:'0.7rem', color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>{l.label}</Typography>
              </Box>
            ))}
          </Box>

          {/* The grid */}
          <Box sx={{ overflowX:'auto', border:`1px solid ${C.border}`, borderRadius:'8px' }}>
            <Table size="small" sx={{ borderCollapse:'collapse' }}>
              <TableHead>
                <TableRow>
                  {/* Student header — sticky */}
                  <TableCell sx={{ ...headCell, ...stickyHeadCol, minWidth:200, zIndex:3 }}>
                    Student
                  </TableCell>

                  {/* Assignment columns */}
                  {assignments.map(a => (
                    <TableCell key={a.id} sx={{ ...headCell, textAlign:'center', minWidth:110, verticalAlign:'bottom', pb:1 }}>
                      {/* Truncated title */}
                      <Tooltip title={a.title} placement="top">
                        <Typography sx={{
                          fontWeight:700, fontSize:'0.72rem', color:C.text,
                          fontFamily:"'IBM Plex Sans', sans-serif",
                          maxWidth:100, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                          mx:'auto',
                        }}>{a.title}</Typography>
                      </Tooltip>
                      <Typography sx={{ fontSize:'0.63rem', color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif", fontWeight:400, textTransform:'none', letterSpacing:0 }}>
                        {a.totalMarks ? `${a.totalMarks} marks` : 'No marks set'}
                      </Typography>
                      {/* Due date */}
                      <Typography sx={{ fontSize:'0.6rem', color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif", fontWeight:400, textTransform:'none', letterSpacing:0, mt:0.25 }}>
                        {a.dueDate ? new Date(a.dueDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) : ''}
                      </Typography>
                    </TableCell>
                  ))}

                  {/* Average header */}
                  <TableCell sx={{ ...headCell, textAlign:'center', minWidth:80, borderRight:'none', background:'#EEF2FF', color:'#3730A3' }}>
                    Average
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {/* Student rows */}
                {students.map((student, idx) => {
                  const avg      = studentAvg(student.marks, assignments);
                  const avgTheme = pctTheme(avg);
                  return (
                    <TableRow key={student.id} sx={{ backgroundColor: idx%2===0 ? C.white : C.rowAlt, '&:hover':{ backgroundColor:'#F0F5FF' } }}>

                      {/* Student name — sticky */}
                      <TableCell sx={{ ...bodyCell, ...stickyCol, fontWeight:600, background: idx%2===0 ? C.white : C.rowAlt }}>
                        <Typography sx={{ fontWeight:700, fontSize:'0.82rem', color:C.text, fontFamily:"'IBM Plex Sans', sans-serif", lineHeight:1.3 }}>
                          {student.firstName} {student.lastName}
                        </Typography>
                        <Typography sx={{ fontSize:'0.68rem', color:C.muted, fontFamily:'monospace' }}>
                          {student.studentNumber}
                        </Typography>
                      </TableCell>

                      {/* Per-assignment cells */}
                      {assignments.map(a => {
                        const mark = student.marks[String(a.id)];

                        // Not submitted
                        if (!mark) return (
                          <TableCell key={a.id} sx={{ ...bodyCell, textAlign:'center', color:C.muted }}>
                            <Typography sx={{ fontSize:'0.78rem', color:'#CBD5E1', fontFamily:"'IBM Plex Sans', sans-serif" }}>—</Typography>
                          </TableCell>
                        );

                        // Submitted but not yet graded
                        if (!mark.graded) return (
                          <TableCell key={a.id} sx={{ ...bodyCell, textAlign:'center', background:'#EEF2FF' }}>
                            <Typography sx={{ fontSize:'0.7rem', fontWeight:700, color:'#3730A3', fontFamily:"'IBM Plex Sans', sans-serif" }}>Submitted</Typography>
                            <Typography sx={{ fontSize:'0.62rem', color:'#6366F1', fontFamily:"'IBM Plex Sans', sans-serif" }}>Pending</Typography>
                          </TableCell>
                        );

                        // Graded — show percentage + fraction
                        const theme = pctTheme(mark.percentage);
                        return (
                          <TableCell key={a.id} sx={{ ...bodyCell, textAlign:'center', background: theme.bg, p:'6px 10px' }}>
                            <Typography sx={{ fontWeight:800, fontSize:'0.85rem', color:theme.text, fontFamily:"'IBM Plex Sans', sans-serif", lineHeight:1.2 }}>
                              {parseFloat(mark.percentage).toFixed(1)}%
                            </Typography>
                            {mark.marksObtained != null && a.totalMarks && (
                              <Typography sx={{ fontSize:'0.65rem', color:theme.text, opacity:0.8, fontFamily:"'IBM Plex Sans', sans-serif" }}>
                                {mark.marksObtained}/{a.totalMarks}
                              </Typography>
                            )}
                          </TableCell>
                        );
                      })}

                      {/* Student average */}
                      <TableCell sx={{ ...bodyCell, textAlign:'center', background: avgTheme.bg, borderRight:'none', p:'6px 10px' }}>
                        {avg ? (
                          <>
                            <Typography sx={{ fontWeight:800, fontSize:'0.88rem', color:avgTheme.text, fontFamily:"'IBM Plex Sans', sans-serif", lineHeight:1.2 }}>
                              {avg}%
                            </Typography>
                          </>
                        ) : (
                          <Typography sx={{ fontSize:'0.78rem', color:'#CBD5E1', fontFamily:"'IBM Plex Sans', sans-serif" }}>—</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* Class average row */}
                {students.length > 0 && (
                  <TableRow sx={{ background:'#F0F4F8', borderTop:`2px solid ${C.brand}` }}>
                    <TableCell sx={{ ...bodyCell, ...stickyCol, fontWeight:800, color:C.text, background:'#F0F4F8', fontSize:'0.78rem' }}>
                      Class Average
                    </TableCell>
                    {assignments.map(a => {
                      const avg   = assignAvg(students, a.id);
                      const theme = pctTheme(avg);
                      return (
                        <TableCell key={a.id} sx={{ ...bodyCell, textAlign:'center', background: avg ? theme.bg : 'transparent', p:'6px 10px' }}>
                          {avg ? (
                            <Typography sx={{ fontWeight:800, fontSize:'0.82rem', color:theme.text, fontFamily:"'IBM Plex Sans', sans-serif" }}>
                              {avg}%
                            </Typography>
                          ) : <Typography sx={{ color:'#CBD5E1', fontSize:'0.78rem' }}>—</Typography>}
                        </TableCell>
                      );
                    })}
                    <TableCell sx={{ ...bodyCell, borderRight:'none', background:'transparent' }} />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </>
      )}
    </Box>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   DASHBOARD TAB
══════════════════════════════════════════════════════════════════════ */
const DashboardTab = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [data,          setData]          = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [events,        setEvents]        = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    (async () => {
      const [dashRes, annRes, evRes] = await Promise.all([
        fetch(`${BASE}/api/teacher/dashboard`,     { headers: authH() }),
        fetch(`${BASE}/api/teacher/announcements`, { headers: authH() }),
        fetch(`${BASE}/api/teacher/events`,        { headers: authH() }),
      ]);
      if (redirectOn401([dashRes, annRes, evRes], navigate)) return;
      if (dashRes.ok) setData(await dashRes.json());
      if (annRes.ok)  setAnnouncements(await annRes.json());
      if (evRes.ok)   setEvents(await evRes.json());
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', py:8 }}><CircularProgress sx={{ color:C.brand }} /></Box>;
  if (!data)   return <Typography sx={{ color:C.muted }}>Failed to load dashboard.</Typography>;

  const AUDIENCE_COLOR = { all:{ bg:'#EEF2FF', color:'#3730A3' }, teachers:{ bg:'#FFF7ED', color:'#C2410C' }, students:{ bg:'#F0FDF4', color:'#166534' } };
  const EVENT_COLOR    = { general:'#4F46E5', exam:'#BE123C', holiday:'#166534', meeting:'#C2410C', sport:'#0369A1', other:'#374151' };

  return (
    <Box sx={{ display:'flex', flexDirection:'column', gap:2.5 }}>
      <Box sx={{ display:'flex', gap:2, flexWrap:'wrap' }}>
        <StatCard icon={<CalendarMonthIcon />} label="Lessons Today"      value={data.todaySlots.length}         sub={data.today}         color={C.sky}    bg={C.skyBg}    />
        <StatCard icon={<WarningAmberIcon />}  label="Pending Attendance" value={data.pendingAttendance.length}  sub="not yet marked"     color={C.amber}  bg={C.amberBg}  />
        <StatCard icon={<SchoolIcon />}        label="My Classes"         value={data.myClasses.length}          sub="active classes"     color={C.accent} bg={C.accentBg} />
        <StatCard icon={<AssignmentIcon />}    label="Due This Week"      value={data.upcomingAssignments.length} sub="assignments"       color={C.purple} bg={C.purpleBg} />
      </Box>

      <Box sx={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:2.5, alignItems:'start' }}>
        <Box sx={{ display:'flex', flexDirection:'column', gap:2.5 }}>
          {/* Today's timetable */}
          <Card>
            <CardHeader title={`Today — ${data.today}`} subtitle="Your scheduled lessons" />
            <Box sx={{ px:2.5, pb:2.5 }}>
              {data.todaySlots.length === 0 ? (
                <Box sx={{ py:3, textAlign:'center' }}>
                  <CalendarMonthIcon sx={{ color:C.border, fontSize:36, mb:1 }} />
                  <Typography sx={{ color:C.muted, fontSize:'0.875rem', fontFamily:"'IBM Plex Sans', sans-serif" }}>No lessons scheduled today</Typography>
                </Box>
              ) : (
                <Box sx={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:1.5 }}>
                  {data.todaySlots.map(s => (
                    <Box key={s.id} sx={{ p:1.75, borderRadius:'8px', border:`1.5px solid ${C.border}`, borderLeft:`3px solid ${C.brand}`, background:C.headerBg }}>
                      <Typography sx={{ fontWeight:700, fontSize:'0.875rem', color:C.text, fontFamily:"'IBM Plex Sans', sans-serif" }}>{s.subjectName}</Typography>
                      <Typography sx={{ fontSize:'0.78rem', color:C.muted, mt:0.25, fontFamily:"'IBM Plex Sans', sans-serif" }}>{s.className}</Typography>
                      <Box sx={{ display:'flex', alignItems:'center', gap:0.5, mt:0.75 }}>
                        <AccessTimeIcon sx={{ fontSize:12, color:C.muted }} />
                        <Typography sx={{ fontSize:'0.72rem', color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>{s.timeStart?.slice(0,5)} – {s.timeEnd?.slice(0,5)}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Card>

          {/* Pending attendance */}
          <Card>
            <CardHeader title="Pending Attendance" subtitle="Lessons not yet marked today" />
            <Box sx={{ px:2.5, pb:2.5 }}>
              {data.todaySlots.length === 0 ? (
                <Box sx={{ display:'flex', alignItems:'center', gap:1.5, py:1 }}>
                  <CheckCircleIcon sx={{ color:C.muted, fontSize:22 }} />
                  <Typography sx={{ color:C.muted, fontWeight:600, fontSize:'0.875rem', fontFamily:"'IBM Plex Sans', sans-serif" }}>No classes scheduled for today</Typography>
                </Box>
              ) : data.pendingAttendance.length === 0 ? (
                <Box sx={{ display:'flex', alignItems:'center', gap:1.5, py:1 }}>
                  <CheckCircleIcon sx={{ color:C.accent, fontSize:22 }} />
                  <Typography sx={{ color:C.accent, fontWeight:600, fontSize:'0.875rem', fontFamily:"'IBM Plex Sans', sans-serif" }}>All attendance marked for today</Typography>
                </Box>
              ) : data.pendingAttendance.map(s => (
                <Box key={s.slotId} sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', py:1.25, borderBottom:`1px solid ${C.border}` }}>
                  <Box>
                    <Typography sx={{ fontWeight:600, fontSize:'0.85rem', color:C.text, fontFamily:"'IBM Plex Sans', sans-serif" }}>{s.subjectName}</Typography>
                    <Typography sx={{ fontSize:'0.75rem', color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>{s.className} · {s.timeStart?.slice(0,5)}</Typography>
                  </Box>
                  <Button size="small" variant="contained" onClick={() => onNavigate('attendance', { slotId: s.slotId })}
                    sx={{ background:C.brand, textTransform:'none', fontWeight:700, fontSize:'0.75rem', boxShadow:'none', fontFamily:"'IBM Plex Sans', sans-serif", borderRadius:'6px' }}>
                    Mark Now
                  </Button>
                </Box>
              ))}
            </Box>
          </Card>

          {/* Announcements */}
          <Card>
            <CardHeader title="📢 Announcements" subtitle="From your school admin" />
            <Box sx={{ px:2.5, pb:2.5 }}>
              {announcements.length === 0 ? (
                <Typography sx={{ color:C.muted, fontSize:'0.875rem', py:1, fontFamily:"'IBM Plex Sans', sans-serif" }}>No announcements at the moment.</Typography>
              ) : announcements.map(a => {
                const ac = AUDIENCE_COLOR[a.audience] || AUDIENCE_COLOR.all;
                return (
                  <Box key={a.id} sx={{ py:1.5, borderBottom:`1px solid ${C.border}`, pl:1.5, borderLeft: a.isPinned ? `3px solid ${C.brand}` : '3px solid transparent' }}>
                    <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:0.4, flexWrap:'wrap' }}>
                      <Typography sx={{ fontWeight:700, fontSize:'0.875rem', color:C.text, fontFamily:"'IBM Plex Sans', sans-serif" }}>{a.isPinned?'📌 ':''}{a.title}</Typography>
                      <Chip label={a.audience} size="small" sx={{ height:16, fontSize:'0.6rem', fontWeight:700, bgcolor:ac.bg, color:ac.color, textTransform:'capitalize' }} />
                    </Box>
                    <Typography sx={{ fontSize:'0.8rem', color:C.muted, lineHeight:1.5, fontFamily:"'IBM Plex Sans', sans-serif" }}>{a.body}</Typography>
                    <Typography sx={{ fontSize:'0.7rem', color:C.muted, mt:0.5, fontFamily:"'IBM Plex Sans', sans-serif" }}>{new Date(a.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</Typography>
                  </Box>
                );
              })}
            </Box>
          </Card>
        </Box>

        <Box sx={{ display:'flex', flexDirection:'column', gap:2.5 }}>
          {/* My classes */}
          <Card>
            <CardHeader title="My Classes" />
            <Box sx={{ px:2.5, pb:2.5 }}>
              {data.myClasses.map(cls => (
                <Box key={cls.id} sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', py:1.25, borderBottom:`1px solid ${C.border}` }}>
                  <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                    <Box sx={{ width:34, height:34, borderRadius:'8px', background:C.brand, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Typography sx={{ color:'#fff', fontWeight:800, fontSize:'0.78rem', fontFamily:"'IBM Plex Sans', sans-serif" }}>{cls.name}</Typography>
                    </Box>
                    {cls.stream && <Chip label={cls.stream} size="small" sx={{ fontSize:'0.68rem', fontWeight:700, bgcolor:'#EEF2FF', color:'#3730A3', height:18 }} />}
                  </Box>
                  <Box sx={{ display:'flex', gap:1 }}>
                    <Button size="small" onClick={() => onNavigate('students', { classId: cls.id })}
                      sx={{ textTransform:'none', fontWeight:600, color:C.brand, fontSize:'0.75rem', fontFamily:"'IBM Plex Sans', sans-serif" }}>Students →</Button>
                    <Button size="small" onClick={() => navigate(`/teacher/gradebook/${cls.id}`)}
                      sx={{ textTransform:'none', fontWeight:600, bgcolor:C.brand, color:'#fff', fontSize:'0.75rem', fontFamily:"'IBM Plex Sans', sans-serif", '&:hover':{ bgcolor:C.sideActive } }}>Gradebook</Button>
                  </Box>
                </Box>
              ))}
            </Box>
          </Card>

          {/* Upcoming assignments */}
          {data.upcomingAssignments.length > 0 && (
            <Card>
              <CardHeader title="Due This Week" subtitle="Upcoming assignment deadlines" />
              <Box sx={{ px:2.5, pb:2.5 }}>
                {data.upcomingAssignments.map(a => (
                  <Box key={a.id} sx={{ py:1.25, borderBottom:`1px solid ${C.border}` }}>
                    <Typography sx={{ fontWeight:600, fontSize:'0.84rem', color:C.text, fontFamily:"'IBM Plex Sans', sans-serif" }}>{a.title}</Typography>
                    <Typography sx={{ fontSize:'0.75rem', color:C.muted, mt:0.25, fontFamily:"'IBM Plex Sans', sans-serif" }}>{a.className} · {a.subjectName}</Typography>
                    <Box sx={{ display:'flex', alignItems:'center', gap:0.5, mt:0.5 }}>
                      <EventIcon sx={{ fontSize:12, color:C.amber }} />
                      <Typography sx={{ fontSize:'0.72rem', color:C.amber, fontWeight:600, fontFamily:"'IBM Plex Sans', sans-serif" }}>Due {new Date(a.dueDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Card>
          )}

          {/* Events */}
          <Card>
            <CardHeader title="📅 Upcoming Events" subtitle="Next 30 days" />
            <Box sx={{ px:2.5, pb:2.5 }}>
              {events.length === 0 ? (
                <Typography sx={{ color:C.muted, fontSize:'0.875rem', py:1, fontFamily:"'IBM Plex Sans', sans-serif" }}>No upcoming events.</Typography>
              ) : events.map(ev => (
                <Box key={ev.id} sx={{ display:'flex', gap:1.25, py:1.25, borderBottom:`1px solid ${C.border}`, alignItems:'flex-start' }}>
                  <Box sx={{ width:36, height:36, borderRadius:'8px', flexShrink:0, background:(EVENT_COLOR[ev.type]||'#374151')+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <EventIcon sx={{ fontSize:16, color:EVENT_COLOR[ev.type]||'#374151' }} />
                  </Box>
                  <Box sx={{ flex:1 }}>
                    <Typography sx={{ fontWeight:700, fontSize:'0.82rem', color:C.text, fontFamily:"'IBM Plex Sans', sans-serif" }}>{ev.title}</Typography>
                    <Typography sx={{ fontSize:'0.72rem', color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>
                      {new Date((ev.eventDate||'').slice(0,10)+'T00:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short'})}
                      {ev.eventTime?` · ${ev.eventTime.slice(0,5)}`:''}
                      {ev.location?` · ${ev.location}`:''}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   TIMETABLE TAB
══════════════════════════════════════════════════════════════════════ */
const TimetableTab = () => {
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    (async () => {
      const res = await fetch(`${BASE}/api/teacher/timetable`, { headers: authH() });
      if (redirectOn401([res], navigate)) return;
      if (res.ok) setData(await res.json());
      else setError('Failed to load timetable. Please try again.');
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', py:6 }}><CircularProgress sx={{ color:C.brand }} /></Box>;
  if (error || !data)
    return <Typography sx={{ color:C.danger, px:2, py:4, fontFamily:"'IBM Plex Sans', sans-serif" }}>{error || 'Could not load timetable.'}</Typography>;

  const slotMap = {};
  (data.slots || []).forEach(s => { slotMap[`${s.dayOfWeek}-${s.periodNumber}`] = s; });

  return (
    <Card>
      <CardHeader title="My Weekly Timetable" subtitle="View only — contact your admin to make changes" />
      <Box sx={{ px:2.5, pb:2.5, overflowX:'auto' }}>
        <Table sx={{ borderCollapse:'collapse', minWidth:600 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headCell, width:120 }}>Period</TableCell>
              {DAYS.map((d,i) => <TableCell key={d} sx={{ ...headCell, textAlign:'center', ...(i===4?{borderRight:'none'}:{}) }}>{DAY_S[d]}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {(data.periods || []).map(p => (
              <TableRow key={p.id}>
                <TableCell sx={{ ...bodyCell, background:p.isBreak?'#F5F5F5':C.headerBg, fontWeight:600 }}>
                  <Typography sx={{ fontWeight:700, fontSize:'0.8rem', color:C.text, fontFamily:"'IBM Plex Sans', sans-serif" }}>{p.name}</Typography>
                  <Typography sx={{ fontSize:'0.7rem', color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>{p.timeStart?.slice(0,5)}–{p.timeEnd?.slice(0,5)}</Typography>
                </TableCell>
                {DAYS.map((day,i) => {
                  const slot = slotMap[`${day}-${p.periodNumber}`];
                  return (
                    <TableCell key={day} sx={{ ...bodyCell, textAlign:'center', background:p.isBreak?'#F5F5F5':slot?'#E8F5E9':C.white, ...(i===4?{borderRight:'none'}:{}) }}>
                      {p.isBreak ? <Typography sx={{ fontSize:'0.7rem', color:C.muted, fontStyle:'italic', fontFamily:"'IBM Plex Sans', sans-serif" }}>—</Typography>
                      : slot ? (
                        <Box>
                          <Typography sx={{ fontWeight:700, fontSize:'0.78rem', color:C.text, fontFamily:"'IBM Plex Sans', sans-serif" }}>{slot.subjectName}</Typography>
                          <Typography sx={{ fontSize:'0.7rem', color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>{slot.className}</Typography>
                        </Box>
                      ) : <Typography sx={{ fontSize:'0.7rem', color:'#CBD5E1', fontFamily:"'IBM Plex Sans', sans-serif" }}>—</Typography>}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Card>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   ATTENDANCE TAB
══════════════════════════════════════════════════════════════════════ */
const AttendanceTab = ({ initSlotId }) => {
  const [mySlots, setMySlots] = useState([]);
  const [slotId,  setSlotId]  = useState(initSlotId || '');
  const [date,    setDate]    = useState(new Date().toLocaleDateString('en-CA'));
  const [attData, setAttData] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [snack,   setSnack]   = useState({ open:false, msg:'', sev:'success' });
  const toast = (msg, sev='success') => setSnack({ open:true, msg, sev });

  useEffect(() => {
    (async () => {
      const res = await fetch(`${BASE}/api/teacher/timetable`, { headers: authH() });
      if (res.ok) {
        const d = await res.json();
        const seen = new Set();
        setMySlots((d.slots || []).filter(s => { const k=`${s.subjectName}-${s.className}`; if(seen.has(k))return false; seen.add(k);return true; }));
      }
    })();
  }, []);

  useEffect(() => { if (slotId && date) loadAttendance(); }, [slotId, date]);

  const loadAttendance = async () => {
    if (!slotId || !date) return;
    setLoading(true);
    const res = await fetch(`${BASE}/api/teacher/attendance?slotId=${slotId}&date=${date}`, { headers: authH() });
    if (res.ok) {
      const d = await res.json();
      setAttData(d);
      setRecords(d.students.map(s => ({ studentId:s.id, status:s.status, note:s.note||'' })));
    }
    setLoading(false);
  };

  const updateRecord = (studentId, field, value) =>
    setRecords(r => r.map(rec => rec.studentId===studentId ? {...rec,[field]:value} : rec));

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`${BASE}/api/teacher/attendance`, { method:'POST', headers:jsonH(), body:JSON.stringify({ slotId, date, records }) });
    setSaving(false);
    if (res.ok) toast('Attendance saved');
    else { const e = await res.json(); toast(e.message||'Failed','error'); }
  };

  const statusColor = { present:'#E8F5E9', absent:'#FFEBEE', late:'#FFF8E1', excused:'#F3E5F5' };
  const statusText  = { present:C.accent,  absent:C.danger,  late:'#E65100', excused:'#6A1B9A' };

  return (
    <Card>
      <CardHeader title="Mark Attendance" subtitle="Select a lesson and date, then mark each student" />
      <Box sx={{ px:2.5, pb:2.5 }}>
        <Box sx={{ display:'flex', gap:2, mb:3, flexWrap:'wrap', alignItems:'flex-end' }}>
          <TextField select label="Lesson" value={slotId} onChange={e=>setSlotId(e.target.value)} size="small" sx={{ minWidth:260 }}>
            <MenuItem value="">— Select lesson —</MenuItem>
            {mySlots.map(s => <MenuItem key={s.id} value={s.id}>{s.subjectName} — {s.className}</MenuItem>)}
          </TextField>
          <TextField label="Date" type="date" value={date} onChange={e=>setDate(e.target.value)} size="small" InputLabelProps={{ shrink:true }} />
        </Box>

        {loading && <Box sx={{ display:'flex', justifyContent:'center', py:4 }}><CircularProgress sx={{ color:C.brand }} /></Box>}

        {attData && !loading && (
          <>
            {attData.alreadyMarked && (
              <Box sx={{ background:'#E8F5E9', border:'1px solid #A5D6A7', borderRadius:'6px', p:1.5, mb:2, display:'flex', alignItems:'center', gap:1 }}>
                <CheckCircleIcon sx={{ color:C.accent, fontSize:18 }} />
                <Typography sx={{ fontSize:'0.82rem', color:C.accent, fontWeight:600, fontFamily:"'IBM Plex Sans', sans-serif" }}>Attendance already marked — you can update below.</Typography>
              </Box>
            )}
            <TableContainer component={Paper} elevation={0} sx={{ border:`1px solid ${C.border}`, borderRadius:'6px', mb:2 }}>
              <Table size="small" sx={{ borderCollapse:'collapse' }}>
                <TableHead>
                  <TableRow>{['#','Student No.','Name','Status','Note'].map(h=><TableCell key={h} sx={{ ...headCell, ...(h==='Note'?{borderRight:'none'}:{}) }}>{h}</TableCell>)}</TableRow>
                </TableHead>
                <TableBody>
                  {attData.students.map((s, idx) => {
                    const rec = records.find(r=>r.studentId===s.id)||{};
                    return (
                      <TableRow key={s.id} sx={{ backgroundColor:idx%2===0?C.white:C.rowAlt }}>
                        <TableCell sx={{ ...bodyCell, color:C.muted, textAlign:'center', width:40 }}>{idx+1}</TableCell>
                        <TableCell sx={{ ...bodyCell, fontFamily:'monospace', fontSize:'0.8rem' }}>{s.studentNumber}</TableCell>
                        <TableCell sx={{ ...bodyCell, fontWeight:600 }}>{s.firstName} {s.lastName}</TableCell>
                        <TableCell sx={bodyCell}>
                          <Box sx={{ display:'flex', gap:0.75, flexWrap:'wrap' }}>
                            {['present','absent','late','excused'].map(st => (
                              <Box key={st} onClick={()=>updateRecord(s.id,'status',st)} sx={{ px:1.25, py:0.25, borderRadius:'4px', cursor:'pointer', fontSize:'0.72rem', fontWeight:700, textTransform:'capitalize', fontFamily:"'IBM Plex Sans', sans-serif", background:rec.status===st?statusColor[st]:'#F5F5F5', color:rec.status===st?statusText[st]:C.muted, border:`1px solid ${rec.status===st?statusText[st]+'44':C.border}`, '&:hover':{ background:statusColor[st], color:statusText[st] } }}>{st}</Box>
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ ...bodyCell, borderRight:'none' }}>
                          <TextField value={rec.note||''} size="small" placeholder="Optional note" onChange={e=>updateRecord(s.id,'note',e.target.value)} variant="standard" sx={{ minWidth:160, '& input':{ fontSize:'0.82rem', fontFamily:"'IBM Plex Sans', sans-serif" } }} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ background:C.accent, textTransform:'none', fontWeight:700, boxShadow:'none', borderRadius:'8px', fontFamily:"'IBM Plex Sans', sans-serif" }}>
              {saving?'Saving…':'Save Attendance'}
            </Button>
          </>
        )}
      </Box>
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={()=>setSnack(s=>({...s,open:false}))} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert severity={snack.sev} onClose={()=>setSnack(s=>({...s,open:false}))} sx={{ fontFamily:"'IBM Plex Sans', sans-serif", fontWeight:600 }}>{snack.msg}</Alert>
      </Snackbar>
    </Card>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   TERM WEIGHTS DIALOG
   Lets the teacher set, per class + term + subject, what % of the final
   report mark comes from assignments vs. exams. Must add up to 100%.
══════════════════════════════════════════════════════════════════════ */
const TermWeightsDialog = ({ open, onClose, toast }) => {
  const [classes,  setClasses]  = useState([]);
  const [terms,    setTerms]    = useState([]);
  const [selClass, setSelClass] = useState('');
  const [selTerm,  setSelTerm]  = useState('');
  const [weights,  setWeights]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState({});

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [dRes, tRes] = await Promise.all([
        fetch(`${BASE}/api/teacher/dashboard`, { headers: authH() }),
        fetch(`${BASE}/api/teacher/terms`,     { headers: authH() }),
      ]);
      if (dRes.ok) { const d = await dRes.json(); setClasses(d.myClasses || []); }
      if (tRes.ok) setTerms(await tRes.json());
    })();
  }, [open]);

  useEffect(() => {
    if (!selClass || !selTerm) { setWeights([]); return; }
    setLoading(true);
    fetch(`${BASE}/api/teacher/term-weights?classId=${selClass}&termId=${selTerm}`, { headers: authH() })
      .then(r => r.ok ? r.json() : [])
      .then(d => setWeights(d))
      .finally(() => setLoading(false));
  }, [selClass, selTerm]);

  const updateWeight = (subjectId, field, value) => {
    let num = Number(value);
    if (!Number.isFinite(num)) num = 0;
    num = Math.max(0, Math.min(100, num));
    setWeights(ws => ws.map(w => w.subjectId !== subjectId ? w : (
      field === 'assignmentWeight'
        ? { ...w, assignmentWeight: num, examWeight: 100 - num }
        : { ...w, examWeight: num, assignmentWeight: 100 - num }
    )));
  };

  const handleSave = async (w) => {
    setSaving(s => ({ ...s, [w.subjectId]: true }));
    const res = await fetch(`${BASE}/api/teacher/term-weights`, {
      method: 'PUT', headers: jsonH(),
      body: JSON.stringify({ classId: selClass, subjectId: w.subjectId, termId: selTerm, assignmentWeight: w.assignmentWeight, examWeight: w.examWeight }),
    });
    setSaving(s => ({ ...s, [w.subjectId]: false }));
    if (res.ok) toast(`Weights saved for ${w.subjectName}`);
    else { const e = await res.json(); toast(e.message || 'Failed to save weights', 'error'); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx:{ borderRadius:'12px' } }}>
      <DialogTitle sx={{ fontWeight:700, color:C.text, fontFamily:"'IBM Plex Sans', sans-serif" }}>Term Weights</DialogTitle>
      <Divider />
      <DialogContent sx={{ pt:2.5, display:'flex', flexDirection:'column', gap:2 }}>
        <Typography sx={{ fontSize:'0.82rem', color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>
          Choose how much each subject's final report mark depends on assignment marks vs. exam marks for a term.
          The two values must add up to 100%. If left unset, marks are split 50/50.
        </Typography>
        <Box sx={{ display:'flex', gap:2 }}>
          <TextField select label="Class" value={selClass} onChange={e=>{ setSelClass(e.target.value); setWeights([]); }} size="small" fullWidth>
            <MenuItem value="">— Select —</MenuItem>
            {classes.map(c=><MenuItem key={c.id} value={c.id}>{c.name}{c.stream?` (${c.stream})`:''}</MenuItem>)}
          </TextField>
          <TextField select label="Term" value={selTerm} onChange={e=>{ setSelTerm(e.target.value); setWeights([]); }} size="small" fullWidth>
            <MenuItem value="">— Select —</MenuItem>
            {terms.map(t=><MenuItem key={t.id} value={t.id}>Term {t.termNumber}</MenuItem>)}
          </TextField>
        </Box>

        {loading && <Box sx={{ display:'flex', justifyContent:'center', py:3 }}><CircularProgress sx={{ color:C.brand }} /></Box>}

        {!loading && selClass && selTerm && weights.length===0 && (
          <Typography sx={{ color:C.muted, textAlign:'center', py:2, fontFamily:"'IBM Plex Sans', sans-serif" }}>
            No subjects found for this class.
          </Typography>
        )}

        {!loading && weights.map(w => (
          <Box key={w.subjectId} sx={{ display:'flex', alignItems:'center', gap:1.5, p:1.5, border:`1px solid ${C.border}`, borderRadius:'8px', flexWrap:'wrap' }}>
            <Typography sx={{ flex:1, minWidth:100, fontWeight:600, fontFamily:"'IBM Plex Sans', sans-serif" }}>{w.subjectName}</Typography>
            <TextField label="Assignment %" type="number" size="small" value={w.assignmentWeight}
              onChange={e=>updateWeight(w.subjectId,'assignmentWeight',e.target.value)} sx={{ width:120 }} />
            <TextField label="Exam %" type="number" size="small" value={w.examWeight}
              onChange={e=>updateWeight(w.subjectId,'examWeight',e.target.value)} sx={{ width:120 }} />
            <Button size="small" variant="contained" disabled={!!saving[w.subjectId]} onClick={()=>handleSave(w)}
              sx={{ background:C.brand, textTransform:'none', fontWeight:700, boxShadow:'none', borderRadius:'6px', fontFamily:"'IBM Plex Sans', sans-serif" }}>
              {saving[w.subjectId] ? '…' : 'Save'}
            </Button>
          </Box>
        ))}
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px:3, py:2 }}>
        <Button onClick={onClose} sx={{ textTransform:'none', color:C.muted }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   ASSIGNMENTS TAB  — now has two views: List  |  Marks Table
══════════════════════════════════════════════════════════════════════ */
const AssignmentsTab = () => {
  const [view,       setView]       = useState('list');   // 'list' | 'marks'
  const [assignments, setAssignments] = useState([]);
  const [dialog,      setDialog]      = useState(false);
  const [editingId,   setEditingId]   = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [snack,       setSnack]       = useState({ open:false, msg:'', sev:'success' });
  const toast = (msg, sev='success') => setSnack({ open:true, msg, sev });

  const EMPTY = { classId:'', subjectId:'', title:'', description:'', dueDate:'', totalMarks:'', termId:'', weight:'' };
  const [form,       setForm]       = useState(EMPTY);
  const [file,       setFile]       = useState(null);
  const [slots,      setSlots]      = useState([]);
  const [terms,      setTerms]      = useState([]);
  const [filterTerm, setFilterTerm] = useState('');
  const [budget,     setBudget]     = useState(null);

  const [filesDialog,        setFilesDialog]        = useState(null);
  const [assignFiles,        setAssignFiles]         = useState([]);
  const [submissionsDialog,  setSubmissionsDialog]   = useState(null);
  const [submissions,        setSubmissions]         = useState([]);
  const [loadingSubs,        setLoadingSubs]         = useState(false);
  const [grading,            setGrading]             = useState({});

  const fetchAll = useCallback(async () => {
    const [aRes, tRes, termsRes] = await Promise.all([
      fetch(`${BASE}/api/teacher/assignments`, { headers:authH() }),
      fetch(`${BASE}/api/teacher/timetable`,   { headers:authH() }),
      fetch(`${BASE}/api/teacher/terms`,       { headers:authH() }),
    ]);
    if (aRes.ok)    setAssignments(await aRes.json());
    if (tRes.ok)    { const d=await tRes.json(); setSlots(d.slots || []); }
    if (termsRes.ok) setTerms(await termsRes.json());
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!form.classId || !form.subjectId || !form.termId) { setBudget(null); return; }
    fetch(`${BASE}/api/teacher/weight-budget?classId=${form.classId}&subjectId=${form.subjectId}&termId=${form.termId}`, { headers:authH() })
      .then(r => r.json()).then(d => setBudget(d)).catch(() => setBudget(null));
  }, [form.classId, form.subjectId, form.termId]);

  const uniqueClasses  = [...new Map(slots.map(s=>[s.classId,{name:s.className,classId:s.classId}])).values()];
  const uniqueSubjects = [...new Map(slots.filter(s=>!form.classId||s.classId===form.classId||s.classId===Number(form.classId)).map(s=>[s.subjectId,{name:s.subjectName,subjectId:s.subjectId}])).values()];

  const handleSave = async () => {
    if (!form.classId||!form.subjectId||!form.title||!form.dueDate) return toast('Class, subject, title and due date are required','error');
    if (!form.weight || Number(form.weight) <= 0) return toast('Weight (%) is required','error');
    if (budget && Number(form.weight) > budget.remaining + 0.01) return toast(`Weight exceeds budget — only ${budget.remaining}% remaining for this term`,'error');
    setSaving(true);
    try {
      let res;
      const payload = { ...form, termId: form.termId || undefined };
      if (editingId) {
        // Text-field edits only — replacing the attached file isn't supported
        // here, use the existing Files dialog for that.
        res = await fetch(`${BASE}/api/teacher/assignments/${editingId}`, { method:'PATCH', headers:jsonH(), body:JSON.stringify(payload) });
      } else if (file) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k,v]) => v !== undefined && fd.append(k,v));
        fd.append('file', file);
        res = await fetch(`${BASE}/api/teacher/assignments`, { method:'POST', headers:authH(), body:fd });
      } else {
        res = await fetch(`${BASE}/api/teacher/assignments`, { method:'POST', headers:jsonH(), body:JSON.stringify(payload) });
      }
      setSaving(false);
      if (res.ok) { toast(editingId?'Assignment updated':'Assignment created'); setDialog(false); setEditingId(null); setFile(null); setForm(EMPTY); setBudget(null); fetchAll(); }
      else { const e=await res.json(); toast(e.message||'Failed','error'); }
    } catch { setSaving(false); toast('Failed to save assignment','error'); }
  };

  const openEdit = (a) => {
    setEditingId(a.id);
    setForm({
      classId: a.classId, subjectId: a.subjectId, title: a.title,
      description: a.description || '', dueDate: a.dueDate?.slice(0,10) || '',
      totalMarks: a.totalMarks ?? '', termId: a.termId || '', weight: a.weight ?? '',
    });
    setFile(null);
    setBudget(null);
    setDialog(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this assignment?')) return;
    const res = await fetch(`${BASE}/api/teacher/assignments/${id}`, { method:'DELETE', headers:authH() });
    if (res.ok) { toast('Assignment deleted'); fetchAll(); } else toast('Failed','error');
  };

  const openFiles = async (a) => {
    setFilesDialog(a); setAssignFiles([]);
    const res = await fetch(`${BASE}/api/teacher/assignments/${a.id}/files`, { headers:authH() });
    if (res.ok) setAssignFiles(await res.json());
  };

  const openSubmissions = async (a) => {
    setSubmissionsDialog(a); setLoadingSubs(true);
    const res = await fetch(`${BASE}/api/teacher/assignments/${a.id}/submissions`, { headers:authH() });
    if (res.ok) setSubmissions(await res.json()); else setSubmissions([]);
    setLoadingSubs(false);
  };

  const handleGrade = async (submissionId, marks) => {
    if (marks===''||marks===null) return toast('Enter mark','error');
    setGrading(g=>({...g,[submissionId]:true}));
    const res = await fetch(`${BASE}/api/teacher/assignments/${submissionsDialog.id}/submissions/${submissionId}/grade`, { method:'POST', headers:jsonH(), body:JSON.stringify({ marksObtained:marks }) });
    if (res.ok) { toast('Graded'); await openSubmissions(submissionsDialog); }
    else { const e=await res.json(); toast(e.message||'Failed','error'); }
    setGrading(g=>({...g,[submissionId]:false}));
  };

  return (
    <>
      <Card>
        {/* ── Sub-navigation: List ↔ Marks Table ── */}
        <Box sx={{ px:2.5, pt:2.5, pb:0 }}>
          <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:1.5 }}>
            <Box sx={{ display:'flex', gap:1 }}>
              {[
                { key:'list',  icon:<ListAltIcon sx={{ fontSize:17 }} />,   label:'Assignment List'  },
                { key:'marks', icon:<TableChartIcon sx={{ fontSize:17 }} />, label:'Marks Table'      },
              ].map(v => (
                <Button key={v.key} size="small" startIcon={v.icon} onClick={()=>setView(v.key)} sx={{
                  textTransform:'none', fontWeight:700, fontFamily:"'IBM Plex Sans', sans-serif",
                  fontSize:'0.82rem', px:2, py:0.75, borderRadius:'8px',
                  background: view===v.key ? C.brand : 'transparent',
                  color:      view===v.key ? C.white : C.muted,
                  border:    `1.5px solid ${view===v.key ? C.brand : C.border}`,
                  '&:hover': { background: view===v.key ? C.brand : C.headerBg },
                }}>{v.label}</Button>
              ))}
            </Box>

            <Box sx={{ display:'flex', gap:1 }}>
              {view==='list' && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={()=>{ setForm(EMPTY); setEditingId(null); setFile(null); setBudget(null); setDialog(true); }}
                  sx={{ background:C.brand, textTransform:'none', fontWeight:700, boxShadow:'none', borderRadius:'8px', fontFamily:"'IBM Plex Sans', sans-serif" }}>
                  New Assignment
                </Button>
              )}
            </Box>
          </Box>
          <Divider sx={{ borderColor:C.border }} />
        </Box>

        <Box sx={{ px:2.5, pt:2, pb:2.5 }}>
          {/* ══ LIST VIEW ══ */}
          {view==='list' && assignments.length===0 && (
            <Box sx={{ textAlign:'center', py:6 }}>
              <AssignmentIcon sx={{ color:C.border, fontSize:44, mb:1 }} />
              <Typography sx={{ color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>No assignments yet. Create your first one.</Typography>
            </Box>
          )}
          {view==='list' && assignments.length>0 && (
            <>
              {terms.length > 0 && (
                <Box sx={{ mb:1.5, display:'flex', alignItems:'center', gap:1, flexWrap:'wrap' }}>
                  <Typography sx={{ fontSize:'0.8rem', fontWeight:600, color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif", mr:0.5 }}>Filter by term:</Typography>
                  {[{ id:'', label:'All terms' }, ...terms.map(t=>({ id:String(t.id), label:`Term ${t.termNumber}` }))].map(opt => (
                    <Button key={opt.id} size="small" onClick={()=>setFilterTerm(opt.id)}
                      sx={{ textTransform:'none', fontWeight:700, fontFamily:"'IBM Plex Sans', sans-serif",
                        fontSize:'0.78rem', px:1.5, py:0.4, borderRadius:'6px',
                        background: filterTerm===opt.id ? C.brand : 'transparent',
                        color:      filterTerm===opt.id ? C.white : C.muted,
                        border:    `1px solid ${filterTerm===opt.id ? C.brand : C.border}`,
                        '&:hover':{ background: filterTerm===opt.id ? C.brand : C.headerBg },
                      }}>{opt.label}</Button>
                  ))}
                </Box>
              )}
              <TableContainer component={Paper} elevation={0} sx={{ border:`1px solid ${C.border}`, borderRadius:'8px' }}>
                <Table size="small" sx={{ borderCollapse:'collapse' }}>
                  <TableHead>
                    <TableRow>
                      {['Title','Class','Subject','Term','Due Date','Marks','Weight','Actions'].map(h => (
                        <TableCell key={h} sx={{ ...headCell, ...(h==='Actions'?{borderRight:'none'}:{}) }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(filterTerm ? assignments.filter(a=>String(a.termId)===filterTerm) : assignments).length===0 ? (
                      <TableRow><TableCell colSpan={7} sx={{ ...bodyCell, borderRight:'none', textAlign:'center', py:4, color:C.muted }}>No assignments for this term.</TableCell></TableRow>
                    ) : (filterTerm ? assignments.filter(a=>String(a.termId)===filterTerm) : assignments).map((a, idx) => (
                      <TableRow key={a.id} sx={{ backgroundColor:idx%2===0?C.white:C.rowAlt, '&:hover':{ background:'#F0F7FF' } }}>
                        <TableCell sx={{ ...bodyCell, fontWeight:600 }}>{a.title}</TableCell>
                        <TableCell sx={bodyCell}>{a.className}</TableCell>
                        <TableCell sx={bodyCell}>{a.subjectName}</TableCell>
                        <TableCell sx={bodyCell}>
                          {a.termId ? (
                            <Chip label={`Term ${terms.find(t=>String(t.id)===String(a.termId))?.termNumber||'?'}`} size="small"
                              sx={{ fontWeight:700, fontSize:'0.7rem', bgcolor:'#EEF2FF', color:'#3730A3' }} />
                          ) : <Typography sx={{ fontSize:'0.78rem', color:C.muted, fontStyle:'italic', fontFamily:"'IBM Plex Sans', sans-serif" }}>—</Typography>}
                        </TableCell>
                        <TableCell sx={bodyCell}>{new Date(a.dueDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</TableCell>
                        <TableCell sx={bodyCell}>{a.totalMarks||'—'}</TableCell>
                        <TableCell sx={bodyCell}>
                          {a.weight != null
                            ? <Chip label={`${a.weight}%`} size="small" sx={{ fontWeight:700, fontSize:'0.7rem', bgcolor:'#ECFDF5', color:'#065F46' }} />
                            : <Typography sx={{ fontSize:'0.78rem', color:C.muted, fontStyle:'italic', fontFamily:"'IBM Plex Sans', sans-serif" }}>—</Typography>}
                        </TableCell>
                        <TableCell sx={{ ...bodyCell, borderRight:'none' }}>
                          <Box sx={{ display:'flex', gap:0.75, flexWrap:'wrap' }}>
                            <Button size="small" variant="outlined" onClick={()=>openSubmissions(a)} sx={{ textTransform:'none', fontWeight:600, fontSize:'0.72rem', borderColor:C.brand, color:C.brand, borderRadius:'6px', fontFamily:"'IBM Plex Sans', sans-serif" }}>Submissions</Button>
                            <Button size="small" variant="outlined" onClick={()=>openFiles(a)}       sx={{ textTransform:'none', fontWeight:600, fontSize:'0.72rem', borderColor:C.accent, color:C.accent, borderRadius:'6px', fontFamily:"'IBM Plex Sans', sans-serif" }}>Files</Button>
                            <IconButton size="small" onClick={()=>openEdit(a)} sx={{ color:C.muted }}><EditIcon sx={{ fontSize:16 }} /></IconButton>
                            <IconButton size="small" onClick={()=>handleDelete(a.id)} sx={{ color:C.danger }}><DeleteIcon sx={{ fontSize:16 }} /></IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {/* ══ MARKS TABLE VIEW ══ */}
          {view==='marks' && <MarksTableView />}
        </Box>
      </Card>

      {/* ── Create Assignment Dialog ── */}
      <Dialog open={dialog} onClose={()=>setDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx:{ borderRadius:'12px' } }}>
        <DialogTitle sx={{ fontWeight:700, color:C.text, fontFamily:"'IBM Plex Sans', sans-serif" }}>{editingId?'Edit Assignment':'New Assignment'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt:2.5, display:'flex', flexDirection:'column', gap:2 }}>
          <Box sx={{ display:'flex', gap:2 }}>
            <TextField select label="Class" value={form.classId} onChange={e=>setForm(f=>({...f,classId:e.target.value,subjectId:''}))} size="small" fullWidth>
              <MenuItem value="">— Select —</MenuItem>
              {uniqueClasses.map(c=><MenuItem key={c.classId} value={c.classId}>{c.name}</MenuItem>)}
            </TextField>
            <TextField select label="Subject" value={form.subjectId} onChange={e=>setForm(f=>({...f,subjectId:e.target.value}))} size="small" fullWidth>
              <MenuItem value="">— Select —</MenuItem>
              {uniqueSubjects.map(s=><MenuItem key={s.subjectId} value={s.subjectId}>{s.name}</MenuItem>)}
            </TextField>
          </Box>
          <TextField label="Title *" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} size="small" fullWidth />
          <TextField label="Description" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} size="small" fullWidth multiline rows={2} />
          <Box sx={{ display:'flex', gap:2 }}>
            <TextField label="Due Date *" type="date" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))} size="small" fullWidth InputLabelProps={{ shrink:true }} />
            <TextField label="Total Marks" type="number" value={form.totalMarks} onChange={e=>setForm(f=>({...f,totalMarks:e.target.value}))} size="small" fullWidth />
          </Box>
          {/* Term selector */}
          <TextField select label="Term *" value={form.termId} onChange={e=>setForm(f=>({...f,termId:e.target.value,weight:''}))} size="small" fullWidth helperText="Term is required to track weight budget">
            <MenuItem value="">— Select term —</MenuItem>
            {terms.map(t=><MenuItem key={t.id} value={t.id}>Term {t.termNumber || t.term_number}</MenuItem>)}
          </TextField>
          {/* Weight field */}
          <Box sx={{ display:'flex', gap:2, alignItems:'flex-start' }}>
            <TextField
              label="Weight (%) *" type="number" value={form.weight}
              onChange={e=>setForm(f=>({...f,weight:e.target.value}))}
              size="small" fullWidth inputProps={{ min:0.5, max:100, step:0.5 }}
              error={!!(budget && form.weight && Number(form.weight) > budget.remaining + 0.01)}
              helperText={
                !form.termId ? 'Select a term to see budget' :
                budget == null ? 'Calculating budget…' :
                budget.remaining <= 0 ? '⚠ Term budget fully allocated (100%)' :
                `${budget.remaining}% remaining for this class / subject / term`
              }
            />
            {budget != null && form.termId && (
              <Box sx={{ textAlign:'center', minWidth:56, pt:0.5 }}>
                <Typography sx={{ fontSize:'1.4rem', fontWeight:700, lineHeight:1,
                  color: budget.remaining <= 0 ? C.danger : budget.remaining < 20 ? '#F59E0B' : C.accent }}>
                  {budget.remaining}%
                </Typography>
                <Typography sx={{ fontSize:'0.65rem', color:C.muted, mt:0.25 }}>left</Typography>
              </Box>
            )}
          </Box>
          {editingId ? (
            <Typography sx={{ fontSize:'0.78rem', color:C.muted, fontStyle:'italic', fontFamily:"'IBM Plex Sans', sans-serif" }}>
              To replace the attached file, use the "Files" button on this assignment instead.
            </Typography>
          ) : (
            <Box sx={{ p:1.5, border:`1px dashed ${C.border}`, borderRadius:'8px', background:C.headerBg }}>
              <Typography sx={{ fontSize:'0.8rem', color:C.muted, mb:1, fontFamily:"'IBM Plex Sans', sans-serif" }}>📎 Attach file (PDF / image) — optional</Typography>
              <input type="file" accept="application/pdf,image/*" onChange={e=>setFile(e.target.files[0]||null)} />
              {file && <Typography sx={{ fontSize:'0.8rem', color:C.accent, mt:0.75, fontFamily:"'IBM Plex Sans', sans-serif" }}>✓ {file.name}</Typography>}
            </Box>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px:3, py:2, gap:1 }}>
          <Button onClick={()=>{ setDialog(false); setEditingId(null); }} sx={{ textTransform:'none', color:C.muted }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            sx={{ background:C.brand, textTransform:'none', fontWeight:700, boxShadow:'none', borderRadius:'8px', fontFamily:"'IBM Plex Sans', sans-serif" }}>
            {saving?'Saving…':editingId?'Save Changes':'Create Assignment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Files Dialog ── */}
      <Dialog open={!!filesDialog} onClose={()=>setFilesDialog(null)} maxWidth="sm" fullWidth PaperProps={{ sx:{ borderRadius:'12px' } }}>
        <DialogTitle sx={{ fontWeight:700, color:C.text, fontFamily:"'IBM Plex Sans', sans-serif" }}>Attached Files — {filesDialog?.title}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt:2 }}>
          {assignFiles.length===0 ? <Typography sx={{ color:C.muted, py:2, fontFamily:"'IBM Plex Sans', sans-serif" }}>No files attached.</Typography>
          : assignFiles.map(f=>(
            <Box key={f.id} sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', py:1.5, borderBottom:`1px solid ${C.border}` }}>
              <Box>
                <Typography sx={{ fontWeight:600, fontSize:'0.875rem', color:C.text, fontFamily:"'IBM Plex Sans', sans-serif" }}>{f.originalname||f.filename}</Typography>
                <Typography sx={{ fontSize:'0.75rem', color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>{f.mimetype} · {new Date(f.uploadedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</Typography>
              </Box>
              <Button size="small" variant="contained" onClick={() => openDoc(f.filename, toast)}
                sx={{ background:C.brand, textTransform:'none', fontWeight:700, boxShadow:'none', borderRadius:'6px', fontFamily:"'IBM Plex Sans', sans-serif" }}>Open</Button>
            </Box>
          ))}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px:3, py:2 }}>
          <Button onClick={()=>setFilesDialog(null)} sx={{ textTransform:'none', color:C.muted }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Submissions Dialog ── */}
      <Dialog open={!!submissionsDialog} onClose={()=>setSubmissionsDialog(null)} maxWidth="md" fullWidth PaperProps={{ sx:{ borderRadius:'12px' } }}>
        <DialogTitle sx={{ fontWeight:700, color:C.text, fontFamily:"'IBM Plex Sans', sans-serif" }}>Submissions — {submissionsDialog?.title}</DialogTitle>
        <Divider />
        <DialogContent>
          {loadingSubs ? <Box sx={{ display:'flex', justifyContent:'center', py:4 }}><CircularProgress /></Box>
          : submissions.length===0 ? <Typography sx={{ color:C.muted, py:3 }}>No submissions yet.</Typography>
          : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>{['Student','File','Submitted','Marks','Action'].map(h=><TableCell key={h} sx={headCell}>{h}</TableCell>)}</TableRow>
                </TableHead>
                <TableBody>
                  {submissions.map(s => (
                    <TableRow key={s.id}>
                      <TableCell sx={bodyCell}>{s.firstName?`${s.firstName} ${s.lastName}`:(s.studentId||'Guest')}</TableCell>
                      <TableCell sx={bodyCell}>{s.filename?<Button size="small" variant="text" onClick={()=>openDoc(s.filename,toast)} sx={{ textTransform:'none', fontWeight:600, color:C.brand, fontFamily:"'IBM Plex Sans', sans-serif", p:0, minWidth:0 }}>{s.originalname||s.filename}</Button>:'—'}</TableCell>
                      <TableCell sx={bodyCell}>{new Date(s.submittedAt).toLocaleString()}</TableCell>
                      <TableCell sx={bodyCell}>
                        <TextField size="small" type="number" defaultValue={s.marksObtained??''} onChange={e=>s.marksTmp=e.target.value} sx={{ width:80 }} />
                        {s.percentage && <Typography sx={{ fontSize:'0.72rem', color:C.muted, mt:0.5 }}>{s.percentage}%</Typography>}
                      </TableCell>
                      <TableCell sx={bodyCell}>
                        <Button size="small" variant="contained" disabled={grading[s.id]}
                          onClick={()=>handleGrade(s.id, s.marksTmp??s.marksObtained??'')}
                          sx={{ background:C.accent, textTransform:'none', boxShadow:'none', borderRadius:'6px' }}>
                          {grading[s.id]?'…':'Save'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <Divider />
        <DialogActions><Button onClick={()=>setSubmissionsDialog(null)} sx={{ textTransform:'none', color:C.muted }}>Close</Button></DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={()=>setSnack(s=>({...s,open:false}))} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert severity={snack.sev} onClose={()=>setSnack(s=>({...s,open:false}))} sx={{ fontFamily:"'IBM Plex Sans', sans-serif", fontWeight:600 }}>{snack.msg}</Alert>
      </Snackbar>
    </>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   EXAM MARKS TABLE VIEW
══════════════════════════════════════════════════════════════════════ */
const ExamMarksTableView = () => {
  const [classes,  setClasses]  = useState([]);
  const [selClass, setSelClass] = useState('');
  const [selTerm,  setSelTerm]  = useState('');
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    fetch(`${BASE}/api/teacher/dashboard`, { headers: authH() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setClasses(d.myClasses || []); });
  }, []);

  useEffect(() => {
    if (!selClass) return;
    setLoading(true); setData(null);
    const params = new URLSearchParams({ classId: selClass });
    if (selTerm) params.append('termId', selTerm);
    (async () => {
      const res = await fetch(`${BASE}/api/teacher/exams/marks-table?${params}`, { headers: authH() });
      if (res.status === 404) { setData({ exams:[], students:[], terms:[] }); setLoading(false); return; }
      if (!res.ok) { setData(null); setLoading(false); return; }
      setData(await res.json());
      setLoading(false);
    })();
  }, [selClass, selTerm]);

  const examAvg = (students, examId) => {
    const graded = students.filter(s => s.marks[String(examId)]?.percentage != null);
    if (!graded.length) return null;
    return (graded.reduce((acc,s) => acc + parseFloat(s.marks[String(examId)].percentage), 0) / graded.length).toFixed(1);
  };

  const terms   = data?.terms   || [];
  const exams   = data?.exams   || [];
  const students = data?.students || [];

  return (
    <Box>
      <Box sx={{ display:'flex', gap:2, mb:2, flexWrap:'wrap', alignItems:'center' }}>
        <TextField select label="Class" value={selClass} onChange={e=>{ setSelClass(e.target.value); setSelTerm(''); }} size="small" sx={{ minWidth:200 }}>
          <MenuItem value="">— Select class —</MenuItem>
          {classes.map(c=><MenuItem key={c.id} value={c.id}>{c.name}{c.stream?` (${c.stream})`:''}</MenuItem>)}
        </TextField>
        {terms.length > 0 && (
          <TextField select label="Term" value={selTerm} onChange={e=>setSelTerm(e.target.value)} size="small" sx={{ minWidth:160 }}>
            <MenuItem value="">All terms</MenuItem>
            {terms.map(t=><MenuItem key={t.id} value={t.id}>Term {t.termNumber}</MenuItem>)}
          </TextField>
        )}
      </Box>

      {!selClass && <Box sx={{ textAlign:'center', py:8 }}><GradeIcon sx={{ fontSize:52, color:C.border, mb:1.5 }} /><Typography sx={{ color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif", fontWeight:600 }}>Select a class to view exam marks</Typography></Box>}
      {selClass && loading && <Box sx={{ display:'flex', justifyContent:'center', py:6 }}><CircularProgress sx={{ color:C.brand }} /></Box>}
      {selClass && !loading && data && exams.length===0 && <Box sx={{ textAlign:'center', py:8 }}><GradeIcon sx={{ fontSize:52, color:C.border, mb:1.5 }} /><Typography sx={{ color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif", fontWeight:600 }}>No exams{selTerm?' for this term':''} yet</Typography></Box>}

      {selClass && !loading && data && exams.length>0 && (
        <>
          <Box sx={{ display:'flex', gap:2, mb:1.5, p:1.5, borderRadius:'8px', background:C.headerBg, border:`1px solid ${C.border}` }}>
            {[
              { label:'Students',  value: students.length },
              { label:'Assessments', value: exams.length },
              { label:'Captured',  value: students.reduce((n,s) => n + exams.filter(e => s.marks[String(e.id)]?.graded).length, 0) },
            ].map(stat => (
              <Box key={stat.label} sx={{ px:2, py:1, borderRadius:'8px', background:C.white, border:`1px solid ${C.border}` }}>
                <Typography sx={{ fontSize:'1.1rem', fontWeight:800, color:C.text, fontFamily:"'IBM Plex Sans', sans-serif", lineHeight:1 }}>{stat.value}</Typography>
                <Typography sx={{ fontSize:'0.72rem', color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>{stat.label}</Typography>
              </Box>
            ))}
          </Box>
          <TableContainer component={Paper} elevation={0} sx={{ border:`1px solid ${C.border}`, borderRadius:'8px', overflowX:'auto' }}>
            <Table size="small" sx={{ borderCollapse:'collapse', minWidth: 400 + exams.length * 110 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...headCell, minWidth:140 }}>Student</TableCell>
                  {exams.map(e=>(
                    <TableCell key={e.id} sx={{ ...headCell, textAlign:'center', minWidth:110, verticalAlign:'bottom', pb:1 }}>
                      <Typography sx={{ fontSize:'0.72rem', fontWeight:700, color:C.text, fontFamily:"'IBM Plex Sans', sans-serif", lineHeight:1.3 }}>{e.title}</Typography>
                      <Typography sx={{ fontSize:'0.65rem', color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>/{e.totalMarks}</Typography>
                    </TableCell>
                  ))}
                  <TableCell sx={{ ...headCell, textAlign:'center', borderRight:'none', minWidth:80 }}>Avg %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.map((s, idx) => {
                  const marks = exams.map(e => s.marks[String(e.id)]);
                  const graded = marks.filter(m => m?.percentage != null);
                  const avg = graded.length ? (graded.reduce((a,m)=>a+parseFloat(m.percentage),0)/graded.length).toFixed(1) : null;
                  const avgTheme = pctTheme(avg);
                  return (
                    <TableRow key={s.id} sx={{ backgroundColor:idx%2===0?C.white:C.rowAlt }}>
                      <TableCell sx={{ ...bodyCell, fontWeight:600 }}>{s.firstName} {s.lastName}</TableCell>
                      {exams.map(e => {
                        const mark = s.marks[String(e.id)];
                        const t    = pctTheme(mark?.percentage);
                        return (
                          <TableCell key={e.id} sx={{ ...bodyCell, textAlign:'center', p:'6px 8px' }}>
                            {mark ? (
                              <Box sx={{ display:'inline-flex', flexDirection:'column', alignItems:'center', px:1, py:0.5, borderRadius:'6px', bgcolor:t.bg, border:`1px solid ${t.border}`, minWidth:60 }}>
                                <Typography sx={{ fontSize:'0.82rem', fontWeight:700, color:t.text, fontFamily:"'IBM Plex Sans', sans-serif", lineHeight:1 }}>{mark.marksObtained}</Typography>
                                <Typography sx={{ fontSize:'0.65rem', color:t.text, fontFamily:"'IBM Plex Sans', sans-serif" }}>{mark.percentage}%</Typography>
                              </Box>
                            ) : <Typography sx={{ fontSize:'0.75rem', color:C.muted, fontStyle:'italic' }}>—</Typography>}
                          </TableCell>
                        );
                      })}
                      <TableCell sx={{ ...bodyCell, textAlign:'center', borderRight:'none' }}>
                        {avg ? <Box sx={{ display:'inline-flex', px:1.25, py:0.5, borderRadius:'6px', bgcolor:avgTheme.bg, border:`1px solid ${avgTheme.border}` }}><Typography sx={{ fontSize:'0.82rem', fontWeight:700, color:avgTheme.text, fontFamily:"'IBM Plex Sans', sans-serif" }}>{avg}%</Typography></Box> : <Typography sx={{ fontSize:'0.75rem', color:C.muted }}>—</Typography>}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow sx={{ background:C.headerBg }}>
                  <TableCell sx={{ ...headCell, fontWeight:700 }}>Class Avg</TableCell>
                  {exams.map(e => {
                    const avg   = examAvg(students, e.id);
                    const theme = pctTheme(avg);
                    return (
                      <TableCell key={e.id} sx={{ ...headCell, textAlign:'center' }}>
                        {avg ? <Box sx={{ display:'inline-flex', px:1, py:0.4, borderRadius:'6px', bgcolor:theme.bg, border:`1px solid ${theme.border}` }}><Typography sx={{ fontSize:'0.78rem', fontWeight:700, color:theme.text, fontFamily:"'IBM Plex Sans', sans-serif" }}>{avg}%</Typography></Box> : <Typography sx={{ fontSize:'0.75rem', color:C.muted }}>—</Typography>}
                      </TableCell>
                    );
                  })}
                  <TableCell sx={{ ...headCell, borderRight:'none' }} />
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   EXAMS TAB
══════════════════════════════════════════════════════════════════════ */
const ExamsTab = () => {
  const [exams,         setExams]         = useState([]);
  const [slots,         setSlots]         = useState([]);
  const [terms,         setTerms]         = useState([]);
  const [dialog,        setDialog]        = useState(false);
  const [editingId,     setEditingId]     = useState(null);
  const [resultsDialog, setResultsDialog] = useState(null);
  const [resultsData,   setResultsData]   = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [filterTerm,    setFilterTerm]    = useState('');
  const [view,          setView]          = useState('list'); // 'list' | 'marks'
  const [snack,         setSnack]         = useState({ open:false, msg:'', sev:'success' });
  const toast = (msg, sev='success') => setSnack({ open:true, msg, sev });

  const EMPTY = { classId:'', subjectId:'', title:'', examDate:'', totalMarks:100, type:'test', termId:'', weight:'' };
  const [form,   setForm]   = useState(EMPTY);
  const [budget, setBudget] = useState(null);

  const fetchAll = useCallback(async () => {
    const [eRes, tRes, termsRes] = await Promise.all([
      fetch(`${BASE}/api/teacher/exams`,     { headers:authH() }),
      fetch(`${BASE}/api/teacher/timetable`, { headers:authH() }),
      fetch(`${BASE}/api/teacher/terms`,     { headers:authH() }),
    ]);
    if (eRes.ok)    setExams(await eRes.json());
    if (tRes.ok)    { const d=await tRes.json(); setSlots(d.slots || []); }
    if (termsRes.ok) setTerms(await termsRes.json());
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!form.classId || !form.subjectId || !form.termId) { setBudget(null); return; }
    fetch(`${BASE}/api/teacher/weight-budget?classId=${form.classId}&subjectId=${form.subjectId}&termId=${form.termId}`, { headers:authH() })
      .then(r => r.json()).then(d => setBudget(d)).catch(() => setBudget(null));
  }, [form.classId, form.subjectId, form.termId]);

  const uniqueClasses  = [...new Map(slots.map(s=>[s.classId,{name:s.className,classId:s.classId||s.id}])).values()];
  const uniqueSubjects = [...new Map(slots.map(s=>[s.subjectName,{name:s.subjectName,subjectId:s.subjectId||s.id}])).values()];

  const handleSave = async () => {
    if (!form.classId||!form.subjectId||!form.title||!form.examDate) return toast('All fields are required','error');
    if (!form.weight || Number(form.weight) <= 0) return toast('Weight (%) is required','error');
    if (budget && Number(form.weight) > budget.remaining + 0.01) return toast(`Weight exceeds budget — only ${budget.remaining}% remaining for this term`,'error');
    setSaving(true);
    const url    = editingId ? `${BASE}/api/teacher/exams/${editingId}` : `${BASE}/api/teacher/exams`;
    const method = editingId ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers:jsonH(), body:JSON.stringify(form) });
    setSaving(false);
    if (res.ok) { toast(editingId?'Assessment updated':'Assessment created'); setDialog(false); setEditingId(null); setBudget(null); fetchAll(); }
    else { const e=await res.json(); toast(e.message||'Failed','error'); }
  };

  const openEdit = (exam) => {
    setEditingId(exam.id);
    setForm({
      classId: exam.classId, subjectId: exam.subjectId, title: exam.title,
      examDate: exam.examDate?.slice(0,10) || '', totalMarks: exam.totalMarks,
      type: exam.type, termId: exam.termId || '', weight: exam.weight ?? '',
    });
    setBudget(null);
    setDialog(true);
  };

  const handleDeleteExam = async (exam) => {
    const warn = parseInt(exam.resultsCaptured,10) > 0 ? ` This will also delete ${exam.resultsCaptured} captured result(s).` : '';
    if (!window.confirm(`Delete "${exam.title}"?${warn}`)) return;
    const res = await fetch(`${BASE}/api/teacher/exams/${exam.id}`, { method:'DELETE', headers:authH() });
    if (res.ok) { toast('Assessment deleted'); fetchAll(); }
    else { const e=await res.json(); toast(e.message||'Failed to delete','error'); }
  };

  const openResults = async (exam) => {
    setResultsDialog(exam);
    const res = await fetch(`${BASE}/api/teacher/exams/${exam.id}/results`, { headers:authH() });
    if (res.ok) setResultsData(await res.json());
  };

  const updateMark = (studentId, value) =>
    setResultsData(d => ({ ...d, students:d.students.map(s=>s.id===studentId?{...s,marksObtained:value}:s) }));

  const handleSaveResults = async () => {
    if (!resultsData) return;
    setSaving(true);
    const res = await fetch(`${BASE}/api/teacher/exams/${resultsDialog.id}/results`, { method:'POST', headers:jsonH(), body:JSON.stringify({ results:resultsData.students.map(s=>({ studentId:s.id, marksObtained:s.marksObtained })) }) });
    setSaving(false);
    if (res.ok) { toast('Results saved'); setResultsDialog(null); setResultsData(null); fetchAll(); }
    else { const e=await res.json(); toast(e.message||'Failed','error'); }
  };

  return (
    <>
      <Card>
        <Box sx={{ px:2.5, pt:2.5, pb:0 }}>
          <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:1.5 }}>
            <Box sx={{ display:'flex', gap:1 }}>
              {[
                { key:'list',  icon:<ListAltIcon sx={{ fontSize:17 }} />,   label:'Assessment List' },
                { key:'marks', icon:<TableChartIcon sx={{ fontSize:17 }} />, label:'Marks Table'     },
              ].map(v => (
                <Button key={v.key} size="small" startIcon={v.icon} onClick={()=>setView(v.key)} sx={{
                  textTransform:'none', fontWeight:700, fontFamily:"'IBM Plex Sans', sans-serif",
                  fontSize:'0.82rem', px:2, py:0.75, borderRadius:'8px',
                  background: view===v.key ? C.brand : 'transparent',
                  color:      view===v.key ? C.white : C.muted,
                  border:    `1.5px solid ${view===v.key ? C.brand : C.border}`,
                  '&:hover':{ background: view===v.key ? C.brand : C.headerBg },
                }}>{v.label}</Button>
              ))}
            </Box>
            <Box sx={{ display:'flex', gap:1 }}>
              {view==='list' && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={()=>{ setForm(EMPTY); setEditingId(null); setBudget(null); setDialog(true); }}
                  sx={{ background:C.brand, textTransform:'none', fontWeight:700, boxShadow:'none', borderRadius:'8px', fontFamily:"'IBM Plex Sans', sans-serif" }}>
                  New Assessment
                </Button>
              )}
            </Box>
          </Box>
          <Divider sx={{ borderColor:C.border }} />
        </Box>

        <Box sx={{ px:2.5, pt:2, pb:2.5 }}>
          {/* ══ LIST VIEW ══ */}
          {view==='list' && exams.length===0 && (
            <Box sx={{ textAlign:'center', py:6 }}><GradeIcon sx={{ color:C.border, fontSize:44, mb:1 }} /><Typography sx={{ color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>No assessments yet.</Typography></Box>
          )}
          {view==='list' && exams.length>0 && (
            <>
              {terms.length > 0 && (
                <Box sx={{ mb:1.5, display:'flex', alignItems:'center', gap:1, flexWrap:'wrap' }}>
                  <Typography sx={{ fontSize:'0.8rem', fontWeight:600, color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif", mr:0.5 }}>Filter by term:</Typography>
                  {[{ id:'', label:'All terms' }, ...terms.map(t=>({ id:String(t.id), label:`Term ${t.termNumber}` }))].map(opt => (
                    <Button key={opt.id} size="small" onClick={()=>setFilterTerm(opt.id)}
                      sx={{ textTransform:'none', fontWeight:700, fontFamily:"'IBM Plex Sans', sans-serif",
                        fontSize:'0.78rem', px:1.5, py:0.4, borderRadius:'6px',
                        background: filterTerm===opt.id ? C.brand : 'transparent',
                        color:      filterTerm===opt.id ? C.white : C.muted,
                        border:    `1px solid ${filterTerm===opt.id ? C.brand : C.border}`,
                        '&:hover':{ background: filterTerm===opt.id ? C.brand : C.headerBg },
                      }}>{opt.label}</Button>
                  ))}
                </Box>
              )}
              <TableContainer component={Paper} elevation={0} sx={{ border:`1px solid ${C.border}`, borderRadius:'8px' }}>
                <Table size="small" sx={{ borderCollapse:'collapse' }}>
                  <TableHead>
                    <TableRow>{['Title','Class','Subject','Term','Type','Date','Weight','Results',''].map(h=><TableCell key={h} sx={{ ...headCell, ...(h===''?{borderRight:'none'}:{}) }}>{h}</TableCell>)}</TableRow>
                  </TableHead>
                  <TableBody>
                    {(filterTerm ? exams.filter(e=>String(e.termId)===filterTerm) : exams).length===0 ? (
                      <TableRow><TableCell colSpan={8} sx={{ ...bodyCell, borderRight:'none', textAlign:'center', py:4, color:C.muted }}>No exams for this term.</TableCell></TableRow>
                    ) : (filterTerm ? exams.filter(e=>String(e.termId)===filterTerm) : exams).map((e, idx) => (
                      <TableRow key={e.id} sx={{ backgroundColor:idx%2===0?C.white:C.rowAlt, '&:hover':{ background:'#F0F7FF' } }}>
                        <TableCell sx={{ ...bodyCell, fontWeight:600 }}>{e.title}</TableCell>
                        <TableCell sx={bodyCell}>{e.className}</TableCell>
                        <TableCell sx={bodyCell}>{e.subjectName}</TableCell>
                        <TableCell sx={bodyCell}>
                          {e.termId ? <Chip label={`Term ${terms.find(t=>String(t.id)===String(e.termId))?.termNumber||'?'}`} size="small" sx={{ fontWeight:700, fontSize:'0.7rem', bgcolor:'#EEF2FF', color:'#3730A3' }} />
                            : <Typography sx={{ fontSize:'0.78rem', color:C.muted, fontStyle:'italic', fontFamily:"'IBM Plex Sans', sans-serif" }}>—</Typography>}
                        </TableCell>
                        <TableCell sx={bodyCell}><Chip label={e.type} size="small" sx={{ fontWeight:700, fontSize:'0.7rem', textTransform:'capitalize', bgcolor:'#EEF2FF', color:'#3730A3' }} /></TableCell>
                        <TableCell sx={bodyCell}>{new Date(e.examDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</TableCell>
                        <TableCell sx={bodyCell}>
                          {e.weight != null
                            ? <Chip label={`${e.weight}%`} size="small" sx={{ fontWeight:700, fontSize:'0.7rem', bgcolor:'#ECFDF5', color:'#065F46' }} />
                            : <Typography sx={{ fontSize:'0.78rem', color:C.muted, fontStyle:'italic', fontFamily:"'IBM Plex Sans', sans-serif" }}>—</Typography>}
                        </TableCell>
                        <TableCell sx={bodyCell}><Typography sx={{ fontSize:'0.82rem', fontWeight:600, color:parseInt(e.resultsCaptured)>0?C.accent:C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>{e.resultsCaptured} captured</Typography></TableCell>
                        <TableCell sx={{ ...bodyCell, borderRight:'none' }}>
                          <Box sx={{ display:'flex', gap:0.75, flexWrap:'wrap' }}>
                            <Button size="small" variant="outlined" onClick={()=>openResults(e)} sx={{ textTransform:'none', fontWeight:600, fontSize:'0.75rem', borderColor:C.brand, color:C.brand, borderRadius:'6px', fontFamily:"'IBM Plex Sans', sans-serif" }}>Enter Results</Button>
                            <IconButton size="small" onClick={()=>openEdit(e)} sx={{ color:C.muted }}><EditIcon sx={{ fontSize:16 }} /></IconButton>
                            <IconButton size="small" onClick={()=>handleDeleteExam(e)} sx={{ color:C.danger }}><DeleteIcon sx={{ fontSize:16 }} /></IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {/* ══ MARKS TABLE VIEW ══ */}
          {view==='marks' && <ExamMarksTableView />}
        </Box>
      </Card>

      <Dialog open={dialog} onClose={()=>setDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx:{ borderRadius:'12px' } }}>
        <DialogTitle sx={{ fontWeight:700, color:C.text, fontFamily:"'IBM Plex Sans', sans-serif" }}>{editingId?'Edit Assessment':'New Assessment'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt:2.5, display:'flex', flexDirection:'column', gap:2 }}>
          <Box sx={{ display:'flex', gap:2 }}>
            <TextField select label="Class" value={form.classId} onChange={e=>setForm(f=>({...f,classId:e.target.value}))} size="small" fullWidth>
              <MenuItem value="">— Select —</MenuItem>
              {uniqueClasses.map(c=><MenuItem key={c.classId} value={c.classId}>{c.name}</MenuItem>)}
            </TextField>
            <TextField select label="Subject" value={form.subjectId} onChange={e=>setForm(f=>({...f,subjectId:e.target.value}))} size="small" fullWidth>
              <MenuItem value="">— Select —</MenuItem>
              {uniqueSubjects.map(s=><MenuItem key={s.subjectId} value={s.subjectId}>{s.name}</MenuItem>)}
            </TextField>
          </Box>
          <TextField label="Title *" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} size="small" fullWidth />
          <Box sx={{ display:'flex', gap:2 }}>
            <TextField label="Date *" type="date" value={form.examDate} onChange={e=>setForm(f=>({...f,examDate:e.target.value}))} size="small" fullWidth InputLabelProps={{ shrink:true }} />
            <TextField label="Total Marks" type="number" value={form.totalMarks} onChange={e=>setForm(f=>({...f,totalMarks:e.target.value}))} size="small" fullWidth />
            <TextField select label="Type" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} size="small" fullWidth>
              {['test','exam','practical'].map(t=><MenuItem key={t} value={t} sx={{ textTransform:'capitalize' }}>{t}</MenuItem>)}
            </TextField>
          </Box>
          <TextField select label="Term *" value={form.termId} onChange={e=>setForm(f=>({...f,termId:e.target.value,weight:''}))} size="small" fullWidth helperText="Select the term this exam belongs to — used for report generation">
            <MenuItem value="">— Select term —</MenuItem>
            {terms.map(t=><MenuItem key={t.id} value={t.id}>Term {t.termNumber}</MenuItem>)}
          </TextField>
          {/* Weight field */}
          <Box sx={{ display:'flex', gap:2, alignItems:'flex-start' }}>
            <TextField
              label="Weight (%) *" type="number" value={form.weight}
              onChange={e=>setForm(f=>({...f,weight:e.target.value}))}
              size="small" fullWidth inputProps={{ min:0.5, max:100, step:0.5 }}
              error={!!(budget && form.weight && Number(form.weight) > budget.remaining + 0.01)}
              helperText={
                !form.termId ? 'Select a term to see budget' :
                budget == null ? 'Calculating budget…' :
                budget.remaining <= 0 ? '⚠ Term budget fully allocated (100%)' :
                `${budget.remaining}% remaining for this class / subject / term`
              }
            />
            {budget != null && form.termId && (
              <Box sx={{ textAlign:'center', minWidth:56, pt:0.5 }}>
                <Typography sx={{ fontSize:'1.4rem', fontWeight:700, lineHeight:1,
                  color: budget.remaining <= 0 ? C.danger : budget.remaining < 20 ? '#F59E0B' : C.accent }}>
                  {budget.remaining}%
                </Typography>
                <Typography sx={{ fontSize:'0.65rem', color:C.muted, mt:0.25 }}>left</Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px:3, py:2, gap:1 }}>
          <Button onClick={()=>{ setDialog(false); setEditingId(null); }} sx={{ textTransform:'none', color:C.muted }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ background:C.brand, textTransform:'none', fontWeight:700, boxShadow:'none', borderRadius:'8px', fontFamily:"'IBM Plex Sans', sans-serif" }}>
            {saving?'Saving…':editingId?'Save Changes':`Create ${form.type.charAt(0).toUpperCase()}${form.type.slice(1)}`}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!resultsDialog} onClose={()=>{ setResultsDialog(null); setResultsData(null); }} maxWidth="sm" fullWidth PaperProps={{ sx:{ borderRadius:'12px' } }}>
        <DialogTitle sx={{ fontWeight:700, color:C.text, fontFamily:"'IBM Plex Sans', sans-serif", pb:1 }}>
          Enter Results — {resultsDialog?.title}
          <Typography sx={{ fontSize:'0.8rem', color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>{resultsDialog?.className} · {resultsDialog?.subjectName} · Out of {resultsDialog?.totalMarks}</Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt:2 }}>
          {!resultsData ? <Box sx={{ display:'flex', justifyContent:'center', py:3 }}><CircularProgress sx={{ color:C.brand }} /></Box>
          : (
            <TableContainer>
              <Table size="small" sx={{ borderCollapse:'collapse' }}>
                <TableHead><TableRow>{['#','Student','Marks'].map(h=><TableCell key={h} sx={headCell}>{h}</TableCell>)}</TableRow></TableHead>
                <TableBody>
                  {resultsData.students.map((s, idx) => (
                      <TableRow key={s.id} sx={{ backgroundColor:idx%2===0?C.white:C.rowAlt }}>
                        <TableCell sx={{ ...bodyCell, color:C.muted, width:40, textAlign:'center' }}>{idx+1}</TableCell>
                        <TableCell sx={{ ...bodyCell, fontWeight:600 }}>{s.firstName} {s.lastName}</TableCell>
                        <TableCell sx={{ ...bodyCell, borderRight:'none' }}>
                          <Box sx={{ display:'flex', gap:1, alignItems:'center' }}>
                            <TextField value={s.marksObtained} type="number" size="small" variant="standard" onChange={e=>updateMark(s.id,e.target.value)} inputProps={{ min:0, max:resultsDialog?.totalMarks, step:0.5 }} sx={{ width:80 }} />
                            <input accept="application/pdf,image/*" style={{ display:'none' }} id={`exam-scan-${resultsDialog.id}-${s.id}`} type="file" onChange={async (e) => {
                              const f = e.target.files?.[0]; if (!f) return;
                              const fd = new FormData(); fd.append('file', f); fd.append('studentId', s.id); fd.append('assessmentId', resultsDialog.id);
                              try {
                                const tok = sessionStorage.getItem('teacherToken');
                                const res = await fetch(`${BASE}/api/exams/upload`, { method: 'POST', headers: { Authorization: `Bearer ${tok}` }, body: fd });
                                if (!res.ok) { const err = await res.json().catch(()=>({})); throw new Error(err.message||'Upload failed'); }
                                setSnack({ open:true, msg:'Scan uploaded', sev:'success' });
                              } catch (err) { console.error(err); setSnack({ open:true, msg:err.message||'Upload failed', sev:'error' }); }
                              e.target.value = '';
                            }} />
                            <label htmlFor={`exam-scan-${resultsDialog.id}-${s.id}`}><Button size="small" variant="outlined" component="span" sx={{ textTransform:'none' }}>Upload Scan</Button></label>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px:3, py:2, gap:1 }}>
          <Button onClick={()=>{ setResultsDialog(null); setResultsData(null); }} sx={{ textTransform:'none', color:C.muted }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveResults} disabled={saving||!resultsData} sx={{ background:C.accent, textTransform:'none', fontWeight:700, boxShadow:'none', borderRadius:'8px', fontFamily:"'IBM Plex Sans', sans-serif" }}>
            {saving?'Saving…':'Save Results'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={()=>setSnack(s=>({...s,open:false}))} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert severity={snack.sev} onClose={()=>setSnack(s=>({...s,open:false}))} sx={{ fontFamily:"'IBM Plex Sans', sans-serif", fontWeight:600 }}>{snack.msg}</Alert>
      </Snackbar>
    </>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   STUDENTS TAB
══════════════════════════════════════════════════════════════════════ */
const StudentsTab = ({ initClassId }) => {
  const [classes,  setClasses]  = useState([]);
  const [classId,  setClassId]  = useState(initClassId || '');
  const [classInfo,setClassInfo]= useState(null);
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`${BASE}/api/teacher/dashboard`, { headers:authH() });
      if (res.ok) { const d=await res.json(); setClasses(d.myClasses||[]); }
    })();
  }, []);

  useEffect(() => {
    if (!classId) return;
    (async () => {
      setLoading(true); setStudents([]); setClassInfo(null);
      const res = await fetch(`${BASE}/api/teacher/classes/${classId}/students`, { headers:authH() });
      if (res.ok) { const d=await res.json(); setClassInfo(d.class); setStudents(d.students||[]); }
      setLoading(false);
    })();
  }, [classId]);

  return (
    <Card>
      <CardHeader title="Class Students" subtitle="View students enrolled in your classes" />
      <Box sx={{ px:2.5, pb:2.5 }}>
        <Box sx={{ mb:3 }}>
          <TextField select label="Select Class" value={classId} onChange={e=>setClassId(e.target.value)} size="small" sx={{ minWidth:220 }}>
            <MenuItem value="">— Select a class —</MenuItem>
            {classes.map(c=><MenuItem key={c.id} value={c.id}>{c.name}{c.stream?` (${c.stream})`:''}</MenuItem>)}
          </TextField>
        </Box>
        {classInfo && (
          <Box sx={{ display:'flex', alignItems:'center', gap:1.5, mb:2.5, p:1.5, borderRadius:'8px', background:'#EEF2FF', border:'1px solid #C7D2FE' }}>
            <Typography sx={{ fontWeight:800, fontSize:'1.2rem', color:C.text, fontFamily:"'IBM Plex Sans', sans-serif" }}>{classInfo.name}</Typography>
            {classInfo.stream && <Chip label={classInfo.stream} size="small" sx={{ fontWeight:700, fontSize:'0.72rem', bgcolor:'#EEF2FF', color:'#3730A3' }} />}
            <Typography sx={{ fontSize:'0.82rem', color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>Grade {classInfo.grade} · {students.length} student{students.length!==1?'s':''}</Typography>
          </Box>
        )}
        {loading && <Box sx={{ display:'flex', justifyContent:'center', py:4 }}><CircularProgress sx={{ color:C.brand }} /></Box>}
        {!loading && !classId && (
          <Box sx={{ textAlign:'center', py:6 }}>
            <PeopleAltIcon sx={{ color:C.border, fontSize:44, mb:1 }} />
            <Typography sx={{ color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>Select a class above to view its students.</Typography>
          </Box>
        )}
        {!loading && students.length > 0 && (
          <TableContainer component={Paper} elevation={0} sx={{ border:`1px solid ${C.border}`, borderRadius:'8px' }}>
            <Table size="small" sx={{ borderCollapse:'collapse' }}>
              <TableHead><TableRow>{['#','Student No.','Name','Gender','Email','Phone'].map((h,i,arr)=><TableCell key={h} sx={{ ...headCell, ...(i===arr.length-1?{borderRight:'none'}:{}) }}>{h}</TableCell>)}</TableRow></TableHead>
              <TableBody>
                {students.map((s, idx) => (
                  <TableRow key={s.id} sx={{ backgroundColor:idx%2===0?C.white:C.rowAlt, '&:hover':{ background:'#F0F7FF' } }}>
                    <TableCell sx={{ ...bodyCell, color:C.muted, textAlign:'center', width:40 }}>{idx+1}</TableCell>
                    <TableCell sx={{ ...bodyCell, fontFamily:'monospace', fontSize:'0.8rem', color:C.text, fontWeight:700 }}>{s.studentNumber}</TableCell>
                    <TableCell sx={{ ...bodyCell, fontWeight:600 }}>{s.firstName} {s.lastName}</TableCell>
                    <TableCell sx={bodyCell}>{s.gender||'—'}</TableCell>
                    <TableCell sx={{ ...bodyCell, color:'#1565C0' }}>{s.email||'—'}</TableCell>
                    <TableCell sx={{ ...bodyCell, borderRight:'none' }}>{s.phone||'—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Card>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   ROOT SHELL
══════════════════════════════════════════════════════════════════════ */
const PAGE_META = {
  dashboard:   { title:'Dashboard',   subtitle:"Welcome back — here's what's happening today" },
  timetable:   { title:'Timetable',   subtitle:'Your weekly lesson schedule' },
  attendance:  { title:'Attendance',  subtitle:'Mark and review student attendance' },
  students:    { title:'Students',    subtitle:'View students in your classes' },
  assignments: { title:'Assignments', subtitle:'Manage assignments and view marks by term' },
  exams:       { title:'Assessments',  subtitle:'Create tests, exams & practicals — set weights and capture results' },
  quizzes: { title:'AI Quizzes', subtitle:'Generate quizzes from your learning materials using AI' },
  materials: { title:'Learning Materials', subtitle:'Notes and resources students see, grouped by subject' },
};

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [tab,       setTab]       = useState('dashboard');
  const [tabParams, setTabParams] = useState({});

  const firstName = sessionStorage.getItem('teacherFirstName') || '';
  const lastName  = sessionStorage.getItem('teacherLastName')  || '';
  const school    = sessionStorage.getItem('teacherSchool')    || '';
  const teacherToken = sessionStorage.getItem('teacherToken') || '';
  const schoolId = (() => {
    try {
      const payload = teacherToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(payload)).schoolId || '';
    } catch { return ''; }
  })();

  const handleLogout = () => {
    ['teacherToken','teacherFirstName','teacherLastName','teacherSchool'].forEach(k=>sessionStorage.removeItem(k));
    navigate('/teacher-login');
  };

  const navigateTab = (tabName, params={}) => { setTab(tabName); setTabParams(params); };

  const NAV = [
    { key:'dashboard',   label:'Dashboard',   icon:<DashboardIcon sx={{ fontSize:20 }} /> },
    { key:'timetable',   label:'Timetable',   icon:<CalendarMonthIcon sx={{ fontSize:20 }} /> },
    { key:'attendance',  label:'Attendance',  icon:<CheckCircleIcon sx={{ fontSize:20 }} /> },
    { key:'students',    label:'Students',    icon:<PeopleAltIcon sx={{ fontSize:20 }} /> },
    { key:'assignments', label:'Assignments', icon:<AssignmentIcon sx={{ fontSize:20 }} /> },
    { key:'exams',       label:'Assessments', icon:<GradeIcon sx={{ fontSize:20 }} /> },
    { key:'materials',   label:'Learning Materials', icon:<ArticleIcon sx={{ fontSize:20 }} /> },
    { key:'quizzes',     label:'AI Quizzes',  icon:<QuizIcon sx={{ fontSize:20 }} /> },
  ];

  const meta    = PAGE_META[tab] || PAGE_META.dashboard;
  const hour    = new Date().getHours();
  const greeting = hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';

  return (
    <Box sx={{ display:'flex', minHeight:'100vh', background:C.bg, fontFamily:"'IBM Plex Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Sidebar */}
      <Box sx={{ width:SIDEBAR_W, flexShrink:0, background:C.sidebar, display:'flex', flexDirection:'column', position:'fixed', top:0, left:0, height:'100vh', zIndex:100, boxShadow:'2px 0 12px rgba(0,0,0,0.18)' }}>
        <Box sx={{ px:2.5, py:3, borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:1.25, mb:0.25 }}>
            <Box sx={{ width:32, height:32, borderRadius:'8px', background:'#1E4B8A', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <MenuBookIcon sx={{ color:'#5B9BD5', fontSize:18 }} />
            </Box>
            <Typography sx={{ color:'#fff', fontWeight:800, fontSize:'0.95rem', letterSpacing:'0.03em', fontFamily:"'IBM Plex Sans', sans-serif" }}>TEACHER</Typography>
          </Box>
          <Typography sx={{ color:'rgba(255,255,255,0.4)', fontSize:'0.7rem', ml:'44px', fontFamily:"'IBM Plex Sans', sans-serif" }}>PORTAL</Typography>
        </Box>
        <Box sx={{ px:2.5, py:1.5, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <SchoolLogoHeader
            schoolId={schoolId}
            token={teacherToken}
            logoHeight={34}
            sx={{ mb:1.25, p:0.75, background:'#fff', borderRadius:'8px', display:'inline-flex' }}
          />
          <Typography sx={{ color:'rgba(255,255,255,0.35)', fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:"'IBM Plex Sans', sans-serif" }}>School</Typography>
          <Typography sx={{ color:'rgba(255,255,255,0.75)', fontSize:'0.78rem', fontWeight:600, mt:0.25, fontFamily:"'IBM Plex Sans', sans-serif" }}>{school||'—'}</Typography>
        </Box>
        <Box sx={{ flex:1, py:1.5, overflowY:'auto' }}>
          {NAV.map(n => <NavItem key={n.key} active={tab===n.key} onClick={()=>{ setTab(n.key); setTabParams({}); }} icon={n.icon} label={n.label} badge={n.badge} />)}
        </Box>
        <Box sx={{ px:2.5, py:2, borderTop:'1px solid rgba(255,255,255,0.08)' }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:1.25 }}>
            <Box sx={{ width:34, height:34, borderRadius:'50%', background:'#1E4B8A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Typography sx={{ color:'#5B9BD5', fontWeight:800, fontSize:'0.82rem', fontFamily:"'IBM Plex Sans', sans-serif" }}>{firstName?.[0]}{lastName?.[0]}</Typography>
            </Box>
            <Box sx={{ flex:1, minWidth:0 }}>
              <Typography sx={{ color:'#fff', fontWeight:700, fontSize:'0.8rem', fontFamily:"'IBM Plex Sans', sans-serif", overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{firstName} {lastName}</Typography>
              <Typography sx={{ color:'rgba(255,255,255,0.4)', fontSize:'0.68rem', fontFamily:"'IBM Plex Sans', sans-serif" }}>Teacher</Typography>
            </Box>
            <Tooltip title="Logout">
              <IconButton onClick={handleLogout} size="small" sx={{ color:'rgba(255,255,255,0.4)', '&:hover':{ color:'#fff' } }}>
                <LogoutIcon sx={{ fontSize:18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* Main content */}
      <Box sx={{ flex:1, ml:`${SIDEBAR_W}px`, display:'flex', flexDirection:'column', minHeight:'100vh' }}>
        <Box sx={{ background:C.white, borderBottom:`1px solid ${C.border}`, px:4, py:2.5, display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:50 }}>
          <Box>
            <Typography sx={{ fontWeight:800, fontSize:'1.25rem', color:C.text, fontFamily:"'IBM Plex Sans', sans-serif", lineHeight:1.2 }}>{meta.title}</Typography>
            <Typography sx={{ fontSize:'0.8rem', color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>
              {tab==='dashboard' ? `${greeting}, ${firstName} — ${new Date().toLocaleDateString('en-GB',{ weekday:'long', day:'numeric', month:'long', year:'numeric' })}` : meta.subtitle}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ flex:1, p:4, maxWidth:1200 }}>
          {tab==='dashboard'   && <DashboardTab   onNavigate={navigateTab} />}
          {tab==='timetable'   && <TimetableTab   />}
          {tab==='attendance'  && <AttendanceTab  initSlotId={tabParams.slotId} />}
          {tab==='students'    && <StudentsTab    initClassId={tabParams.classId} />}
          {tab==='assignments' && <AssignmentsTab />}
          {tab==='exams'       && <ExamsTab       />}
          {tab==='materials'   && <MaterialsTab   />}
          {tab==='quizzes' && <QuizTab onGoToMaterials={()=>navigateTab('materials')} />}
        </Box>
      </Box>
    </Box>
  );
};

export default TeacherDashboard;




