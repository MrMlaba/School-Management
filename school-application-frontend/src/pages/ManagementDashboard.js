import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Chip, Divider, Avatar, CircularProgress,
  TextField, MenuItem, IconButton, Tooltip, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle,
  DialogContent, DialogActions, Snackbar, Alert, Switch,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTip, ResponsiveContainer, Legend,
} from 'recharts';

import DashboardIcon      from '@mui/icons-material/Dashboard';
import PeopleAltIcon      from '@mui/icons-material/PeopleAlt';
import SchoolIcon         from '@mui/icons-material/School';
import CalendarMonthIcon  from '@mui/icons-material/CalendarMonth';
import SettingsIcon       from '@mui/icons-material/Settings';
import LogoutIcon         from '@mui/icons-material/Logout';
import SwapHorizIcon      from '@mui/icons-material/SwapHoriz';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import HourglassTopIcon   from '@mui/icons-material/HourglassTop';
import AddIcon            from '@mui/icons-material/Add';
import DeleteIcon         from '@mui/icons-material/Delete';
import EditIcon           from '@mui/icons-material/Edit';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import WarningAmberIcon   from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon   from '@mui/icons-material/InfoOutlined';
import CloseIcon          from '@mui/icons-material/Close';
import KeyIcon            from '@mui/icons-material/Key';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import * as XLSX from 'xlsx';
import EventIcon        from '@mui/icons-material/Event';
import CampaignIcon     from '@mui/icons-material/Campaign';
import AssessmentIcon   from '@mui/icons-material/Assessment';
import PushPinIcon      from '@mui/icons-material/PushPin';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import RestoreIcon from '@mui/icons-material/Restore';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import SchoolLogoHeader from '../components/SchoolLogoHeader';
/* ═══════════════════════════════════════════════════════════════
   TOKENS
═══════════════════════════════════════════════════════════════ */
const C = {
  brand:    '#1A3557', brandDark: '#122740',   // restored navy-blue (primary buttons / headers / accents)
  accent:   '#2E7D32',                       // semantic GREEN (active / success / present)
  sidebar:  '#f9f9f9', sidebarAct: '#eeeeee',
  border:   '#dadada',
  text:     '#000000', muted: '#7a7a7a',
  white:    '#ffffff', bg: '#f0f0f0',
  danger:   '#C62828', dangerBg: '#FFEBEE',   // semantic RED (delete / deactivate / absent)
  warn:     '#D97706', warnBg: '#FFFBEB',
  headerBg: '#ededed',
  /* ── enterprise chrome ── */
  menubar:    '#111111',   // strong black top menu bar
  menubarHi:  '#262626',   // hover state on the menu bar
  menubarTxt: '#eeeeee',
  link:       '#1565C0',   // restored link blue  
  tabBar:     '#e7e7e7',   // tab strip background
  tabIdle:    '#ededed',   // inactive tab
  dock:       '#f4f4f4',   // bottom icon dock
};

const BASE  = 'https://school-management-production-6167.up.railway.app';
const authH = () => ({ Authorization: `Bearer ${sessionStorage.getItem('adminToken')}` });
const jsonH = () => ({ 'Content-Type': 'application/json', ...authH() });

const hc = {
  background: C.headerBg, color: C.brand, fontWeight: 700,
  fontSize:'0.63rem', letterSpacing: '0.05em', textTransform: 'uppercase',
  borderBottom: `2px solid ${C.brand}`, borderRight: `1px solid ${C.border}`,
  padding: '8px 12px', whiteSpace: 'nowrap', fontFamily: "'IBM Plex Sans', sans-serif",
};
const bc = {
  fontSize:'0.73rem', color: C.text,
  borderBottom: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`,
  padding: '7px 12px', fontFamily: "'IBM Plex Sans', sans-serif",
};

const DAYS    = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
const GRADES  = [8,9,10,11,12];
const STREAMS = ['Science','Commerce','Humanities'];
const LETTERS = ['A','B','C','D','E','F'];
const TERMS   = [1,2,3,4];

const toast_ = (setSnack) => (msg, sev = 'success') => setSnack({ open: true, msg, sev });

/* ═══════════════════════════════════════════════════════════════
   SHARED UI
═══════════════════════════════════════════════════════════════ */
const Card_ = ({ children, sx = {} }) => (
  <Box sx={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '4px', p: 2.5, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', mb: 2.5, ...sx }}>
    {children}
  </Box>
);

const SectionHead = ({ title, subtitle, action }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
    <Box sx={{ pl: 1.25, borderLeft: `3px solid ${C.brand}` }}>
      <Typography sx={{ fontWeight: 700, fontSize:'0.88rem', color: C.brand, fontFamily: "'IBM Plex Sans', sans-serif" }}>{title}</Typography>
      {subtitle && <Typography sx={{ fontSize:'0.7rem', color: C.muted, mt: 0.25, fontFamily: "'IBM Plex Sans', sans-serif" }}>{subtitle}</Typography>}
    </Box>
    {action}
  </Box>
);

const InfoBanner = ({ children, color = C.warn, bg = C.warnBg, border = '#FDE68A' }) => (
  <Box sx={{ background: bg, border: `1px solid ${border}`, borderRadius: '4px', p: 1.5, mb: 2, display: 'flex', gap: 1.5 }}>
    <InfoOutlinedIcon sx={{ color, fontSize: 18, mt: 0.1, flexShrink: 0 }} />
    <Typography sx={{ fontSize:'0.7rem', color: '#92400E', fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1.5 }}>{children}</Typography>
  </Box>
);

const Snack_ = ({ snack, onClose }) => (
  <Snackbar open={snack.open} autoHideDuration={4000} onClose={onClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
    <Alert severity={snack.sev} onClose={onClose} sx={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}>{snack.msg}</Alert>
  </Snackbar>
);

/* ═══════════════════════════════════════════════════════════════
   MASTER–DETAIL PRIMITIVES
   (label-left/input-right form rows, docked Save/Reset footer)
═══════════════════════════════════════════════════════════════ */
const FormRow = ({ label, required, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1.75 }}>
    <Typography sx={{ width: 130, flexShrink: 0, fontSize:'0.67rem', fontWeight: 600, color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif", pt: '8px' }}>
      {label}{required && <Box component="span" sx={{ color: C.danger }}> *</Box>}
    </Typography>
    <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
  </Box>
);

const DetailEmpty = ({ icon, text }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.muted, py: 6 }}>
    {icon}
    <Typography sx={{ fontSize:'0.75rem', mt: 1, fontFamily: "'IBM Plex Sans', sans-serif" }}>{text}</Typography>
  </Box>
);

const DetailPanel = ({ title, onClose, createdAt, fmt, onReset, onSave, saving, saveLabel, footer = true, children }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
      <Typography sx={{ fontWeight: 700, fontSize:'0.77rem', color: C.brand, fontFamily: "'IBM Plex Sans', sans-serif" }}>{title}</Typography>
      <IconButton size="small" onClick={onClose} sx={{ color: C.muted }}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>
    </Box>
    <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
      {children}
      {createdAt && (
        <Typography sx={{ fontSize:'0.62rem', color: C.muted, mt: 2, pt: 1.5, borderTop: `1px solid ${C.border}`, fontFamily: "'IBM Plex Sans', sans-serif" }}>
          Created: {fmt(createdAt)}
        </Typography>
      )}
    </Box>
    {footer && (
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, px: 2, py: 1.5, borderTop: `1px solid ${C.border}`, background: C.headerBg, flexShrink: 0 }}>
        <Button size="small" onClick={onReset} sx={{ textTransform: 'none', color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif" }}>Reset</Button>
        <Button size="small" variant="contained" onClick={onSave} disabled={saving}
          sx={{ background: C.brand, textTransform: 'none', fontWeight: 700, boxShadow: 'none', fontFamily: "'IBM Plex Sans', sans-serif" }}>
          {saving ? 'Saving…' : (saveLabel || 'Save')}
        </Button>
      </Box>
    )}
  </Box>
);

/* ═══════════════════════════════════════════════════════════════
   OVERVIEW
═══════════════════════════════════════════════════════════════ */
const OverviewSection = () => {
  const [stats,   setStats]   = useState(null);
  const [teachers,setTeachers]= useState([]);
  const [recent,  setRecent]  = useState([]);
  const [attData, setAttData] = useState([
    {day:'Mon',present:0,absent:0},{day:'Tue',present:0,absent:0},
    {day:'Wed',present:0,absent:0},{day:'Thu',present:0,absent:0},{day:'Fri',present:0,absent:0},
  ]);
  const [announcements, setAnnouncements] = useState([]);
  const [events,        setEvents]        = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  (async () => {
    setLoading(true);
    try {
      const [s, t, r, att, ann, evt] = await Promise.all([
        fetch(`${BASE}/api/management/enrollment-stats`,           { headers: authH() }),
        fetch(`${BASE}/api/management/teachers`,                   { headers: authH() }),
        fetch(`${BASE}/api/management/enrolled-students?recent=1`, { headers: authH() }),
        fetch(`${BASE}/api/management/attendance/weekly`,          { headers: authH() }),
        fetch(`${BASE}/api/management/announcements`,              { headers: authH() }),
        fetch(`${BASE}/api/management/events/upcoming`, { headers: authH() }),
      ]);
      if (s.ok) setStats(await s.json());
      if (t.ok) setTeachers(await t.json());
      if (r.ok) setRecent(await r.json());
      if (ann.ok) setAnnouncements(await ann.json());
      if (evt.ok) setEvents(await evt.json());
      if (att.ok) {
        const attRows = await att.json();
        const dayMap = {
          Mon: { day:'Mon', present:0, absent:0 },
          Tue: { day:'Tue', present:0, absent:0 },
          Wed: { day:'Wed', present:0, absent:0 },
          Thu: { day:'Thu', present:0, absent:0 },
          Fri: { day:'Fri', present:0, absent:0 },
        };
        attRows.forEach(row => {
          if (dayMap[row.dayName]) {
            dayMap[row.dayName].present = parseInt(row.present, 10);
            dayMap[row.dayName].absent  = parseInt(row.absent,  10);
          }
        });
        setAttData(Object.values(dayMap));
      }
    } finally { setLoading(false); }
  })();
}, []);

  const StatCard = ({ label, value, icon, bg, color, border, sub }) => (
    <Tooltip title={sub || ''} disableHoverListener={!sub}>
      <Box sx={{ flex:'1 1 0', minWidth:0, display:'flex', alignItems:'center', gap:1, background:C.white, border:`1px solid ${border}`, borderRadius:'6px', px:1.25, py:0.85, boxShadow:'0 1px 2px rgba(0,0,0,0.04)' }}>
        <Box sx={{ width:26, height:26, borderRadius:'6px', background:bg, display:'flex', alignItems:'center', justifyContent:'center', color, flexShrink:0 }}>{icon}</Box>
        <Box sx={{ minWidth:0, overflow:'hidden' }}>
          <Typography sx={{ fontSize:'0.92rem', fontWeight:800, color:C.text, lineHeight:1.1, fontFamily:"'IBM Plex Sans', sans-serif", whiteSpace:'nowrap' }}>{value ?? 0}</Typography>
          <Typography sx={{ fontSize:'0.52rem', fontWeight:600, color:C.muted, textTransform:'uppercase', letterSpacing:'0.04em', fontFamily:"'IBM Plex Sans', sans-serif", whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{label}</Typography>
        </Box>
      </Box>
    </Tooltip>
  );

  const [calDate,setCalDate] = useState(new Date());
  const today = new Date();
  const yr = calDate.getFullYear(), mo = calDate.getMonth();
  const offset = (new Date(yr,mo,1).getDay()+6)%7;
  const days_ = new Date(yr,mo+1,0).getDate();
  const cells = [...Array(offset).fill(null),...Array.from({length:days_},(_,i)=>i+1)];

  if (loading) return <Box sx={{display:'flex',justifyContent:'center',py:8}}><CircularProgress sx={{color:C.brand}}/></Box>;

  return (
    <Box>
      <Box sx={{display:'flex',gap:2.5,mb:2.5,flexWrap:'wrap',alignItems:'flex-start'}}>

        {/* ── LEFT: stat cards + attendance chart (wider) ── */}
        <Box sx={{flex:'2 1 480px',minWidth:320,display:'flex',flexDirection:'column',gap:2.5}}>
          <Box sx={{display:'flex',flexWrap:'nowrap',gap:1.5}}>
            <StatCard label="Enrolled Students"  value={stats?.totalEnrolled}                     icon={<PeopleAltIcon sx={{fontSize:15}}/>}      bg="#f2f2f2" color="#5b5b5b" border="#d4d4d4"/>
            <StatCard label="Teachers"           value={teachers.filter(t=>t.isActive).length}    icon={<SchoolIcon sx={{fontSize:15}}/>}         bg="#f8f8f8" color="#7b7b7b" border="#dedede"/>
            <StatCard label="Parents"            value={stats?.totalParents}                       icon={<FamilyRestroomIcon sx={{fontSize:15}}/>} bg="#f8f8f8" color="#6f6f6f" border="#e1e1e1"/>
            <StatCard label="Pending Enrollment" value={stats?.pendingEnrollment} sub="Awaiting physical arrival" icon={<HourglassTopIcon sx={{fontSize:15}}/>} bg="#f5f5f5" color="#5d5d5d" border="#dcdcdc"/>
          </Box>

          <Card_ sx={{mb:0}}>
            <SectionHead title="Attendance This Week" subtitle="Daily present vs absent"/>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={attData} barSize={16} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                <XAxis dataKey="day" tick={{fontSize:11,fontFamily:"'IBM Plex Sans', sans-serif",fill:C.muted}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fontFamily:"'IBM Plex Sans', sans-serif",fill:C.muted}} axisLine={false} tickLine={false}/>
                <ReTip contentStyle={{fontFamily:"'IBM Plex Sans', sans-serif",fontSize:11,borderRadius:6,border:`1px solid ${C.border}`}}/>
                <Legend wrapperStyle={{fontSize:11,fontFamily:"'IBM Plex Sans', sans-serif"}}/>
                <Bar dataKey="present" fill={C.accent} radius={[4,4,0,0]} name="Present"/>
                <Bar dataKey="absent"  fill={C.danger} radius={[4,4,0,0]} name="Absent"/>
              </BarChart>
            </ResponsiveContainer>
          </Card_>
        </Box>

        {/* ── RIGHT: calendar + announcements + upcoming events (narrower) ── */}
        <Box sx={{flex:'1 1 300px',minWidth:280,maxWidth:380,display:'flex',flexDirection:'column',gap:2.5}}>

          <Card_ sx={{mb:0}}>
            <Box sx={{display:'flex',justifyContent:'space-between',alignItems:'center',mb:1.5}}>
              <Typography sx={{fontWeight:700,fontSize:'0.75rem',color:C.text,fontFamily:"'IBM Plex Sans', sans-serif"}}>
                {calDate.toLocaleDateString('en-US',{month:'long',year:'numeric'})}
              </Typography>
              <Box sx={{display:'flex',gap:0.25}}>
                {['‹','›'].map((ch,i)=>(
                  <Box key={i} onClick={()=>setCalDate(new Date(yr,mo+(i===0?-1:1),1))}
                    sx={{width:22,height:22,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',borderRadius:'4px',fontSize:'0.75rem',color:C.muted,'&:hover':{background:C.sidebarAct}}}>
                    {ch}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box sx={{display:'grid',gridTemplateColumns:'repeat(7, 1fr)',mb:0.5}}>
              {['M','T','W','T','F','S','S'].map((d,i)=>(
                <Box key={i} sx={{textAlign:'center',fontSize:'0.58rem',fontWeight:600,color:C.muted,py:'2px',fontFamily:"'IBM Plex Sans', sans-serif"}}>{d}</Box>
              ))}
            </Box>
            <Box sx={{display:'grid',gridTemplateColumns:'repeat(7, 1fr)',gap:'1px'}}>
              {cells.map((d,i)=>{
                const isToday=d&&today.getDate()===d&&today.getMonth()===mo&&today.getFullYear()===yr;
                return <Box key={i} sx={{textAlign:'center',py:'4px',borderRadius:'50%',fontSize:'0.66rem',fontFamily:"'IBM Plex Sans', sans-serif",fontWeight:isToday?800:400,background:isToday?C.brand:'transparent',color:isToday?C.white:d?C.text:'transparent','&:hover':d&&!isToday?{background:C.sidebarAct}:{}}}>{d||''}</Box>;
              })}
            </Box>
          </Card_>

          {/* Announcements */}
          <Card_ sx={{ mb: 0 }}>
            <SectionHead title="Announcements" subtitle="Recent notices — all audiences shown"/>
            {announcements.length === 0 ? (
              <Typography sx={{ color: C.muted, fontSize:'0.77rem', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                No announcements yet.
              </Typography>
            ) : (
              announcements.slice(0, 5).map(a => {
                const AUDIENCE_COLOR = {
                  all:      { bg: '#f2f2f2', color: '#3f3f3f' },
                  teachers: { bg: '#f8f8f8', color: '#626262' },
                  students: { bg: '#f8f8f8', color: '#484848' },
                };
                const ac = AUDIENCE_COLOR[a.audience] || AUDIENCE_COLOR.all;
                return (
                  <Box key={a.id} sx={{
                    py: 1.25, borderBottom: `1px solid ${C.border}`,
                    borderLeft: a.isPinned ? `3px solid ${C.brand}` : '3px solid transparent',
                    pl: 1,
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.25 }}>
                      <Typography sx={{ fontWeight: 700, fontSize:'0.77rem', color: C.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                        {a.title}
                      </Typography>
                      <Chip label={a.audience} size="small"
                        sx={{ height: 17, fontSize:'0.58rem', fontWeight: 700, bgcolor: ac.bg, color: ac.color, textTransform: 'capitalize' }} />
                    </Box>
                    <Typography sx={{ fontSize:'0.7rem', color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                      {a.body?.length > 100 ? a.body.slice(0, 100) + '…' : a.body}
                    </Typography>
                  </Box>
                );
              })
            )}
          </Card_>

          {/* Upcoming Events */}
          <Card_ sx={{ mb: 0 }}>
            <SectionHead title="Upcoming Events" subtitle="This month's school calendar"/>
            {events.length === 0 ? (
              <Typography sx={{ color: C.muted, fontSize:'0.77rem', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                No events this month.
              </Typography>
            ) : (
              events

                .slice(0, 5)
                .map(ev => {
                  const EVENT_COLOR = {
                    general: '#5b5b5b', exam: '#4a4a4a', holiday: '#484848',
                    meeting: '#626262', sport: '#515151', other: '#404040',
                  };
                  return (
                    <Box key={ev.id} sx={{ display: 'flex', gap: 1.5, py: 1.25, borderBottom: `1px solid ${C.border}`, alignItems: 'flex-start' }}>
                      <Box sx={{ width: 4, alignSelf: 'stretch', borderRadius: '4px', flexShrink: 0,
                        background: EVENT_COLOR[ev.type] || EVENT_COLOR.other }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 700, fontSize:'0.77rem', color: C.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                          {ev.title}
                        </Typography>
                        <Typography sx={{ fontSize:'0.66rem', color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                          {new Date((ev.eventDate||'').slice(0,10) + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                          {ev.eventTime ? ` · ${ev.eventTime.slice(0,5)}` : ''}
                          {ev.location  ? ` · ${ev.location}` : ''}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })
            )}
          </Card_>

        </Box>
      </Box>

      <Card_ sx={{mb:0}}>
        <SectionHead title="Recently Enrolled" subtitle="Students enrolled in the last 7 days"/>
        {recent.length===0 ? (
          <Typography sx={{color:C.muted,fontSize:'0.77rem',textAlign:'center',py:3,fontFamily:"'IBM Plex Sans', sans-serif"}}>No students enrolled in the last 7 days.</Typography>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{border:`1px solid ${C.border}`,borderRadius:'4px'}}>
            <Table size="small" sx={{borderCollapse:'collapse'}}>
              <TableHead><TableRow>
                {['Student No.','Name','Grade','Stream','Enrolled'].map(h=>(
                  <TableCell key={h} sx={{...hc,...(h==='Enrolled'?{borderRight:'none'}:{})}}>{h}</TableCell>
                ))}
              </TableRow></TableHead>
              <TableBody>
                {recent.map((s,idx)=>(
                  <TableRow key={s.id} sx={{backgroundColor:idx%2===0?C.white:'#fbfbfb','&:hover':{backgroundColor:'#f9f9f9'}}}>
                    <TableCell sx={{...bc,fontFamily:'monospace',fontSize:'0.7rem',color:C.brand,fontWeight:700}}>{s.studentNumber}</TableCell>
                    <TableCell sx={{...bc,fontWeight:600}}>{s.firstName} {s.lastName}</TableCell>
                    <TableCell sx={bc}>{s.grade}</TableCell>
                    <TableCell sx={bc}>{s.stream?<Chip label={s.stream} size="small" sx={{fontSize:'0.62rem',fontWeight:700,bgcolor:'#f2f2f2',color:'#3f3f3f'}}/>:'—'}</TableCell>
                    <TableCell sx={{...bc,borderRight:'none',color:C.muted}}>{s.enrollmentDate?new Date(s.enrollmentDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card_>
    </Box>
  );
};

/* ═══════════════════════════════════════════════════════════════
   STUDENTS
═══════════════════════════════════════════════════════════════ */
const StudentsSection = () => {
  const [enrolled,    setEnrolled]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [credDialogStudent, setCredDialogStudent] = useState(null);
  const [studentCred, setStudentCred] = useState({ password: '' });
  const [bulkDialog, setBulkDialog] = useState(null);
  const [resetStudentDialog, setResetStudentDialog] = useState(null);   // student being reset
  const [resetStudentResult, setResetStudentResult] = useState(null);
  const [parentCredDialog, setParentCredDialog] = useState(null);   // parent being issued a login
  const [parentCredResult, setParentCredResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });
  const [selectedStudent, setSelectedStudent] = useState(null);
  const toast = toast_(setSnack);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${BASE}/api/management/enrolled-students`, {headers:authH()});
    if (res.ok) setEnrolled(await res.json());
    setLoading(false);
  }, []);
  useEffect(()=>{fetchAll();},[fetchAll]);

  // Keep the detail panel in sync with fresh data; default-select the first row on landing.
  useEffect(()=>{
    if (enrolled.length===0) return;
    if (!selectedStudent) {
      const sortedGrades = [...new Set(enrolled.map(s=>s.grade))].sort();
      setSelectedStudent(enrolled.find(s=>s.grade===sortedGrades[0]) || enrolled[0]);
    } else {
      const fresh = enrolled.find(s=>s.id===selectedStudent.id);
      if (fresh) setSelectedStudent(fresh);
    }
  }, [enrolled]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = d => new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  const filtered = enrolled.filter(s => {
    if (filterGrade && s.grade !== filterGrade) return false;
    if (search) { const q=search.toLowerCase(); return s.firstName?.toLowerCase().includes(q)||s.lastName?.toLowerCase().includes(q)||s.studentNumber?.toLowerCase().includes(q)||s.nationalId?.toLowerCase().includes(q); }
    return true;
  });
  const grouped = filtered.reduce((acc,s)=>{(acc[s.grade]=acc[s.grade]||[]).push(s);return acc;},{});
  const allGrades = [...new Set(enrolled.map(s=>s.grade))].sort();

  if (loading) return <Box sx={{display:'flex',justifyContent:'center',py:8}}><CircularProgress sx={{color:C.brand}}/></Box>;

  return (
    <Card_ sx={{mb:0,p:0,overflow:'hidden'}}>
      <Box sx={{p:2.5,pb:0}}>
        <SectionHead title="Enrolled Students" subtitle={`${enrolled.length} student${enrolled.length!==1?'s':''} currently enrolled`}/>
        <Box sx={{display:'flex',gap:2,mb:2,flexWrap:'wrap'}}>
          <TextField placeholder="Search name, student no. or ID…" value={search} onChange={e=>setSearch(e.target.value)} size="small" sx={{width:280,'& .MuiOutlinedInput-root':{borderRadius:'6px',fontSize:'0.75rem',fontFamily:"'IBM Plex Sans', sans-serif"}}}/>
          <TextField select label="Filter Grade" value={filterGrade} onChange={e=>setFilterGrade(e.target.value)} size="small" sx={{width:150}}>
            <MenuItem value="">All Grades</MenuItem>
            {allGrades.map(g=><MenuItem key={g} value={g}> {g}</MenuItem>)}
          </TextField>
          {(search||filterGrade)&&<Button size="small" onClick={()=>{setSearch('');setFilterGrade('');}} sx={{textTransform:'none',color:C.muted}}>Clear filters</Button>}
          <Button size="small" variant="contained" onClick={async()=>{
              setSaving(true);
              try{
                const res = await fetch(`${BASE}/api/management/students/generate-credentials`, { method: 'POST', headers: authH() });
                const d = await res.json();
                if(res.ok){ setBulkDialog(d); toast(`Generated ${d.generated} credentials`); fetchAll(); }
                else toast(d.message||'Failed','error');
              }catch(e){ toast('Network error','error'); }
              setSaving(false);
            }} sx={{background:C.brand,textTransform:'none',fontWeight:700,boxShadow:'none',fontFamily:"'IBM Plex Sans', sans-serif"}} startIcon={<KeyIcon/>}>
            {saving?'Working…':'Bulk Generate Logins'}
          </Button>
        </Box>
      </Box>

      <Box sx={{display:'flex',minHeight:420}}>
        <Box sx={{flex:'1 1 60%',minWidth:0,overflowX:'auto',p:2.5,pt:0}}>
          {filtered.length===0 ? (
            <Box sx={{textAlign:'center',py:5}}>
              <PeopleAltIcon sx={{color:C.border,fontSize:40,mb:1}}/>
              <Typography sx={{color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif"}}>{enrolled.length===0?'No students enrolled yet.':'No students match the current filters.'}</Typography>
            </Box>
          ) : (
            Object.keys(grouped).sort().map(grade=>(
              <Box key={grade} sx={{mb:3}}>
                <Box sx={{display:'flex',alignItems:'center',gap:1,mb:1}}>
                  <SchoolIcon sx={{color:C.brand,fontSize:18}}/>
                  <Typography sx={{fontWeight:700,fontSize:'0.79rem',color:C.brand,fontFamily:"'IBM Plex Sans', sans-serif"}}> {grade}</Typography>
                  <Chip label={grouped[grade].length} size="small" sx={{height:20,fontSize:'0.62rem',fontWeight:700,bgcolor:'#f0f0f0',color:C.accent}}/>
                </Box>
                <TableContainer component={Paper} elevation={0} sx={{border:`1px solid ${C.border}`,borderRadius:'4px'}}>
                  <Table size="small" sx={{borderCollapse:'collapse'}}>
                    <TableHead><TableRow>
                      {['#','Student No.','Name','National ID','Email','Phone','Stream','Login','Enrolled'].map(h=>(
                        <TableCell key={h} sx={{...hc,...(h==='Enrolled'?{borderRight:'none'}:{})}}>{h}</TableCell>
                      ))}
                    </TableRow></TableHead>
                    <TableBody>
                      {grouped[grade].map((s,idx)=>(
                        <TableRow key={s.id} onClick={()=>setSelectedStudent(s)} sx={{cursor:'pointer',boxShadow:selectedStudent?.id===s.id?`inset 3px 0 0 0 ${C.brand}`:'none',backgroundColor:selectedStudent?.id===s.id?'#e3e3e3':idx%2===0?C.white:'#fbfbfb','&:hover':{backgroundColor:selectedStudent?.id===s.id?'#e3e3e3':'#f9f9f9'}}}>
                          <TableCell sx={{...bc,color:C.muted,textAlign:'center',width:40}}>{idx+1}</TableCell>
                          <TableCell sx={{...bc,fontFamily:'monospace',fontSize:'0.7rem',color:C.brand,fontWeight:700}}>{s.studentNumber}</TableCell>
                          <TableCell sx={{...bc,fontWeight:600}}>{s.firstName} {s.lastName}</TableCell>
                          <TableCell sx={{...bc,fontFamily:'monospace',fontSize:'0.7rem'}}>{s.nationalId||'—'}</TableCell>
                          <TableCell sx={{...bc,color:'#575757'}}>{s.email||'—'}</TableCell>
                          <TableCell sx={bc}>{s.phone||'—'}</TableCell>
                          <TableCell sx={bc}>{s.stream?<Chip label={s.stream} size="small" sx={{fontSize:'0.62rem',fontWeight:700,bgcolor:'#f2f2f2',color:'#3f3f3f'}}/>:<Typography sx={{fontSize:'0.7rem',color:C.muted}}>—</Typography>}</TableCell>
                          <TableCell sx={bc}>
                            <Box sx={{display:'flex',gap:0.5}}>
                              <Tooltip title="Set Login Credentials">
                                <IconButton size="small"
                                  onClick={(e)=>{e.stopPropagation();setCredDialogStudent(s);setStudentCred({password:''}); }}
                                  sx={{color:C.brand}}>
                                  <KeyIcon sx={{fontSize:15}}/>
                                </IconButton>
                              </Tooltip>
                              {/* NEW: Reset Password button — only show if student already has credentials */}
                              {s.passwordHash !== null && s.passwordHash !== '' && (
                                <Tooltip title="Reset Password">
                                  <IconButton size="small"
                                    onClick={(e)=>{e.stopPropagation();setResetStudentDialog(s);}}
                                    sx={{color:C.danger}}>
                                    <RestoreIcon sx={{fontSize:15}}/>
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell sx={{...bc,borderRight:'none',color:C.muted}}>{s.enrollmentDate?fmt(s.enrollmentDate):'—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))
          )}
        </Box>

        <Box sx={{flex:'1 1 40%',minWidth:320,borderLeft:`1px solid ${C.border}`,background:C.sidebar}}>
          {!selectedStudent ? (
            <DetailEmpty icon={<PeopleAltIcon sx={{fontSize:34,color:C.border}}/>} text="Select a student to view details."/>
          ) : (
            <DetailPanel
              title={`${selectedStudent.firstName} ${selectedStudent.lastName}`}
              onClose={()=>setSelectedStudent(null)}
              footer={false}
            >
              <FormRow label="Student No."><Typography sx={{fontFamily:'monospace',fontSize:'0.75rem',color:C.brand,fontWeight:700}}>{selectedStudent.studentNumber}</Typography></FormRow>
              <FormRow label="Grade"><Typography sx={{fontSize:'0.75rem'}}> {selectedStudent.grade}</Typography></FormRow>
              <FormRow label="National ID"><Typography sx={{fontFamily:'monospace',fontSize:'0.75rem'}}>{selectedStudent.nationalId||'—'}</Typography></FormRow>
              <FormRow label="Email"><Typography sx={{fontSize:'0.75rem',color:'#575757'}}>{selectedStudent.email||'—'}</Typography></FormRow>
              <FormRow label="Phone"><Typography sx={{fontSize:'0.75rem'}}>{selectedStudent.phone||'—'}</Typography></FormRow>
              <FormRow label="Stream">{selectedStudent.stream?<Chip label={selectedStudent.stream} size="small" sx={{fontSize:'0.62rem',fontWeight:700,bgcolor:'#f2f2f2',color:'#3f3f3f'}}/>:<Typography sx={{fontSize:'0.75rem',color:C.muted}}>—</Typography>}</FormRow>
              <FormRow label="Enrolled"><Typography sx={{fontSize:'0.75rem',color:C.muted}}>{selectedStudent.enrollmentDate?fmt(selectedStudent.enrollmentDate):'—'}</Typography></FormRow>
              <FormRow label="Login">
                <Chip label={selectedStudent.passwordHash?'Set':'Not set'} size="small" sx={{fontWeight:700,fontSize:'0.62rem',bgcolor:selectedStudent.passwordHash?'#f2f2f2':'#f7f7f7',color:selectedStudent.passwordHash?'#3f3f3f':C.danger}}/>
              </FormRow>
              <FormRow label="Parents">
                {selectedStudent.parents?.length ? (
                  <Box sx={{display:'flex',flexDirection:'column',gap:0.75}}>
                    {selectedStudent.parents.map(p=>(
                      <Box key={p.id} sx={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:1}}>
                        <Box>
                          <Typography sx={{fontSize:'0.75rem',fontWeight:600}}>{p.firstName} {p.lastName}</Typography>
                          <Typography sx={{fontSize:'0.68rem',color:C.muted}}>{p.relationship||'Guardian'}{p.phone?` · ${p.phone}`:''}</Typography>
                        </Box>
                        <Button size="small" startIcon={<KeyIcon sx={{fontSize:14}}/>}
                          onClick={()=>{setParentCredDialog(p);setParentCredResult(null);}}
                          sx={{textTransform:'none',fontSize:'0.68rem',fontWeight:700,color:C.brand,whiteSpace:'nowrap'}}>
                          Generate Login
                        </Button>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography sx={{fontSize:'0.75rem',color:C.muted}}>No parent/guardian on file.</Typography>
                )}
              </FormRow>
              <Box sx={{display:'flex',gap:1,mt:2,pt:2,borderTop:`1px solid ${C.border}`}}>
                <Button size="small" variant="outlined" startIcon={<KeyIcon sx={{fontSize:15}}/>}
                  onClick={()=>{setCredDialogStudent(selectedStudent);setStudentCred({password:''});}}
                  sx={{textTransform:'none',fontWeight:700,borderColor:C.brand,color:C.brand,fontFamily:"'IBM Plex Sans', sans-serif"}}>
                  Set Login Credentials
                </Button>
                {selectedStudent.passwordHash!==null && selectedStudent.passwordHash!=='' && (
                  <Button size="small" variant="outlined" startIcon={<RestoreIcon sx={{fontSize:15}}/>}
                    onClick={()=>setResetStudentDialog(selectedStudent)}
                    sx={{textTransform:'none',fontWeight:700,borderColor:C.danger,color:C.danger,fontFamily:"'IBM Plex Sans', sans-serif"}}>
                    Reset Password
                  </Button>
                )}
              </Box>
            </DetailPanel>
          )}
        </Box>
      </Box>

      {/* Student credential dialog */}
      <Dialog open={!!credDialogStudent} onClose={()=>setCredDialogStudent(null)} maxWidth="xs" fullWidth PaperProps={{sx:{borderRadius:'10px'}}}>
        <DialogTitle sx={{fontWeight:700,color:C.brand,fontFamily:"'IBM Plex Sans', sans-serif"}}>Set Login — {credDialogStudent?.firstName} {credDialogStudent?.lastName}</DialogTitle>
        <Divider/>
        <DialogContent sx={{pt:2.5,display:'flex',flexDirection:'column',gap:2}}>
          <InfoBanner>The student will use these credentials to log in to the Student Portal.</InfoBanner>
          <TextField label="Password (leave blank to auto-generate)" value={studentCred.password} onChange={e=>setStudentCred({password:e.target.value})} size="small" fullWidth/>
        </DialogContent>
        <Divider/>
        <DialogActions sx={{px:3,py:2,gap:1}}>
          <Button onClick={()=>setCredDialogStudent(null)} sx={{textTransform:'none',color:C.muted}}>Cancel</Button>
          <Button variant="contained" onClick={async()=>{
            setSaving(true);
            try{
              const res = await fetch(`${BASE}/api/management/students/${credDialogStudent.id}/set-credentials`, { method:'POST', headers: jsonH(), body: JSON.stringify(studentCred.password?{password:studentCred.password}:{}) });
              const d = await res.json();
              if(res.ok){ toast('Credentials set'); setCredDialogStudent(null); fetchAll(); }
              else toast(d.message||'Failed','error');
            }catch(e){ toast('Network error','error'); }
            setSaving(false);
          }} disabled={saving} sx={{background:C.brand,textTransform:'none',fontWeight:700,boxShadow:'none',fontFamily:"'IBM Plex Sans', sans-serif"}}>
            {saving?'Saving…':'Set Credentials'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Parent portal login dialog */}
      <Dialog open={!!parentCredDialog} onClose={()=>{setParentCredDialog(null);setParentCredResult(null);}} maxWidth="xs" fullWidth PaperProps={{sx:{borderRadius:'10px'}}}>
        <DialogTitle sx={{fontWeight:700,color:C.brand,fontFamily:"'IBM Plex Sans', sans-serif"}}>
          Parent Portal Login — {parentCredDialog?.firstName} {parentCredDialog?.lastName}
        </DialogTitle>
        <Divider/>
        <DialogContent sx={{pt:2.5,display:'flex',flexDirection:'column',gap:2}}>
          {parentCredResult ? (
            <>
              <InfoBanner color={C.accent} bg="#E8F5E9" border="#A5D6A7">
                Write this down now — the password will not be shown again.
              </InfoBanner>
              <FormRow label="Username"><Typography sx={{fontFamily:'monospace',fontWeight:700}}>{parentCredResult.username}</Typography></FormRow>
              <FormRow label="Temp Password"><Typography sx={{fontFamily:'monospace',fontWeight:700,color:C.danger}}>{parentCredResult.tempPassword}</Typography></FormRow>
            </>
          ) : (
            <InfoBanner>This generates a new login for this parent on the Parent Portal. Any previous password for this parent will stop working.</InfoBanner>
          )}
        </DialogContent>
        <Divider/>
        <DialogActions sx={{px:3,py:2,gap:1}}>
          {parentCredResult ? (
            <Button onClick={()=>{setParentCredDialog(null);setParentCredResult(null);}} sx={{textTransform:'none'}}>Done</Button>
          ) : (
            <>
              <Button onClick={()=>setParentCredDialog(null)} sx={{textTransform:'none',color:C.muted}}>Cancel</Button>
              <Button variant="contained" disabled={saving} onClick={async()=>{
                setSaving(true);
                try{
                  const res = await fetch(`${BASE}/api/management/parents/${parentCredDialog.id}/reset-password`, { method:'POST', headers: authH() });
                  const d = await res.json();
                  if(res.ok){ setParentCredResult(d); }
                  else toast(d.message||'Failed','error');
                }catch(e){ toast('Network error','error'); }
                setSaving(false);
              }} sx={{background:C.brand,textTransform:'none',fontWeight:700,boxShadow:'none',fontFamily:"'IBM Plex Sans', sans-serif"}}>
                {saving?'Working…':'Generate Login'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Bulk generation results dialog */}
      <Dialog open={!!bulkDialog} onClose={()=>setBulkDialog(null)} maxWidth="md" fullWidth PaperProps={{sx:{borderRadius:'10px'}}}>
        <DialogTitle sx={{fontWeight:700,color:C.brand,fontFamily:"'IBM Plex Sans', sans-serif"}}>Bulk Generated Credentials</DialogTitle>
        <Divider/>
        <DialogContent>
          {bulkDialog?.details?.length>0 ? (
            <TableContainer component={Paper} elevation={0} sx={{border:`1px solid ${C.border}`,borderRadius:'6px'}}>
              <Table size="small">
                <TableHead><TableRow>
                  <TableCell sx={hc}>#</TableCell>
                  <TableCell sx={hc}>Student No.</TableCell>
                  <TableCell sx={hc}>Temp Password</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {bulkDialog.details.map((d,idx)=>(
                    <TableRow key={d.id}>
                      <TableCell sx={bc}>{idx+1}</TableCell>
                      <TableCell sx={bc}>{d.studentNumber}</TableCell>
                      <TableCell sx={bc}>{d.tempPassword}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (<Typography sx={{color:C.muted}}>No credentials generated.</Typography>)}
        </DialogContent>
        <Divider/>
        <DialogActions sx={{px:3,py:2}}>
          <Button onClick={()=>setBulkDialog(null)} sx={{textTransform:'none'}}>Close</Button>
        </DialogActions>
      </Dialog>
      {/* ── Reset Password Confirm Dialog ── */}
      <Dialog open={!!resetStudentDialog && !resetStudentResult}
        onClose={()=>setResetStudentDialog(null)} maxWidth="xs" fullWidth
        PaperProps={{sx:{borderRadius:'10px'}}}>
        <DialogTitle sx={{fontWeight:700,color:C.danger,fontFamily:"'IBM Plex Sans', sans-serif"}}>
          Reset Password
        </DialogTitle>
        <Divider/>
        <DialogContent sx={{pt:2.5}}>
          <InfoBanner color={C.danger} bg={C.dangerBg} border="#EF9A9A">
            This will generate a new temporary password for{' '}
            <strong>{resetStudentDialog?.firstName} {resetStudentDialog?.lastName}</strong>.
            The old password will stop working immediately.
          </InfoBanner>
          <Typography sx={{fontSize:'0.75rem',color:C.text,fontFamily:"'IBM Plex Sans', sans-serif"}}>
            The new temporary password will be shown <strong>once only</strong>.
            Write it down and give it to the student in person.
          </Typography>
        </DialogContent>
        <Divider/>
        <DialogActions sx={{px:3,py:2,gap:1}}>
          <Button onClick={()=>setResetStudentDialog(null)} sx={{textTransform:'none',color:C.muted}}>
            Cancel
          </Button>
          <Button variant="contained"
            onClick={async()=>{
              setSaving(true);
              try {
                const res = await fetch(
                  `${BASE}/api/management/students/${resetStudentDialog.id}/reset-password`,
                  {method:'POST', headers:authH()}
                );
                const d = await res.json();
                if (res.ok) {
                  setResetStudentResult(d);  // show the temp password
                } else {
                  toast(d.message||'Failed to reset','error');
                  setResetStudentDialog(null);
                }
              } catch { toast('Network error','error'); setResetStudentDialog(null); }
              setSaving(false);
            }}
            disabled={saving}
            sx={{background:C.danger,textTransform:'none',fontWeight:700,boxShadow:'none',
              fontFamily:"'IBM Plex Sans', sans-serif",'&:hover':{background:'#4a4a4a'}}}>
            {saving?'Resetting…':'Yes, Reset Password'}
          </Button>
        </DialogActions>
      </Dialog>
 
      {/* ── Show Temp Password ONCE Dialog ── */}
      <Dialog open={!!resetStudentResult}
        onClose={()=>{setResetStudentResult(null);setResetStudentDialog(null);}}
        maxWidth="xs" fullWidth
        PaperProps={{sx:{borderRadius:'10px'}}}>
        <DialogTitle sx={{fontWeight:700,color:C.accent,fontFamily:"'IBM Plex Sans', sans-serif"}}>
          Password Reset Successfully
        </DialogTitle>
        <Divider/>
        <DialogContent sx={{pt:2.5}}>
          <Box sx={{background:'#f7f7f7',border:'1px solid #dfdfdf',borderRadius:'8px',p:2,mb:2,textAlign:'center'}}>
            <Typography sx={{fontSize:'0.66rem',color:C.muted,mb:0.5,fontFamily:"'IBM Plex Sans', sans-serif",textTransform:'uppercase',letterSpacing:'0.06em'}}>
              Temporary password for {resetStudentResult?.firstName} {resetStudentResult?.lastName}
            </Typography>
            <Typography sx={{fontSize:'1.41rem',fontWeight:800,fontFamily:'monospace',letterSpacing:'0.15em',color:C.brand}}>
              {resetStudentResult?.tempPassword}
            </Typography>
            <Typography sx={{fontSize:'0.63rem',color:C.muted,mt:0.5,fontFamily:"'IBM Plex Sans', sans-serif"}}>
              Student No: {resetStudentResult?.studentNumber}
            </Typography>
          </Box>
          <Box sx={{background:C.dangerBg,border:'1px solid #EF9A9A',borderRadius:'6px',p:1.5}}>
            <Typography sx={{fontSize:'0.72rem',fontWeight:700,color:C.danger,fontFamily:"'IBM Plex Sans', sans-serif"}}>
              This password will NOT be shown again
            </Typography>
            <Typography sx={{fontSize:'0.7rem',color:C.danger,fontFamily:"'IBM Plex Sans', sans-serif",mt:0.5}}>
              Write it down now and give it to the student in person.
              The student will be forced to change it on first login.
            </Typography>
          </Box>
        </DialogContent>
        <Divider/>
        <DialogActions sx={{px:3,py:2}}>
          <Button variant="contained"
            onClick={()=>{setResetStudentResult(null);setResetStudentDialog(null);}}
            sx={{background:C.brand,textTransform:'none',fontWeight:700,boxShadow:'none',
              fontFamily:"'IBM Plex Sans', sans-serif"}}>
            I've written it down — Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snack_ snack={snack} onClose={()=>setSnack(s=>({...s,open:false}))}/>
    </Card_>
  );
};

/* ═══════════════════════════════════════════════════════════════
   TEACHERS
═══════════════════════════════════════════════════════════════ */
const TeachersSection = () => {
  const [teachers,       setTeachers]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [dialog,         setDialog]         = useState(false);
  const [credDialog,     setCredDialog]     = useState(null);
  const [editing,        setEditing]        = useState(null);
  const [saving,         setSaving]         = useState(false);
  const [snack,          setSnack]          = useState({open:false,msg:'',sev:'success'});
  const [allNatSubjects, setAllNatSubjects] = useState([]);
  const [selSubjects,    setSelSubjects]    = useState([]);
  const [errors,         setErrors]         = useState({});
  const toast = toast_(setSnack);

  // ── EF must have 'phone', not 'subject' ──
  const EF = { firstName:'', lastName:'', email:'', phone:'', employeeNumber:'', gender:'' };
  const [form, setForm] = useState(EF);
  const [cred, setCred] = useState({username:'',password:''});
  const [resetTeacherDialog, setResetTeacherDialog] = useState(null);
  const [resetTeacherResult, setResetTeacherResult] = useState(null);

  // Load national subjects
  useEffect(() => {
    fetch(`${BASE}/api/setup/national-subjects`, {headers:authH()})
      .then(r=>r.ok?r.json():[]).then(setAllNatSubjects).catch(()=>{});
  }, []);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${BASE}/api/management/teachers`, {headers:authH()});
    if (res.ok) setTeachers(await res.json());
    setLoading(false);
  }, []);
  useEffect(()=>{fetch_();},[fetch_]);

  // Default-select the first teacher on landing (once), same as the Students tab.
  const didDefaultSelect = useRef(false);
  useEffect(()=>{
    if (!didDefaultSelect.current && teachers.length>0) {
      didDefaultSelect.current = true;
      openEdit(teachers[0]);
    }
  }, [teachers]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Validation ──
  const validate = () => {
    const e = {};
    if (!form.firstName?.trim())               e.firstName = 'First name is required';
    else if (form.firstName.trim().length < 2) e.firstName = 'At least 2 characters';
    if (!form.lastName?.trim())                e.lastName  = 'Last name is required';
    else if (form.lastName.trim().length < 2)  e.lastName  = 'At least 2 characters';
    if (form.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      e.email = 'Enter a valid email address';
    if (!form.phone?.trim())
      e.phone = 'Phone number is required';
    else if (form.phone.replace(/\D/g,'').length !== 10)
      e.phone = 'Phone must be exactly 10 digits';
    if (form.employeeNumber?.trim() && form.employeeNumber.trim().length < 2)
      e.employeeNumber = 'Too short';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd = () => { setEditing(null); setForm(EF); setSelSubjects([]); setErrors({}); setDialog(true); };
  const openEdit = (t) => {
    setEditing(t);
    setForm({firstName:t.firstName,lastName:t.lastName,email:t.email||'',phone:t.phone||'',employeeNumber:t.employeeNumber||'',gender:t.gender||''});
    setSelSubjects((t.subjects||[]).map(s=>s.id));
    setErrors({});
    setDialog(true);
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const url = editing ? `${BASE}/api/management/teachers/${editing.id}` : `${BASE}/api/management/teachers`;
    const res = await fetch(url, {method:editing?'PATCH':'POST', headers:jsonH(), body:JSON.stringify(form)});
    const d = await res.json();
    if (res.ok) {
      await fetch(`${BASE}/api/management/teachers/${d.id}/subjects`, {
        method:'PUT', headers:jsonH(), body:JSON.stringify({subjectIds:selSubjects}),
      });
      toast(editing?'Teacher updated':'Teacher added');
      setDialog(false); fetch_();
    } else toast(d.message||'Failed','error');
    setSaving(false);
  };

  const handleSetCred = async () => {
    if (!cred.username||!cred.password) return toast('Username and password required','error');
    setSaving(true);
    const res = await fetch(`${BASE}/api/management/teachers/${credDialog.id}/set-credentials`, {
      method:'POST', headers:jsonH(), body:JSON.stringify(cred),
    });
    const d = await res.json();
    setSaving(false);
    if (res.ok) { toast('Credentials set — teacher can now log in'); setCredDialog(null); }
    else toast(d.message||'Failed','error');
  };

  const handleDeactivate = async (id) => {
    const res = await fetch(`${BASE}/api/management/teachers/${id}`, {method:'DELETE',headers:authH()});
    if (res.ok) { toast('Teacher deactivated'); fetch_(); } else toast('Failed','error');
  };

  if (loading) return <Box sx={{display:'flex',justifyContent:'center',py:8}}><CircularProgress sx={{color:C.brand}}/></Box>;

  const fmtDate = d => new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});

  return (
    <Card_ sx={{mb:0,p:0,overflow:'hidden'}}>
      <Box sx={{p:2.5,pb:0}}>
        <SectionHead title="Teachers" subtitle="Manage teachers and their login access"
          action={
            <Box sx={{display:'flex',gap:0.5}}>
              <Tooltip title="Refresh"><IconButton size="small" onClick={fetch_} sx={{color:C.muted,border:`1px solid ${C.border}`,borderRadius:'4px'}}><RestoreIcon sx={{fontSize:16}}/></IconButton></Tooltip>
              <Tooltip title="Add Teacher"><IconButton size="small" onClick={openAdd} sx={{color:C.white,background:C.brand,borderRadius:'4px','&:hover':{background:C.brand}}}><AddIcon sx={{fontSize:18}}/></IconButton></Tooltip>
            </Box>
          }
        />
      </Box>

      <Box sx={{display:'flex',minHeight:420}}>
        <Box sx={{flex:'1 1 60%',minWidth:0,overflowX:'auto',p:2.5,pt:1.5}}>
          {teachers.length===0 ? (
            <Typography sx={{color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif"}}>No teachers added yet.</Typography>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{border:`1px solid ${C.border}`,borderRadius:'4px'}}>
              <Table size="small" sx={{borderCollapse:'collapse'}}>
                <TableHead><TableRow>
                  {['#','Name','Emp. No.','Email','Phone','Subjects','Status','Login',''].map(h=>(
                    <TableCell key={h} sx={{...hc,...(h===''?{borderRight:'none'}:{})}}>{h}</TableCell>
                  ))}
                </TableRow></TableHead>
                <TableBody>
                  {teachers.map((t,idx)=>(
                    <TableRow key={t.id} onClick={()=>openEdit(t)} sx={{cursor:'pointer',boxShadow:editing?.id===t.id&&dialog?`inset 3px 0 0 0 ${C.brand}`:'none',backgroundColor:editing?.id===t.id&&dialog?'#e3e3e3':idx%2===0?C.white:'#fbfbfb'}}>
                      <TableCell sx={{...bc,color:C.muted,textAlign:'center',width:40}}>{idx+1}</TableCell>
                      <TableCell sx={{...bc,fontWeight:600}}>{t.firstName} {t.lastName}</TableCell>
                      <TableCell sx={{...bc,fontFamily:'monospace',fontSize:'0.7rem'}}>{t.employeeNumber||'—'}</TableCell>
                      <TableCell sx={{...bc,color:'#575757'}}>{t.email||'—'}</TableCell>
                      {/* ── Phone column ── */}
                      <TableCell sx={bc}>{t.phone||'—'}</TableCell>
                      {/* ── Subjects column ── */}
                      <TableCell sx={bc}>
                        {(t.subjects||[]).length>0 ? (
                          <Box sx={{display:'flex',flexWrap:'wrap',gap:0.5}}>
                            {(t.subjects||[]).slice(0,3).map(s=>(
                              <Chip key={s.id} label={s.name} size="small" sx={{fontSize:'0.58rem',fontWeight:600,height:18,bgcolor:'#f2f2f2',color:'#3f3f3f'}}/>
                            ))}
                            {(t.subjects||[]).length>3 && <Chip label={`+${(t.subjects||[]).length-3}`} size="small" sx={{fontSize:'0.58rem',height:18,bgcolor:C.headerBg,color:C.muted}}/>}
                          </Box>
                        ) : (
                          <Typography sx={{fontSize:'0.69rem',color:C.muted,fontStyle:'italic',fontFamily:"'IBM Plex Sans', sans-serif"}}>None assigned</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={bc}>
                        <Chip label={t.isActive?'Active':'Inactive'} size="small" sx={{fontWeight:700,fontSize:'0.62rem',bgcolor:t.isActive?'#f0f0f0':'#f5f5f5',color:t.isActive?C.accent:C.muted}}/>
                      </TableCell>
                      <TableCell sx={bc}>
                        <Chip label={t.username?'Set':'Not set'} size="small" sx={{fontWeight:700,fontSize:'0.62rem',bgcolor:t.username?'#f2f2f2':'#f7f7f7',color:t.username?'#3f3f3f':C.danger}}/>
                      </TableCell>
                      <TableCell sx={{...bc,borderRight:'none'}}>
                        <Box sx={{display:'flex',gap:0.5}}>
                          <Tooltip title="Edit"><IconButton size="small" onClick={(e)=>{e.stopPropagation();openEdit(t);}} sx={{color:C.brand}}><EditIcon sx={{fontSize:15}}/></IconButton></Tooltip>
                          <Tooltip title="Set Login Credentials"><IconButton size="small" onClick={(e)=>{e.stopPropagation();setCredDialog(t);setCred({username:'',password:''});}} sx={{color:C.brand}}><KeyIcon sx={{fontSize:15}}/></IconButton></Tooltip>
                          {t.username && (
                              <Tooltip title="Reset Password">
                                <IconButton size="small"
                                  onClick={(e)=>{e.stopPropagation();setResetTeacherDialog(t);}}
                                  sx={{color:C.danger}}>
                                  <RestoreIcon sx={{fontSize:15}}/>
                                </IconButton>
                              </Tooltip>
                            )}
                          {t.isActive&&<Tooltip title="Deactivate"><IconButton size="small" onClick={(e)=>{e.stopPropagation();handleDeactivate(t.id);}} sx={{color:C.danger}}><DeleteIcon sx={{fontSize:15}}/></IconButton></Tooltip>}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>

        <Box sx={{flex:'1 1 40%',minWidth:320,borderLeft:`1px solid ${C.border}`,background:C.sidebar}}>
          {!dialog ? (
            <DetailEmpty icon={<SchoolIcon sx={{fontSize:34,color:C.border}}/>} text="Select a teacher to edit, or click + to add a new teacher."/>
          ) : (
            <DetailPanel
              title={editing?`Edit Teacher — ${editing.firstName} ${editing.lastName}`:'Add Teacher'}
              onClose={()=>setDialog(false)}
              createdAt={editing?.createdAt}
              fmt={fmtDate}
              onReset={()=>editing?openEdit(editing):openAdd()}
              onSave={handleSave}
              saving={saving}
              saveLabel={editing?'Update':'Add Teacher'}
            >
              <FormRow label="First Name" required>
                <TextField value={form.firstName} size="small" fullWidth
                  error={!!errors.firstName} helperText={errors.firstName||''}
                  inputProps={{maxLength:50}}
                  onChange={e=>{setForm(f=>({...f,firstName:e.target.value}));if(errors.firstName)setErrors(v=>({...v,firstName:''}));}}/>
              </FormRow>
              <FormRow label="Last Name" required>
                <TextField value={form.lastName} size="small" fullWidth
                  error={!!errors.lastName} helperText={errors.lastName||''}
                  inputProps={{maxLength:50}}
                  onChange={e=>{setForm(f=>({...f,lastName:e.target.value}));if(errors.lastName)setErrors(v=>({...v,lastName:''}));}}/>
              </FormRow>
              <FormRow label="Employee Number">
                <TextField value={form.employeeNumber} size="small" fullWidth
                  error={!!errors.employeeNumber} helperText={errors.employeeNumber||''}
                  inputProps={{maxLength:20}}
                  onChange={e=>{setForm(f=>({...f,employeeNumber:e.target.value}));if(errors.employeeNumber)setErrors(v=>({...v,employeeNumber:''}));}}/>
              </FormRow>
              <FormRow label="Gender">
                <TextField select value={form.gender} onChange={e=>setForm(f=>({...f,gender:e.target.value}))} size="small" fullWidth>
                  <MenuItem value="">—</MenuItem><MenuItem value="Male">Male</MenuItem><MenuItem value="Female">Female</MenuItem>
                </TextField>
              </FormRow>
              <FormRow label="Email">
                <TextField value={form.email} size="small" fullWidth
                  placeholder="teacher@school.co.za"
                  error={!!errors.email} helperText={errors.email||''}
                  inputProps={{maxLength:100}}
                  onChange={e=>{setForm(f=>({...f,email:e.target.value}));if(errors.email)setErrors(v=>({...v,email:''}));}}/>
              </FormRow>
              <FormRow label="Phone" required>
                <TextField value={form.phone} size="small" fullWidth
                  placeholder="0821234567"
                  error={!!errors.phone}
                  helperText={errors.phone||`${(form.phone||'').replace(/\D/g,'').length}/10 digits`}
                  inputProps={{maxLength:15}}
                  onChange={e=>{
                    const val=e.target.value.replace(/[^\d\s+\-()]/g,'');
                    setForm(f=>({...f,phone:val}));
                    if(errors.phone)setErrors(v=>({...v,phone:''}));
                  }}/>
              </FormRow>
              <FormRow label="Subjects">
                {allNatSubjects.length===0 ? (
                  <Typography sx={{fontSize:'0.69rem',color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif"}}>Loading subjects…</Typography>
                ) : (
                  <Box sx={{display:'flex',flexWrap:'wrap',gap:0.75,maxHeight:160,overflowY:'auto',p:1,border:`1px solid ${C.border}`,borderRadius:'6px',background:C.white}}>
                    {allNatSubjects.map(ns=>{
                      const selected=selSubjects.includes(ns.id);
                      return (
                        <Chip key={ns.id} label={ns.name} size="small" clickable
                          onClick={()=>setSelSubjects(p=>selected?p.filter(x=>x!==ns.id):[...p,ns.id])}
                          sx={{fontWeight:600,fontSize:'0.63rem',fontFamily:"'IBM Plex Sans', sans-serif",
                            background:selected?C.brand:C.white,color:selected?C.white:C.text,
                            border:`1px solid ${selected?C.brand:C.border}`}}/>
                      );
                    })}
                  </Box>
                )}
                {selSubjects.length>0&&(
                  <Typography sx={{fontSize:'0.63rem',color:C.accent,mt:0.75,fontFamily:"'IBM Plex Sans', sans-serif"}}>
                    {selSubjects.length} subject{selSubjects.length!==1?'s':''} selected
                  </Typography>
                )}
              </FormRow>
            </DetailPanel>
          )}
        </Box>
      </Box>

      {/* Credentials dialog */}
      <Dialog open={!!credDialog} onClose={()=>setCredDialog(null)} maxWidth="xs" fullWidth PaperProps={{sx:{borderRadius:'10px'}}}>
        <DialogTitle sx={{fontWeight:700,color:C.brand,fontFamily:"'IBM Plex Sans', sans-serif"}}>
          Set Login — {credDialog?.firstName} {credDialog?.lastName}
        </DialogTitle>
        <Divider/>
        <DialogContent sx={{pt:2.5,display:'flex',flexDirection:'column',gap:2}}>
          <InfoBanner>The teacher will use these credentials to log in to the Teacher Portal.</InfoBanner>
          <TextField label="Username *" value={cred.username} onChange={e=>setCred(c=>({...c,username:e.target.value}))} size="small" fullWidth/>
          <TextField label="Password *" type="password" value={cred.password} onChange={e=>setCred(c=>({...c,password:e.target.value}))} size="small" fullWidth helperText="Minimum 8 characters"/>
        </DialogContent>
        <Divider/>
        <DialogActions sx={{px:3,py:2,gap:1}}>
          <Button onClick={()=>setCredDialog(null)} sx={{textTransform:'none',color:C.muted}}>Cancel</Button>
          <Button variant="contained" onClick={handleSetCred} disabled={saving}
            sx={{background:C.brand,textTransform:'none',fontWeight:700,boxShadow:'none',fontFamily:"'IBM Plex Sans', sans-serif"}}>
            {saving?'Saving…':'Set Credentials'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* ── Teacher Reset Confirm ── */}
      <Dialog open={!!resetTeacherDialog && !resetTeacherResult}
        onClose={()=>setResetTeacherDialog(null)} maxWidth="xs" fullWidth
        PaperProps={{sx:{borderRadius:'10px'}}}>
        <DialogTitle sx={{fontWeight:700,color:C.danger,fontFamily:"'IBM Plex Sans', sans-serif"}}>
          Reset Teacher Password
        </DialogTitle>
        <Divider/>
        <DialogContent sx={{pt:2.5}}>
          <InfoBanner color={C.danger} bg={C.dangerBg} border="#EF9A9A">
            This will reset the password for{' '}
            <strong>{resetTeacherDialog?.firstName} {resetTeacherDialog?.lastName}</strong>.
            Their current password will stop working immediately.
          </InfoBanner>
          <Typography sx={{fontSize:'0.75rem',color:C.text,fontFamily:"'IBM Plex Sans', sans-serif"}}>
            The new temporary password will be shown <strong>once only</strong>.
            Give it to the teacher in person or over the phone.
          </Typography>
        </DialogContent>
        <Divider/>
        <DialogActions sx={{px:3,py:2,gap:1}}>
          <Button onClick={()=>setResetTeacherDialog(null)} sx={{textTransform:'none',color:C.muted}}>
            Cancel
          </Button>
          <Button variant="contained"
            onClick={async()=>{
              setSaving(true);
              try {
                const res = await fetch(
                  `${BASE}/api/management/teachers/${resetTeacherDialog.id}/reset-password`,
                  {method:'POST', headers:authH()}
                );
                const d = await res.json();
                if (res.ok) {
                  setResetTeacherResult(d);
                } else {
                  toast(d.message||'Failed to reset','error');
                  setResetTeacherDialog(null);
                }
              } catch { toast('Network error','error'); setResetTeacherDialog(null); }
              setSaving(false);
            }}
            disabled={saving}
            sx={{background:C.danger,textTransform:'none',fontWeight:700,boxShadow:'none',
              fontFamily:"'IBM Plex Sans', sans-serif",'&:hover':{background:'#4a4a4a'}}}>
            {saving?'Resetting…':'Yes, Reset Password'}
          </Button>
        </DialogActions>
      </Dialog>
 
      {/* ── Teacher Temp Password shown ONCE ── */}
      <Dialog open={!!resetTeacherResult}
        onClose={()=>{setResetTeacherResult(null);setResetTeacherDialog(null);}}
        maxWidth="xs" fullWidth
        PaperProps={{sx:{borderRadius:'10px'}}}>
        <DialogTitle sx={{fontWeight:700,color:C.accent,fontFamily:"'IBM Plex Sans', sans-serif"}}>
          Teacher Password Reset
        </DialogTitle>
        <Divider/>
        <DialogContent sx={{pt:2.5}}>
          <Box sx={{background:'#f7f7f7',border:'1px solid #dfdfdf',borderRadius:'8px',p:2,mb:2,textAlign:'center'}}>
            <Typography sx={{fontSize:'0.66rem',color:C.muted,mb:0.5,fontFamily:"'IBM Plex Sans', sans-serif",textTransform:'uppercase',letterSpacing:'0.06em'}}>
              Temporary password for {resetTeacherResult?.firstName} {resetTeacherResult?.lastName}
            </Typography>
            <Typography sx={{fontSize:'1.41rem',fontWeight:800,fontFamily:'monospace',letterSpacing:'0.15em',color:C.brand}}>
              {resetTeacherResult?.tempPassword}
            </Typography>
            <Typography sx={{fontSize:'0.63rem',color:C.muted,mt:0.5,fontFamily:"'IBM Plex Sans', sans-serif"}}>
              Username: {resetTeacherResult?.username}
            </Typography>
          </Box>
          <Box sx={{background:C.dangerBg,border:'1px solid #EF9A9A',borderRadius:'6px',p:1.5}}>
            <Typography sx={{fontSize:'0.72rem',fontWeight:700,color:C.danger,fontFamily:"'IBM Plex Sans', sans-serif"}}>
              This password will NOT be shown again
            </Typography>
            <Typography sx={{fontSize:'0.7rem',color:C.danger,fontFamily:"'IBM Plex Sans', sans-serif",mt:0.5}}>
              Give it to the teacher directly. They will be forced to change it on next login.
            </Typography>
          </Box>
        </DialogContent>
        <Divider/>
        <DialogActions sx={{px:3,py:2}}>
          <Button variant="contained"
            onClick={()=>{setResetTeacherResult(null);setResetTeacherDialog(null);}}
            sx={{background:C.brand,textTransform:'none',fontWeight:700,boxShadow:'none',
              fontFamily:"'IBM Plex Sans', sans-serif"}}>
            I've written it down — Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snack_ snack={snack} onClose={()=>setSnack(s=>({...s,open:false}))}/>
    </Card_>
  );
};

/* ═══════════════════════════════════════════════════════════════
   TIMETABLE
═══════════════════════════════════════════════════════════════ */
const TimetableSection = () => {
  const [classes, setClasses]  = useState([]);
  const [selClass,setSelClass] = useState(null);
  const [ttData,  setTtData]   = useState(null);
  const [loading, setLoading]  = useState(true);
  const [slotDlg, setSlotDlg]  = useState(null);
  const [form,    setForm]     = useState({subjectId:'',teacherId:''});
  const [saving,  setSaving]   = useState(false);
  const [clash,   setClash]    = useState('');
  const [tBusy,   setTBusy]    = useState([]);
  const [snack,   setSnack]    = useState({open:false,msg:'',sev:'success'});
  const toast = toast_(setSnack);

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      const res=await fetch(`${BASE}/api/setup/classes`,{headers:authH()});
      if(res.ok)setClasses(await res.json());
      setLoading(false);
    })();
  },[]);

  const loadTimetable=async(cls)=>{
    setSelClass(cls);setTtData(null);
    const res=await fetch(`${BASE}/api/management/timetable/${cls.id}`,{headers:authH()});
    if(res.ok)setTtData(await res.json());
  };

  const slotMap={};
  ttData?.slots?.forEach(s=>{slotMap[`${s.dayOfWeek}-${s.periodId}`]=s;});

  const openSlot=(periodId,day)=>{
    const ex=slotMap[`${day}-${periodId}`];
    setForm({subjectId:ex?.subjectId||'',teacherId:ex?.teacherId||''});
    setClash('');setTBusy([]);
    setSlotDlg({periodId,day,existing:ex});
  };

  const handleTeacherChange=async(tid)=>{
    setForm(f=>({...f,teacherId:tid}));
    if(!tid)return setTBusy([]);
    const res=await fetch(`${BASE}/api/management/timetable/teacher-availability?teacherId=${tid}`,{headers:authH()});
    if(res.ok)setTBusy(await res.json());
  };

  const handleAssign=async()=>{
    if(!form.subjectId||!form.teacherId)return setClash('Select both subject and teacher.');
    setSaving(true);setClash('');
    if(slotDlg?.existing)await fetch(`${BASE}/api/management/timetable/${slotDlg.existing.id}`,{method:'DELETE',headers:authH()});
    const res=await fetch(`${BASE}/api/management/timetable`,{
      method:'POST',headers:jsonH(),
      body:JSON.stringify({classId:selClass.id,subjectId:form.subjectId,teacherId:form.teacherId,periodId:slotDlg.periodId,dayOfWeek:slotDlg.day}),
    });
    const d=await res.json();
    setSaving(false);
    if(res.ok){toast(`${d.subjectName} assigned`);setSlotDlg(null);loadTimetable(selClass);}
    else setClash(d.message||'Failed');
  };

  const removeSlot=async(slot)=>{
    await fetch(`${BASE}/api/management/timetable/${slot.id}`,{method:'DELETE',headers:authH()});
    toast('Slot cleared');loadTimetable(selClass);
  };

  if(loading)return<Box sx={{display:'flex',justifyContent:'center',py:8}}><CircularProgress sx={{color:C.brand}}/></Box>;

  return(
    <Card_ sx={{mb:0}}>
      <SectionHead title="Timetable Builder" subtitle="Click a class to build its weekly timetable"/>
      {!selClass?(
        <>
          {classes.length===0?(
            <Typography sx={{color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif"}}>No classes found. Add classes in School Setup first.</Typography>
          ):(
            <Box sx={{display:'flex',flexWrap:'wrap',gap:2}}>
              {classes.map(cls=>(
                <Box key={cls.id} onClick={()=>loadTimetable(cls)} sx={{width:140,p:2.5,borderRadius:'4px',cursor:'pointer',border:`1.5px solid ${C.border}`,background:C.white,textAlign:'center','&:hover':{borderColor:C.brand,background:'#f5f5f5'},transition:'all 0.15s'}}>
                  <Typography sx={{fontWeight:800,fontSize:'1.5rem',color:C.brand,lineHeight:1,fontFamily:"'IBM Plex Sans', sans-serif"}}>{cls.name}</Typography>
                  <Typography sx={{fontSize:'0.63rem',color:C.muted,mt:0.5,fontFamily:"'IBM Plex Sans', sans-serif"}}>{cls.grade}</Typography>
                  {cls.stream&&<Chip label={cls.stream} size="small" sx={{mt:0.75,fontSize:'0.58rem',fontWeight:700,bgcolor:'#f2f2f2',color:'#3f3f3f'}}/>}
                </Box>
              ))}
            </Box>
          )}
        </>
      ):(
        <Box>
          <Box sx={{background:C.brand,borderRadius:'4px',p:2,mb:2.5,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <Box>
              <Typography sx={{fontWeight:800,fontSize:'1.14rem',color:C.white,fontFamily:"'IBM Plex Sans', sans-serif"}}>
                {selClass.name} {selClass.stream&&<Chip label={selClass.stream} size="small" sx={{ml:1,bgcolor:'rgba(255,255,255,0.2)',color:C.white,fontWeight:700,fontSize:'0.63rem'}}/>}
              </Typography>
              <Typography sx={{fontSize:'0.69rem',color:'rgba(255,255,255,0.7)',fontFamily:"'IBM Plex Sans', sans-serif"}}>
                Grade {selClass.grade} · {(ttData?.slots||[]).length} slots filled
              </Typography>
            </Box>
            <Button size="small" onClick={()=>setSelClass(null)}
              sx={{color:C.white,textTransform:'none',fontWeight:700,border:'1px solid rgba(255,255,255,0.4)',fontFamily:"'IBM Plex Sans', sans-serif",'&:hover':{background:'rgba(255,255,255,0.1)'}}}>
              ← All Classes
            </Button>
          </Box>

          {!ttData?<Box sx={{display:'flex',justifyContent:'center',py:4}}><CircularProgress sx={{color:C.brand}}/></Box>:(
            <Box sx={{overflowX:'auto'}}>
              <Table sx={{borderCollapse:'collapse'}}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{...hc,width:90,minWidth:90}}>Day</TableCell>
                    {ttData.periods.map((period,i)=>(
                      <TableCell key={period.id} sx={{...hc,textAlign:'center',minWidth:period.isBreak?70:120,background:period.isBreak?'#efefef':C.headerBg,color:period.isBreak?C.muted:C.brand,...(i===ttData.periods.length-1?{borderRight:'none'}:{})}}>
                        <Typography sx={{fontWeight:700,fontSize:'0.62rem',fontFamily:"'IBM Plex Sans', sans-serif",letterSpacing:'0.04em',textTransform:'uppercase',color:'inherit'}}>{period.name}</Typography>
                        <Typography sx={{fontSize:'0.58rem',color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif",fontWeight:400,textTransform:'none',letterSpacing:0}}>{period.timeStart?.slice(0,5)}–{period.timeEnd?.slice(0,5)}</Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {DAYS.map(day=>(
                    <TableRow key={day}>
                      <TableCell sx={{...bc,background:C.headerBg,fontWeight:700,fontSize:'0.75rem',color:C.brand,whiteSpace:'nowrap'}}>{day.slice(0,3)}</TableCell>
                      {ttData.periods.map((period,i)=>{
                        if(period.isBreak)return(
                          <TableCell key={period.id} sx={{...bc,background:'#f5f5f5',textAlign:'center',...(i===ttData.periods.length-1?{borderRight:'none'}:{})}}>
                            <Typography sx={{fontSize:'0.6rem',color:C.muted,fontStyle:'italic',fontFamily:"'IBM Plex Sans', sans-serif"}}>—</Typography>
                          </TableCell>
                        );
                        const slot=slotMap[`${day}-${period.id}`];
                        return(
                          <TableCell key={period.id} onClick={()=>openSlot(period.id,day)} sx={{...bc,p:'4px',cursor:'pointer',background:slot?'#f0f0f0':C.white,border:`1px solid ${slot?'#c2c2c2':C.border}`,'&:hover':{background:slot?'#e3e3e3':'#f5f5f5'},minWidth:120,...(i===ttData.periods.length-1?{borderRight:'none'}:{})}}>
                            {slot?(
                              <Box sx={{p:'4px 6px',position:'relative'}}>
                                <Typography sx={{fontWeight:700,fontSize:'0.66rem',color:C.brand,fontFamily:"'IBM Plex Sans', sans-serif",lineHeight:1.3}}>{slot.subjectName}</Typography>
                                <Typography sx={{fontSize:'0.6rem',color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif"}}>{slot.teacherFirstName} {slot.teacherLastName}</Typography>
                                <IconButton size="small" onClick={e=>{e.stopPropagation();removeSlot(slot);}} sx={{position:'absolute',top:0,right:0,width:16,height:16,p:0,color:C.muted,opacity:0,'.MuiTableCell-root:hover &':{opacity:1},'&:hover':{color:C.danger}}}>
                                  <CloseIcon sx={{fontSize:11}}/>
                                </IconButton>
                              </Box>
                            ):(
                              <Box sx={{display:'flex',alignItems:'center',justifyContent:'center',height:44}}>
                                <Typography sx={{fontSize:'0.6rem',color:'#d3d3d3',fontFamily:"'IBM Plex Sans', sans-serif"}}>+ assign</Typography>
                              </Box>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          {/* Slot dialog */}
          <Dialog open={!!slotDlg} onClose={()=>setSlotDlg(null)} maxWidth="xs" fullWidth PaperProps={{sx:{borderRadius:'10px'}}}>
            <DialogTitle sx={{fontWeight:700,color:C.brand,fontFamily:"'IBM Plex Sans', sans-serif",pb:1}}>
              {slotDlg?.existing?'Edit Slot':'Assign Slot'}
              {slotDlg&&<Typography sx={{fontSize:'0.69rem',color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif"}}>{slotDlg.day} · {ttData?.periods?.find(p=>p.id===slotDlg?.periodId)?.name}</Typography>}
            </DialogTitle>
            <Divider/>
            <DialogContent sx={{pt:2.5,display:'flex',flexDirection:'column',gap:2}}>
              {clash&&<Box sx={{background:C.dangerBg,border:`1px solid ${C.danger}44`,borderRadius:'6px',p:1.25,display:'flex',gap:1}}><WarningAmberIcon sx={{color:C.danger,fontSize:17}}/><Typography sx={{fontSize:'0.7rem',color:C.danger,fontFamily:"'IBM Plex Sans', sans-serif"}}>{clash}</Typography></Box>}
              <TextField select label="Subject" value={form.subjectId} onChange={e=>setForm(f=>({...f,subjectId:e.target.value}))} size="small" fullWidth>
                <MenuItem value="">— Select subject —</MenuItem>
                {ttData?.subjects?.map(s=><MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              </TextField>
              <TextField select label="Teacher" value={form.teacherId} onChange={e=>handleTeacherChange(e.target.value)} size="small" fullWidth>
                <MenuItem value="">— Select teacher —</MenuItem>
                {(()=>{
                  if(!form.subjectId)return(ttData?.teachers||[]).map(t=>{
                    const busy=tBusy.some(b=>b.periodId===slotDlg?.periodId&&b.dayOfWeek===slotDlg?.day);
                    return<MenuItem key={t.id} value={t.id} disabled={busy}>{t.firstName} {t.lastName}{t.employeeNumber?` (${t.employeeNumber})`:''}{busy?' — busy':''}</MenuItem>;
                  });
                  const subject=(ttData?.subjects||[]).find(s=>String(s.id)===String(form.subjectId));
                  const nsId=subject?.nationalSubjectId;
                  const filtered=nsId?(ttData?.teachers||[]).filter(t=>t.subjectIds?.includes(nsId)):(ttData?.teachers||[]);
                  if(filtered.length===0)return[<MenuItem key="none" disabled value="">No teachers assigned to this subject</MenuItem>];
                  return filtered.map(t=>{
                    const busy=tBusy.some(b=>b.periodId===slotDlg?.periodId&&b.dayOfWeek===slotDlg?.day);
                    return<MenuItem key={t.id} value={t.id} disabled={busy}>{t.firstName} {t.lastName}{t.employeeNumber?` (${t.employeeNumber})`:''}{busy?' — busy':''}</MenuItem>;
                  });
                })()}
              </TextField>
            </DialogContent>
            <Divider/>
            <DialogActions sx={{px:3,py:2,gap:1}}>
              <Button onClick={()=>setSlotDlg(null)} sx={{textTransform:'none',color:C.muted}}>Cancel</Button>
              <Button variant="contained" onClick={handleAssign} disabled={saving}
                sx={{background:C.brand,textTransform:'none',fontWeight:700,boxShadow:'none',fontFamily:"'IBM Plex Sans', sans-serif"}}>
                {saving?'Saving…':slotDlg?.existing?'Update':'Assign'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
      <Snack_ snack={snack} onClose={()=>setSnack(s=>({...s,open:false}))}/>
    </Card_>
  );
};

/* ═══════════════════════════════════════════════════════════════
   SCHOOL SETUP
═══════════════════════════════════════════════════════════════ */
const SetupSection = () => {
  const [step,    setStep]    = useState('year');
  const [summary, setSummary] = useState(null);
  const [years,   setYears]   = useState([]);
  const [terms,   setTerms]   = useState([]);
  const [periods, setPeriods] = useState([]);
  const [subjects,setSubjects]= useState([]);
  const [classes, setClasses] = useState([]);
  const [natSubs, setNatSubs] = useState([]);
  const [snack,   setSnack]   = useState({open:false,msg:'',sev:'success'});
  const toast = toast_(setSnack);

  const fetchSummary=useCallback(async()=>{
    const res=await fetch(`${BASE}/api/setup/summary`,{headers:authH()});
    if(res.ok)setSummary(await res.json());
  },[]);

  useEffect(()=>{fetchSummary();fetchYears();fetchPeriods();},[fetchSummary]);
  useEffect(()=>{ if(summary?.currentYearId){fetchTerms();fetchSubjects();fetchClasses();} },[summary?.currentYearId]);

  const fetchYears   =async()=>{const r=await fetch(`${BASE}/api/setup/academic-years`,{headers:authH()});if(r.ok)setYears(await r.json());};
  const fetchTerms   =async()=>{if(!summary?.currentYearId)return;const r=await fetch(`${BASE}/api/setup/terms?academicYearId=${summary.currentYearId}`,{headers:authH()});if(r.ok)setTerms(await r.json());};
  const fetchPeriods =async()=>{const r=await fetch(`${BASE}/api/setup/periods`,{headers:authH()});if(r.ok)setPeriods(await r.json());};
  const fetchSubjects=async()=>{if(!summary?.currentYearId)return;const r=await fetch(`${BASE}/api/setup/subjects?academicYearId=${summary.currentYearId}`,{headers:authH()});if(r.ok)setSubjects(await r.json());};
  const fetchClasses =async()=>{if(!summary?.currentYearId)return;const r=await fetch(`${BASE}/api/setup/classes?academicYearId=${summary.currentYearId}`,{headers:authH()});if(r.ok)setClasses(await r.json());};

  const isDone={year:!!summary?.hasCurrentYear,terms:summary?.terms>=4,periods:summary?.periods>0,subjects:summary?.subjects>0,classes:summary?.classes>0};
  const STEPS=[{key:'year',label:'Academic Year'},{key:'terms',label:'Terms'},{key:'periods',label:'Periods'},{key:'subjects',label:'Subjects'},{key:'classes',label:'Classes'}];

  const [newYear,setNewYear]=useState('2026');
  const [saving, setSaving] =useState(false);

  const handleCreateYear=async()=>{
    setSaving(true);
    const r=await fetch(`${BASE}/api/setup/academic-years`,{method:'POST',headers:jsonH(),body:JSON.stringify({year:parseInt(newYear)})});
    setSaving(false);
    if(r.ok){toast(`Year ${newYear} set`);fetchYears();fetchSummary();}
    else{const e=await r.json();toast(e.message||'Failed','error');}
  };

  const [tDates,setTDates]=useState({1:{s:'',e:''},2:{s:'',e:''},3:{s:'',e:''},4:{s:'',e:''}});
  useEffect(()=>{const m={};terms.forEach(t=>{m[t.term_number]={s:t.start_date?.slice(0,10)||'',e:t.end_date?.slice(0,10)||''};});setTDates(p=>({...p,...m}));},[terms]);

  const saveTerm=async(n)=>{
    if(!summary?.currentYearId)return toast('Set academic year first','error');
    const d=tDates[n];if(!d.s||!d.e)return toast('Both dates required','error');
    setSaving(true);
    const r=await fetch(`${BASE}/api/setup/terms`,{method:'POST',headers:jsonH(),body:JSON.stringify({academicYearId:summary.currentYearId,termNumber:n,startDate:d.s,endDate:d.e})});
    setSaving(false);
    if(r.ok){toast(`Term ${n} saved`);fetchTerms();fetchSummary();}
    else{const e=await r.json();toast(e.message||'Failed','error');}
  };

  const DEF_PERIODS=[
    {periodNumber:1,name:'Period 1',timeStart:'07:30',timeEnd:'08:15',isBreak:false},
    {periodNumber:2,name:'Period 2',timeStart:'08:15',timeEnd:'09:00',isBreak:false},
    {periodNumber:3,name:'Period 3',timeStart:'09:00',timeEnd:'09:45',isBreak:false},
    {periodNumber:4,name:'Morning Break',timeStart:'09:45',timeEnd:'10:05',isBreak:true},
    {periodNumber:5,name:'Period 4',timeStart:'10:05',timeEnd:'10:50',isBreak:false},
    {periodNumber:6,name:'Period 5',timeStart:'10:50',timeEnd:'11:35',isBreak:false},
    {periodNumber:7,name:'Period 6',timeStart:'11:35',timeEnd:'12:20',isBreak:false},
    {periodNumber:8,name:'Lunch',timeStart:'12:20',timeEnd:'13:00',isBreak:true},
    {periodNumber:9,name:'Period 7',timeStart:'13:00',timeEnd:'13:45',isBreak:false},
    {periodNumber:10,name:'Period 8',timeStart:'13:45',timeEnd:'14:30',isBreak:false},
  ];
  const [pRows,setPRows]=useState([]);
  useEffect(()=>{if(periods.length>0)setPRows(periods.map(p=>({periodNumber:p.period_number,name:p.name,timeStart:p.time_start?.slice(0,5)||'',timeEnd:p.time_end?.slice(0,5)||'',isBreak:p.is_break})));else setPRows(DEF_PERIODS);},[periods]);

  const savePeriods=async()=>{
    setSaving(true);
    const r=await fetch(`${BASE}/api/setup/periods`,{method:'PUT',headers:jsonH(),body:JSON.stringify({periods:pRows})});
    setSaving(false);
    if(r.ok){toast('Periods saved');fetchPeriods();fetchSummary();}
    else{const e=await r.json();toast(e.message||'Failed','error');}
  };

  const [addGrade,setAddGrade]=useState('');
  const [addStream,setAddStream]=useState('');
  const [selNat,setSelNat]=useState([]);

  useEffect(()=>{
    if(!addGrade)return;
    (async()=>{
      let url=`${BASE}/api/setup/national-subjects?grade=${addGrade}`;
      if(parseInt(addGrade)>=10&&addStream)url+=`&stream=${addStream}`;
      const r=await fetch(url,{headers:authH()});
      if(r.ok)setNatSubs(await r.json());
    })();
  },[addGrade,addStream]);

  const added=new Set(subjects.filter(s=>s.grade===parseInt(addGrade)&&(s.stream===addStream||(!s.stream&&!addStream))).map(s=>s.national_subject_id));
  const available=natSubs.filter(ns=>!added.has(ns.id));

  const addSubjects=async()=>{
    if(!selNat.length)return toast('Select subjects','error');
    if(!summary?.currentYearId)return toast('Set year first','error');
    setSaving(true);
    const payload=selNat.map(id=>({academicYearId:summary.currentYearId,nationalSubjectId:id,grade:parseInt(addGrade),stream:parseInt(addGrade)>=10?addStream||null:null}));
    const r=await fetch(`${BASE}/api/setup/subjects`,{method:'POST',headers:jsonH(),body:JSON.stringify(payload)});
    setSaving(false);
    if(r.ok){toast(`${selNat.length} subject(s) added`);setSelNat([]);fetchSubjects();fetchSummary();}
    else{const e=await r.json();toast(e.message||'Failed','error');}
  };

  const removeSubject=async(id)=>{
    await fetch(`${BASE}/api/setup/subjects/${id}`,{method:'DELETE',headers:authH()});
    toast('Subject removed');fetchSubjects();fetchSummary();
  };

  const [clsForm,setClsForm]=useState({grade:'',stream:'',letter:'',capacity:40});

  const addClass=async()=>{
    if(!clsForm.grade||!clsForm.letter)return toast('Grade and letter required','error');
    if(!summary?.currentYearId)return toast('Set year first','error');
    if(parseInt(clsForm.grade)>=10&&!clsForm.stream)return toast('Stream required for Gr 10–12','error');
    setSaving(true);
    const r=await fetch(`${BASE}/api/setup/classes`,{method:'POST',headers:jsonH(),body:JSON.stringify({academicYearId:summary.currentYearId,grade:parseInt(clsForm.grade),stream:parseInt(clsForm.grade)>=10?clsForm.stream:null,letter:clsForm.letter,capacity:clsForm.capacity})});
    setSaving(false);
    if(r.ok){toast(`Class ${clsForm.grade}${clsForm.letter} created`);fetchClasses();fetchSummary();}
    else{const e=await r.json();toast(e.message||'Failed','error');}
  };

  const removeClass=async(id,name)=>{
    await fetch(`${BASE}/api/setup/classes/${id}`,{method:'DELETE',headers:authH()});
    toast(`Class ${name} removed`);fetchClasses();fetchSummary();
  };

  return(
    <Card_ sx={{mb:0}}>
      <SectionHead title="School Setup" subtitle={summary?.currentYear?`Academic Year ${summary.currentYear}`:'Configure your school structure'}/>
      <Box sx={{display:'flex',gap:1,mb:3,flexWrap:'wrap'}}>
        {STEPS.map(s=>(
          <Button key={s.key} onClick={()=>setStep(s.key)} size="small" sx={{textTransform:'none',fontWeight:700,fontSize:'0.7rem',fontFamily:"'IBM Plex Sans', sans-serif",background:step===s.key?C.brand:'transparent',color:step===s.key?C.white:isDone[s.key]?C.accent:C.muted,border:step===s.key?`1.5px solid ${C.brand}`:`1.5px solid ${C.border}`,borderRadius:'6px',px:1.75,py:0.6,'&:hover':{background:step===s.key?C.brand:C.sidebarAct}}}>
            {isDone[s.key]&&step!==s.key&&<CheckCircleIcon sx={{fontSize:14,mr:0.5}}/>}{s.label}
          </Button>
        ))}
      </Box>

      {step==='year'&&(
        <Box>
          <Box sx={{display:'flex',gap:2,alignItems:'center',mb:3}}>
            <TextField label="Year" value={newYear} onChange={e=>setNewYear(e.target.value)} size="small" type="number" sx={{width:140}} inputProps={{min:2024,max:2030}}/>
            <Button variant="contained" onClick={handleCreateYear} disabled={saving} sx={{background:C.brand,textTransform:'none',fontWeight:700,boxShadow:'none',fontFamily:"'IBM Plex Sans', sans-serif"}}>{saving?'Setting…':'Set Academic Year'}</Button>
          </Box>
          {years.map(y=>(
            <Box key={y.id} sx={{display:'flex',alignItems:'center',gap:2,py:1,borderBottom:`1px solid ${C.border}`}}>
              <Typography sx={{fontWeight:700,fontSize:'0.79rem',fontFamily:"'IBM Plex Sans', sans-serif"}}>{y.year}</Typography>
              {y.is_current&&<Chip label="Current" size="small" sx={{bgcolor:'#f0f0f0',color:C.accent,fontWeight:700,fontSize:'0.62rem'}}/>}
            </Box>
          ))}
        </Box>
      )}

      {step==='terms'&&(
        <Box sx={{display:'flex',flexDirection:'column',gap:1.5}}>
          {!summary?.hasCurrentYear&&<InfoBanner>Set academic year first.</InfoBanner>}
          {TERMS.map(n=>{
            const saved=terms.find(t=>t.term_number===n);
            return(
              <Box key={n} sx={{display:'flex',alignItems:'center',gap:2,flexWrap:'wrap',p:1.5,borderRadius:'8px',background:saved?'#f8f8f8':C.bg,border:`1px solid ${saved?'#e1e1e1':C.border}`}}>
                <Box sx={{display:'flex',alignItems:'center',gap:1,minWidth:90}}>
                  {saved?<CheckCircleIcon sx={{color:C.accent,fontSize:18}}/>:<RadioButtonUncheckedIcon sx={{color:C.muted,fontSize:18}}/>}
                  <Typography sx={{fontWeight:700,fontSize:'0.79rem',color:C.brand,fontFamily:"'IBM Plex Sans', sans-serif"}}>Term {n}</Typography>
                </Box>
                <TextField label="Start Date" type="date" size="small" value={tDates[n]?.s||''} onChange={e=>setTDates(p=>({...p,[n]:{...p[n],s:e.target.value}}))} InputLabelProps={{shrink:true}} disabled={!summary?.hasCurrentYear} sx={{width:170}}/>
                <TextField label="End Date" type="date" size="small" value={tDates[n]?.e||''} onChange={e=>setTDates(p=>({...p,[n]:{...p[n],e:e.target.value}}))} InputLabelProps={{shrink:true}} disabled={!summary?.hasCurrentYear} sx={{width:170}}/>
                <Button size="small" variant="contained" onClick={()=>saveTerm(n)} disabled={saving||!summary?.hasCurrentYear}
                  sx={{background:saved?C.accent:C.brand,textTransform:'none',fontWeight:700,boxShadow:'none',fontFamily:"'IBM Plex Sans', sans-serif"}}>
                  {saved?'Update':'Save'}
                </Button>
              </Box>
            );
          })}
        </Box>
      )}

      {step==='periods'&&(
        <Box>
          <Box sx={{display:'flex',justifyContent:'flex-end',mb:2}}>
            <Button variant="contained" onClick={savePeriods} disabled={saving} sx={{background:C.accent,textTransform:'none',fontWeight:700,boxShadow:'none',fontFamily:"'IBM Plex Sans', sans-serif"}}>{saving?'Saving…':'Save All Periods'}</Button>
          </Box>
          <TableContainer component={Paper} elevation={0} sx={{border:`1px solid ${C.border}`,borderRadius:'4px'}}>
            <Table size="small" sx={{borderCollapse:'collapse'}}>
              <TableHead><TableRow>{['#','Name','Start','End','Break?',''].map(h=><TableCell key={h} sx={{...hc,...(h===''?{borderRight:'none'}:{})}}>{h}</TableCell>)}</TableRow></TableHead>
              <TableBody>
                {pRows.map((row,idx)=>(
                  <TableRow key={idx} sx={{background:row.isBreak?'#f7f7f7':(idx%2===0?C.white:'#fbfbfb')}}>
                    <TableCell sx={{...bc,color:C.muted,textAlign:'center',width:40}}>{row.periodNumber}</TableCell>
                    <TableCell sx={bc}><TextField value={row.name} size="small" variant="standard" onChange={e=>setPRows(r=>r.map((rw,i)=>i===idx?{...rw,name:e.target.value}:rw))} sx={{width:150}}/></TableCell>
                    <TableCell sx={bc}><TextField value={row.timeStart} size="small" type="time" variant="standard" onChange={e=>setPRows(r=>r.map((rw,i)=>i===idx?{...rw,timeStart:e.target.value}:rw))} sx={{width:90}}/></TableCell>
                    <TableCell sx={bc}><TextField value={row.timeEnd} size="small" type="time" variant="standard" onChange={e=>setPRows(r=>r.map((rw,i)=>i===idx?{...rw,timeEnd:e.target.value}:rw))} sx={{width:90}}/></TableCell>
                    <TableCell sx={bc}><Switch checked={row.isBreak} size="small" onChange={e=>setPRows(r=>r.map((rw,i)=>i===idx?{...rw,isBreak:e.target.checked}:rw))}inputProps={{ id: `break-switch-${idx}`, name: `break-switch-${idx}` }}/></TableCell>
                    <TableCell sx={{...bc,borderRight:'none'}}><IconButton size="small" onClick={()=>setPRows(r=>r.filter((_,i)=>i!==idx).map((rw,i)=>({...rw,periodNumber:i+1})))} sx={{color:C.danger}}><DeleteIcon sx={{fontSize:15}}/></IconButton></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button size="small" startIcon={<AddIcon/>} onClick={()=>setPRows(r=>[...r,{periodNumber:r.length+1,name:`Period ${r.length+1}`,timeStart:'',timeEnd:'',isBreak:false}])} sx={{mt:1,textTransform:'none',fontWeight:600,color:C.brand,fontFamily:"'IBM Plex Sans', sans-serif"}}>Add period</Button>
        </Box>
      )}

      {step==='subjects'&&(
        <Box>
          {!summary?.hasCurrentYear&&<InfoBanner>Set academic year first.</InfoBanner>}
          <Box sx={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:'8px',p:2,mb:3}}>
            <Typography sx={{fontWeight:700,fontSize:'0.75rem',color:C.brand,mb:1.5,fontFamily:"'IBM Plex Sans', sans-serif"}}>Add Subjects</Typography>
            <Box sx={{display:'flex',gap:2,flexWrap:'wrap',mb:1.5}}>
              <TextField select label="Grade" value={addGrade} onChange={e=>{setAddGrade(e.target.value);setSelNat([]);}} size="small" sx={{width:120}}>
                {GRADES.map(g=><MenuItem key={g} value={g}>Grade {g}</MenuItem>)}
              </TextField>
              {parseInt(addGrade)>=10&&(
                <TextField select label="Stream" value={addStream} onChange={e=>{setAddStream(e.target.value);setSelNat([]);}} size="small" sx={{width:150}}>
                  <MenuItem value="">All streams</MenuItem>
                  {STREAMS.map(s=><MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
              )}
            </Box>
            {addGrade&&available.length>0&&(
              <>
                <Box sx={{display:'flex',flexWrap:'wrap',gap:0.75,mb:1.5}}>
                  {available.map(ns=>(
                    <Chip key={ns.id} label={ns.name} size="small" clickable onClick={()=>setSelNat(p=>p.includes(ns.id)?p.filter(x=>x!==ns.id):[...p,ns.id])}
                      sx={{fontWeight:600,fontSize:'0.66rem',fontFamily:"'IBM Plex Sans', sans-serif",background:selNat.includes(ns.id)?C.brand:C.white,color:selNat.includes(ns.id)?C.white:C.text,border:`1px solid ${selNat.includes(ns.id)?C.brand:C.border}`}}/>
                  ))}
                </Box>
                <Button variant="contained" size="small" onClick={addSubjects} disabled={!selNat.length||saving}
                  sx={{background:C.brand,textTransform:'none',fontWeight:700,boxShadow:'none',fontFamily:"'IBM Plex Sans', sans-serif"}}>
                  Add {selNat.length||''} Subject{selNat.length!==1?'s':''}
                </Button>
              </>
            )}
            {addGrade&&available.length===0&&<Typography sx={{fontSize:'0.72rem',color:C.accent,fontFamily:"'IBM Plex Sans', sans-serif"}}>All subjects for this grade/stream already added.</Typography>}
          </Box>
          {subjects.length>0&&(
            <TableContainer component={Paper} elevation={0} sx={{border:`1px solid ${C.border}`,borderRadius:'4px'}}>
              <Table size="small" sx={{borderCollapse:'collapse'}}>
                <TableHead><TableRow>{['Subject','Code','Grade','Stream',''].map(h=><TableCell key={h} sx={{...hc,...(h===''?{borderRight:'none'}:{})}}>{h}</TableCell>)}</TableRow></TableHead>
                <TableBody>
                  {subjects.map((s,idx)=>(
                    <TableRow key={s.id} sx={{backgroundColor:idx%2===0?C.white:'#fbfbfb'}}>
                      <TableCell sx={{...bc,fontWeight:600}}>{s.name}</TableCell>
                      <TableCell sx={{...bc,fontFamily:'monospace',fontSize:'0.7rem'}}>{s.code||'—'}</TableCell>
                      <TableCell sx={bc}> {s.grade}</TableCell>
                      <TableCell sx={bc}>{s.stream?<Chip label={s.stream} size="small" sx={{fontSize:'0.62rem',fontWeight:700,bgcolor:'#f2f2f2',color:'#3f3f3f'}}/>:'All'}</TableCell>
                      <TableCell sx={{...bc,borderRight:'none'}}><IconButton size="small" onClick={()=>removeSubject(s.id)} sx={{color:C.danger}}><DeleteIcon sx={{fontSize:15}}/></IconButton></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {step==='classes'&&(
        <Box>
          {!summary?.hasCurrentYear&&<InfoBanner>Set academic year first.</InfoBanner>}
          <Box sx={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:'8px',p:2,mb:3}}>
            <Typography sx={{fontWeight:700,fontSize:'0.75rem',color:C.brand,mb:1.5,fontFamily:"'IBM Plex Sans', sans-serif"}}>Add Class</Typography>
            <Box sx={{display:'flex',gap:2,flexWrap:'wrap',alignItems:'flex-end'}}>
              <TextField select label="Grade" value={clsForm.grade} onChange={e=>setClsForm(f=>({...f,grade:e.target.value,stream:''}))} size="small" sx={{width:120}}>
                {GRADES.map(g=><MenuItem key={g} value={g}>Grade {g}</MenuItem>)}
              </TextField>
              {parseInt(clsForm.grade)>=10&&(
                <TextField select label="Stream" value={clsForm.stream} onChange={e=>setClsForm(f=>({...f,stream:e.target.value}))} size="small" sx={{width:150}}>
                  {STREAMS.map(s=><MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
              )}
              <TextField select label="Letter" value={clsForm.letter} onChange={e=>setClsForm(f=>({...f,letter:e.target.value}))} size="small" sx={{width:100}}>
                {LETTERS.map(l=><MenuItem key={l} value={l}>{l}</MenuItem>)}
              </TextField>
              <TextField label="Capacity" type="number" value={clsForm.capacity} onChange={e=>setClsForm(f=>({...f,capacity:parseInt(e.target.value)||40}))} size="small" sx={{width:100}} inputProps={{min:1,max:60}}/>
              <Button variant="contained" startIcon={<AddIcon/>} onClick={addClass} disabled={saving||!summary?.hasCurrentYear}
                sx={{background:C.brand,textTransform:'none',fontWeight:700,boxShadow:'none',fontFamily:"'IBM Plex Sans', sans-serif"}}>
                {saving?'Adding…':'Add Class'}
              </Button>
            </Box>
            {clsForm.grade&&clsForm.letter&&(
              <Typography sx={{fontSize:'0.69rem',color:C.muted,mt:1,fontFamily:"'IBM Plex Sans', sans-serif"}}>
                Preview: <strong style={{color:C.brand}}>{clsForm.grade}{clsForm.letter}{clsForm.stream?` — ${clsForm.stream}`:''}</strong>
              </Typography>
            )}
          </Box>
          {classes.length>0&&(
            <Box sx={{display:'flex',flexWrap:'wrap',gap:1.5}}>
              {classes.map(cls=>(
                <Box key={cls.id} sx={{position:'relative',p:2,borderRadius:'4px',border:`1.5px solid ${C.border}`,background:C.white,textAlign:'center',minWidth:120,'&:hover .del-btn':{opacity:1}}}>
                  <Typography sx={{fontWeight:800,fontSize:'1.32rem',color:C.brand,lineHeight:1,fontFamily:"'IBM Plex Sans', sans-serif"}}>{cls.name}</Typography>
                  <Typography sx={{fontSize:'0.62rem',color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif"}}>{cls.grade}</Typography>
                  {cls.stream&&<Chip label={cls.stream} size="small" sx={{mt:0.5,fontSize:'0.58rem',fontWeight:700,bgcolor:'#f2f2f2',color:'#3f3f3f'}}/>}
                  <IconButton className="del-btn" size="small" onClick={()=>removeClass(cls.id,cls.name)}
                    sx={{position:'absolute',top:4,right:4,opacity:0,color:C.danger,transition:'opacity 0.15s',width:20,height:20}}>
                    <CloseIcon sx={{fontSize:13}}/>
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      <Snack_ snack={snack} onClose={()=>setSnack(s=>({...s,open:false}))}/>
    </Card_>
  );
};

const EventsSection = () => {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog,  setDialog]  = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [month,   setMonth]   = useState(new Date().toISOString().slice(0,7)); // YYYY-MM
  const [snack,   setSnack]   = useState({open:false,msg:'',sev:'success'});
  const toast = toast_(setSnack);
 
  const EF = {title:'',description:'',eventDate:'',eventTime:'',location:'',type:'general'};
  const [form, setForm] = useState(EF);
 
  const EVENT_TYPES = ['general','exam','holiday','meeting','sport','other'];
  const TYPE_COLORS = {
    general:  {bg:'#f2f2f2',color:'#3f3f3f'},
    exam:     {bg:'#f5f5f5',color:'#4a4a4a'},
    holiday:  {bg:'#f8f8f8',color:'#484848'},
    meeting:  {bg:'#f8f8f8',color:'#626262'},
    sport:    {bg:'#f7f7f7',color:'#515151'},
    other:    {bg:'#fafafa',color:'#404040'},
  };
 
  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${BASE}/api/management/events?month=${month}`, {headers:authH()});
    if (res.ok) setEvents(await res.json());
    setLoading(false);
  }, [month]);
  useEffect(()=>{fetch_();},[fetch_]);
 
  const openAdd  = () => { setEditing(null); setForm(EF); setDialog(true); };
  const openEdit = (e) => {
    setEditing(e);
    setForm({
      title:       e.title,
      description: e.description||'',
      eventDate:   e.eventDate?.slice(0,10)||'',
      eventTime:   e.eventTime?.slice(0,5)||'',
      location:    e.location||'',
      type:        e.type||'general',
    });
    setDialog(true);
  };
 
  const handleSave = async () => {
    if (!form.title||!form.eventDate) return toast('Title and date are required','error');
    setSaving(true);
    const url    = editing ? `${BASE}/api/management/events/${editing.id}` : `${BASE}/api/management/events`;
    const method = editing ? 'PATCH' : 'POST';
    const res = await fetch(url, {method, headers:jsonH(), body:JSON.stringify(form)});
    const d = await res.json();
    setSaving(false);
    if (res.ok) { toast(editing?'Event updated':'Event created'); setDialog(false); fetch_(); }
    else toast(d.message||'Failed','error');
  };
 
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    await fetch(`${BASE}/api/management/events/${id}`, {method:'DELETE', headers:authH()});
    toast('Event deleted'); fetch_();
  };
 
  // Group events by date
  const grouped = events.reduce((acc,e) => {
    const d = e.eventDate?.slice(0,10);
    (acc[d] = acc[d]||[]).push(e);
    return acc;
  }, {});
 
  const fmtDate = d => new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});

  return (
    <Card_ sx={{mb:0,p:0,overflow:'hidden'}}>
      <Box sx={{p:2.5,pb:0}}>
        <SectionHead title="Events" subtitle={`Events for ${new Date(month+'-01').toLocaleDateString('en-US',{month:'long',year:'numeric'})}`}
          action={
            <Box sx={{display:'flex',gap:1.5,alignItems:'center'}}>
              <TextField type="month" value={month} onChange={e=>setMonth(e.target.value)} size="small" InputLabelProps={{shrink:true}}/>
              <Tooltip title="Add Event"><IconButton size="small" onClick={openAdd} sx={{color:C.white,background:C.brand,borderRadius:'4px','&:hover':{background:C.brand}}}><AddIcon sx={{fontSize:18}}/></IconButton></Tooltip>
            </Box>
          }
        />
      </Box>

      <Box sx={{display:'flex',minHeight:420}}>
        <Box sx={{flex:'1 1 60%',minWidth:0,p:2.5,pt:1.5}}>
          {loading ? <Box sx={{display:'flex',justifyContent:'center',py:6}}><CircularProgress sx={{color:C.brand}}/></Box>
          : events.length===0 ? (
            <Box sx={{textAlign:'center',py:6}}>
              <EventIcon sx={{color:C.border,fontSize:44,mb:1}}/>
              <Typography sx={{color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif"}}>No events this month.</Typography>
            </Box>
          ) : (
            <Box sx={{display:'flex',flexDirection:'column',gap:2}}>
              {Object.keys(grouped).sort().map(date=>(
                <Box key={date}>
                  <Typography sx={{fontSize:'0.69rem',fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.06em',mb:1,fontFamily:"'IBM Plex Sans', sans-serif"}}>
                    {new Date(date+'T00:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'2-digit',month:'long'})}
                  </Typography>
                  <Box sx={{display:'flex',flexDirection:'column',gap:0.75}}>
                    {grouped[date].map(ev=>{
                      const tc = TYPE_COLORS[ev.type]||TYPE_COLORS.other;
                      return(
                        <Box key={ev.id} sx={{display:'flex',alignItems:'center',gap:2,p:1.5,borderRadius:'8px',border:`1px solid ${editing?.id===ev.id&&dialog?C.brand:C.border}`,background:editing?.id===ev.id&&dialog?'#e3e3e3':C.white,'&:hover':{background:editing?.id===ev.id&&dialog?'#e3e3e3':C.bg}}}>
                          <Box sx={{width:4,alignSelf:'stretch',borderRadius:'4px',background:tc.color,flexShrink:0}}/>
                          <Box sx={{flex:1,minWidth:0}}>
                            <Box sx={{display:'flex',alignItems:'center',gap:1,flexWrap:'wrap'}}>
                              <Typography sx={{fontWeight:700,fontSize:'0.79rem',color:C.text,fontFamily:"'IBM Plex Sans', sans-serif"}}>{ev.title}</Typography>
                              <Chip label={ev.type} size="small" sx={{height:18,fontSize:'0.58rem',fontWeight:700,bgcolor:tc.bg,color:tc.color}}/>
                            </Box>
                            {ev.description&&<Typography sx={{fontSize:'0.7rem',color:C.muted,mt:0.25,fontFamily:"'IBM Plex Sans', sans-serif"}}>{ev.description}</Typography>}
                            <Box sx={{display:'flex',gap:2,mt:0.5,flexWrap:'wrap'}}>
                              {ev.eventTime&&<Typography sx={{fontSize:'0.66rem',color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif"}}>{ev.eventTime?.slice(0,5)}</Typography>}
                              {ev.location&&<Typography sx={{fontSize:'0.66rem',color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif"}}>{ev.location}</Typography>}
                            </Box>
                          </Box>
                          <Box sx={{display:'flex',gap:0.5,flexShrink:0}}>
                            <Tooltip title="Edit"><IconButton size="small" onClick={()=>openEdit(ev)} sx={{color:C.brand}}><EditIcon sx={{fontSize:15}}/></IconButton></Tooltip>
                            <Tooltip title="Delete"><IconButton size="small" onClick={()=>handleDelete(ev.id)} sx={{color:C.danger}}><DeleteIcon sx={{fontSize:15}}/></IconButton></Tooltip>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <Box sx={{flex:'1 1 40%',minWidth:320,borderLeft:`1px solid ${C.border}`,background:C.sidebar}}>
          {!dialog ? (
            <DetailEmpty icon={<EventIcon sx={{fontSize:34,color:C.border}}/>} text="Select an event to edit, or click + to add a new event."/>
          ) : (
            <DetailPanel
              title={editing?`Edit Event — ${editing.title}`:'Add Event'}
              onClose={()=>setDialog(false)}
              createdAt={editing?.createdAt}
              fmt={fmtDate}
              onReset={()=>editing?openEdit(editing):openAdd()}
              onSave={handleSave}
              saving={saving}
              saveLabel={editing?'Update':'Create Event'}
            >
              <FormRow label="Title" required>
                <TextField value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} size="small" fullWidth inputProps={{maxLength:200}}/>
              </FormRow>
              <FormRow label="Description">
                <TextField value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} size="small" fullWidth multiline rows={2}/>
              </FormRow>
              <FormRow label="Date" required>
                <TextField type="date" value={form.eventDate} onChange={e=>setForm(f=>({...f,eventDate:e.target.value}))} size="small" fullWidth InputLabelProps={{shrink:true}}/>
              </FormRow>
              <FormRow label="Time">
                <TextField type="time" value={form.eventTime} onChange={e=>setForm(f=>({...f,eventTime:e.target.value}))} size="small" fullWidth InputLabelProps={{shrink:true}}/>
              </FormRow>
              <FormRow label="Location">
                <TextField value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} size="small" fullWidth/>
              </FormRow>
              <FormRow label="Type">
                <TextField select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} size="small" fullWidth>
                  {EVENT_TYPES.map(t=><MenuItem key={t} value={t} sx={{textTransform:'capitalize'}}>{t}</MenuItem>)}
                </TextField>
              </FormRow>
            </DetailPanel>
          )}
        </Box>
      </Box>

      <Snack_ snack={snack} onClose={()=>setSnack(s=>({...s,open:false}))}/>
    </Card_>
  );
};

/* ═══════════════════════════════════════════════════════════════
   ANNOUNCEMENTS SECTION
═══════════════════════════════════════════════════════════════ */
const AnnouncementsSection = () => {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog,  setDialog]  = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [snack,   setSnack]   = useState({open:false,msg:'',sev:'success'});
  const toast = toast_(setSnack);
 
  const EF = {title:'',body:'',audience:'all',isPinned:false};
  const [form, setForm] = useState(EF);
 
  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${BASE}/api/management/announcements`, {headers:authH()});
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }, []);
  useEffect(()=>{fetch_();},[fetch_]);
 
  const openAdd  = () => { setEditing(null); setForm(EF); setDialog(true); };
  const openEdit = (a) => { setEditing(a); setForm({title:a.title,body:a.body,audience:a.audience,isPinned:a.isPinned}); setDialog(true); };
 
  const handleSave = async () => {
    if (!form.title||!form.body) return toast('Title and body are required','error');
    setSaving(true);
    const url    = editing ? `${BASE}/api/management/announcements/${editing.id}` : `${BASE}/api/management/announcements`;
    const method = editing ? 'PATCH' : 'POST';
    const res = await fetch(url, {method, headers:jsonH(), body:JSON.stringify(form)});
    const d = await res.json();
    setSaving(false);
    if (res.ok) { toast(editing?'Updated':'Created'); setDialog(false); fetch_(); }
    else toast(d.message||'Failed','error');
  };
 
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    await fetch(`${BASE}/api/management/announcements/${id}`, {method:'DELETE',headers:authH()});
    toast('Deleted'); fetch_();
  };
 
  const togglePin = async (a) => {
    await fetch(`${BASE}/api/management/announcements/${a.id}`, {
      method:'PATCH', headers:jsonH(),
      body: JSON.stringify({isPinned:!a.isPinned}),
    });
    fetch_();
  };
 
  const AUDIENCE_COLORS = {all:{bg:'#f2f2f2',color:'#3f3f3f'},teachers:{bg:'#f8f8f8',color:'#626262'},students:{bg:'#f8f8f8',color:'#484848'}};
 
  const fmtDate = d => new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});

  return (
    <Card_ sx={{mb:0,p:0,overflow:'hidden'}}>
      <Box sx={{p:2.5,pb:0}}>
        <SectionHead title="Announcements" subtitle="Post notices for teachers and students"
          action={
            <Tooltip title="New Announcement"><IconButton size="small" onClick={openAdd} sx={{color:C.white,background:C.brand,borderRadius:'4px','&:hover':{background:C.brand}}}><AddIcon sx={{fontSize:18}}/></IconButton></Tooltip>
          }
        />
      </Box>

      <Box sx={{display:'flex',minHeight:420}}>
        <Box sx={{flex:'1 1 60%',minWidth:0,p:2.5,pt:1.5}}>
          {loading ? <Box sx={{display:'flex',justifyContent:'center',py:6}}><CircularProgress sx={{color:C.brand}}/></Box>
          : items.length===0 ? (
            <Box sx={{textAlign:'center',py:6}}>
              <CampaignIcon sx={{color:C.border,fontSize:44,mb:1}}/>
              <Typography sx={{color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif"}}>No announcements yet.</Typography>
            </Box>
          ) : (
            <Box sx={{display:'flex',flexDirection:'column',gap:1.5}}>
              {items.map(a=>{
                const ac = AUDIENCE_COLORS[a.audience]||AUDIENCE_COLORS.all;
                const sel = editing?.id===a.id&&dialog;
                return(
                  <Box key={a.id} sx={{p:2,borderRadius:'8px',border:`1px solid ${a.isPinned||sel?C.brand:C.border}`,background:sel?'#e3e3e3':a.isPinned?'#f0f0f0':C.white,position:'relative'}}>
                    {a.isPinned&&<Box sx={{position:'absolute',top:10,left:-1,width:3,height:'calc(100% - 20px)',borderRadius:'0 2px 2px 0',background:C.brand}}/>}
                    <Box sx={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:1,flexWrap:'wrap'}}>
                      <Box sx={{flex:1,minWidth:0}}>
                        <Box sx={{display:'flex',alignItems:'center',gap:1,flexWrap:'wrap',mb:0.5}}>
                          {a.isPinned&&<PushPinIcon sx={{fontSize:14,color:C.brand,transform:'rotate(45deg)'}}/>}
                          <Typography sx={{fontWeight:700,fontSize:'0.84rem',color:C.text,fontFamily:"'IBM Plex Sans', sans-serif"}}>{a.title}</Typography>
                          <Chip label={a.audience} size="small" sx={{height:18,fontSize:'0.58rem',fontWeight:700,bgcolor:ac.bg,color:ac.color,textTransform:'capitalize'}}/>
                        </Box>
                        <Typography sx={{fontSize:'0.75rem',color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif",lineHeight:1.6,whiteSpace:'pre-wrap'}}>{a.body}</Typography>
                        <Typography sx={{fontSize:'0.63rem',color:C.muted,mt:1,fontFamily:"'IBM Plex Sans', sans-serif"}}>
                          {new Date(a.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
                        </Typography>
                      </Box>
                      <Box sx={{display:'flex',gap:0.5,flexShrink:0}}>
                        <Tooltip title={a.isPinned?'Unpin':'Pin to top'}>
                          <IconButton size="small" onClick={()=>togglePin(a)} sx={{color:a.isPinned?C.brand:C.muted}}>
                            <PushPinIcon sx={{fontSize:15,transform:a.isPinned?'rotate(45deg)':'none'}}/>
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit"><IconButton size="small" onClick={()=>openEdit(a)} sx={{color:C.brand}}><EditIcon sx={{fontSize:15}}/></IconButton></Tooltip>
                        <Tooltip title="Delete"><IconButton size="small" onClick={()=>handleDelete(a.id)} sx={{color:C.danger}}><DeleteIcon sx={{fontSize:15}}/></IconButton></Tooltip>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>

        <Box sx={{flex:'1 1 40%',minWidth:320,borderLeft:`1px solid ${C.border}`,background:C.sidebar}}>
          {!dialog ? (
            <DetailEmpty icon={<CampaignIcon sx={{fontSize:34,color:C.border}}/>} text="Select an announcement to edit, or click + to post a new one."/>
          ) : (
            <DetailPanel
              title={editing?`Edit Announcement — ${editing.title}`:'New Announcement'}
              onClose={()=>setDialog(false)}
              createdAt={editing?.createdAt}
              fmt={fmtDate}
              onReset={()=>editing?openEdit(editing):openAdd()}
              onSave={handleSave}
              saving={saving}
              saveLabel={editing?'Update':'Post'}
            >
              <FormRow label="Title" required>
                <TextField value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} size="small" fullWidth inputProps={{maxLength:200}}/>
              </FormRow>
              <FormRow label="Body" required>
                <TextField value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))} size="small" fullWidth multiline rows={4} placeholder="Write the announcement here…"/>
              </FormRow>
              <FormRow label="Audience">
                <TextField select value={form.audience} onChange={e=>setForm(f=>({...f,audience:e.target.value}))} size="small" fullWidth>
                  <MenuItem value="all">Everyone</MenuItem>
                  <MenuItem value="teachers">Teachers only</MenuItem>
                  <MenuItem value="students">Students only</MenuItem>
                </TextField>
              </FormRow>
              <FormRow label="Pin to top">
                <Switch checked={form.isPinned} onChange={e=>setForm(f=>({...f,isPinned:e.target.checked}))} size="small" inputProps={{ id: 'pin-switch', name: 'pin-switch' }}/>
              </FormRow>
            </DetailPanel>
          )}
        </Box>
      </Box>

      <Snack_ snack={snack} onClose={()=>setSnack(s=>({...s,open:false}))}/>
    </Card_>
  );
};

/* ═══════════════════════════════════════════════════════════════
   REPORTS SECTION
═══════════════════════════════════════════════════════════════ */
const ReportsSection = () => {
  const [tab,        setTab]       = useState('attendance');
  const [classes,    setClasses]   = useState([]);
  const [terms,      setTerms]     = useState([]);
  const [selClass,   setSelClass]  = useState('');
  const [selTerm,    setSelTerm]   = useState('');
  const [startDate,  setStartDate] = useState('');
  const [endDate,    setEndDate]   = useState('');
  const [report,     setReport]    = useState(null);
  const [loading,    setLoading]   = useState(false);
  const [pdfLoading, setPdfLoading] = useState(null); // studentId being loaded
  const [snack,      setSnack]     = useState({open:false,msg:'',sev:'success'});
  const toast = toast_(setSnack);
 
  useEffect(()=>{
    (async()=>{
      const [c,t] = await Promise.all([
        fetch(`${BASE}/api/management/reports/classes`, {headers:authH()}),
        fetch(`${BASE}/api/setup/terms`,               {headers:authH()}),
      ]);
      if(c.ok) setClasses(await c.json());
      if(t.ok) setTerms(await t.json());
    })();
  },[]);
 
  const generate = async () => {
    if (!selClass) return toast('Select a class first','error');
    setLoading(true); setReport(null);
    const endpoint = tab==='attendance' ? 'attendance' : 'results';
    let url = `${BASE}/api/management/reports/${endpoint}?classId=${selClass}`;
    if (tab==='attendance') {
      if (startDate) url+=`&startDate=${startDate}`;
      if (endDate)   url+=`&endDate=${endDate}`;
    } else {
      if (selTerm) url+=`&termId=${selTerm}`;
    }
    const res = await fetch(url, {headers:authH()});
    if (res.ok) setReport(await res.json());
    else toast('Failed to generate report','error');
    setLoading(false);
  };
 
  // Open individual student PDF in new tab
  const openStudentPDF = async (studentId) => {
    setPdfLoading(studentId);
    const termParam = selTerm ? `?termId=${selTerm}` : '';
    const url = `${BASE}/api/management/reports/student/${studentId}/pdf${termParam}`;
    const res = await fetch(url, {headers:authH()});
    if (res.ok) {
      const html = await res.text();
      const blob = new Blob([html], {type:'text/html'});
      window.open(URL.createObjectURL(blob), '_blank');
    } else {
      toast('Failed to generate report card','error');
    }
    setPdfLoading(null);
  };
 
  // Open full class PDF in new tab
  const openClassPDF = async () => {
    if (!selClass) return toast('Select a class first','error');
    setPdfLoading('class');
    const termParam = selTerm ? `?termId=${selTerm}` : '';
    const url = `${BASE}/api/management/reports/class/${selClass}/pdf${termParam}`;
    const res = await fetch(url, {headers:authH()});
    if (res.ok) {
      const html = await res.text();
      const blob = new Blob([html], {type:'text/html'});
      window.open(URL.createObjectURL(blob), '_blank');
    } else {
      toast('Failed to generate class report cards','error');
    }
    setPdfLoading(null);
  };
 
  // Export to Excel
  const exportExcel = () => {
    if (!report) return;
    const wb = XLSX.utils.book_new();
    if (tab==='attendance') {
      const rows = report.students.map(s=>({
        'Student No.': s.studentNumber,
        'First Name':  s.firstName,
        'Last Name':   s.lastName,
        'Present':     s.present,
        'Absent':      s.absent,
        'Late':        s.late,
        'Excused':     s.excused,
        'Total Days':  s.total,
        'Attendance %': s.percentage!==null ? `${s.percentage}%` : '—',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = Object.keys(rows[0]||{}).map(k=>({wch:Math.max(k.length,12)}));
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
      XLSX.writeFile(wb, `attendance_${report.class?.name}_${new Date().toISOString().slice(0,10)}.xlsx`);
    } else {
      const rows = report.students.map(s=>{
        const row = {'Student No.':s.studentNumber,'Name':`${s.firstName} ${s.lastName}`};
        (report.subjects||[]).forEach(sub=>{
          const r = s.results?.[sub.id];
          row[sub.name] = r ? `${r.score}/${r.maxScore} (${r.percentage}%)` : '—';
          row[`${sub.name} - Assignments %`] = r && r.assignmentPercentage!==null ? `${r.assignmentPercentage}%` : '—';
          row[`${sub.name} - Exams %`] = r && r.examPercentage!==null ? `${r.examPercentage}%` : '—';
        });
        row['Average %'] = s.average!==null ? `${s.average}%` : '—';
        return row;
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Results');
      XLSX.writeFile(wb, `results_${report.class?.name}_${new Date().toISOString().slice(0,10)}.xlsx`);
    }
    toast('Excel file downloaded');
  };
 
  const attColor = (pct) => { if(pct===null)return C.muted; if(pct>=80)return C.accent; if(pct>=60)return C.warn; return C.danger; };
  const resColor = (pct) => { if(pct===null)return C.muted; if(pct>=75)return C.accent; if(pct>=50)return C.warn; return C.danger; };
  const getSymbol = (pct) => { if(pct===null)return'—'; if(pct>=80)return'7'; if(pct>=70)return'6'; if(pct>=60)return'5'; if(pct>=50)return'4'; if(pct>=40)return'3'; if(pct>=30)return'2'; return'1'; };
 
  return (
    <Card_ sx={{mb:0}}>
      <SectionHead title="Reports" subtitle="Generate attendance and results reports — download as PDF or Excel"/>
 
      {/* Report type tabs */}
      <Box sx={{display:'flex',gap:1.5,mb:3}}>
        {['attendance','results'].map(t=>(
          <Button key={t} onClick={()=>{setTab(t);setReport(null);}} size="small" sx={{
            textTransform:'none',fontWeight:700,fontSize:'0.72rem',
            fontFamily:"'IBM Plex Sans', sans-serif",
            background:tab===t?C.brand:'transparent',
            color:tab===t?C.white:C.muted,
            border:tab===t?`1.5px solid ${C.brand}`:`1.5px solid ${C.border}`,
            borderRadius:'6px',px:2,py:0.75,
            '&:hover':{background:tab===t?C.brand:C.sidebarAct},
          }}>
            {t==='attendance'?'Attendance Report':'Results Report'}
          </Button>
        ))}
      </Box>
 
      {/* Filters */}
      <Box sx={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:'8px',p:2,mb:3}}>
        <Box sx={{display:'flex',gap:2,flexWrap:'wrap',alignItems:'flex-end'}}>
          <TextField select label="Class *" value={selClass} onChange={e=>{setSelClass(e.target.value);setReport(null);}} size="small" sx={{minWidth:160}}>
            <MenuItem value="">— Select class —</MenuItem>
            {classes.map(c=>(
              <MenuItem key={c.id} value={c.id}>
                {c.name}{c.stream?` (${c.stream})`:''} — {c.studentCount} students
              </MenuItem>
            ))}
          </TextField>
 
          {tab==='attendance' ? (
            <>
              <TextField label="From" type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} size="small" InputLabelProps={{shrink:true}}/>
              <TextField label="To"   type="date" value={endDate}   onChange={e=>setEndDate(e.target.value)}   size="small" InputLabelProps={{shrink:true}}/>
            </>
          ) : (
            <TextField select label="Term" value={selTerm} onChange={e=>setSelTerm(e.target.value)} size="small" sx={{minWidth:140}}>
              <MenuItem value="">All Terms</MenuItem>
              {terms.map(t=><MenuItem key={t.id} value={t.id}>Term {t.termNumber || t.term_number}</MenuItem>)}
            </TextField>
          )}
 
          <Button variant="contained" onClick={generate} disabled={loading||!selClass}
            sx={{background:C.brand,textTransform:'none',fontWeight:700,boxShadow:'none',fontFamily:"'IBM Plex Sans', sans-serif"}}>
            {loading?<><CircularProgress size={14} sx={{color:'#fff',mr:1}}/>Generating…</>:'Generate Report'}
          </Button>
 
          {/* PDF buttons */}
          {selClass && (
            <Button variant="outlined" onClick={openClassPDF}
              disabled={pdfLoading==='class'}
              startIcon={pdfLoading==='class'?<CircularProgress size={14}/>:null}
              sx={{borderColor:C.brand,color:C.brand,textTransform:'none',fontWeight:700,
                fontFamily:"'IBM Plex Sans', sans-serif",'&:hover':{background:'#f8f8f8'}}}>
              {pdfLoading==='class'?'Preparing…':'Print All Report Cards'}
            </Button>
          )}
 
          {report && (
            <Button variant="outlined" onClick={exportExcel}
              sx={{borderColor:C.brand,color:C.brand,textTransform:'none',fontWeight:700,
                fontFamily:"'IBM Plex Sans', sans-serif",'&:hover':{background:'#f8f8f8'}}}>
              Export Excel
            </Button>
          )}
        </Box>
      </Box>
 
      {loading && <Box sx={{display:'flex',justifyContent:'center',py:6}}><CircularProgress sx={{color:C.brand}}/></Box>}
 
      {report && !loading && (
        <Box>
          {/* Report header */}
          <Box sx={{display:'flex',alignItems:'center',justifyContent:'space-between',mb:2,flexWrap:'wrap',gap:1}}>
            <Box>
              <Typography sx={{fontWeight:700,fontSize:'0.88rem',color:C.brand,fontFamily:"'IBM Plex Sans', sans-serif"}}>
                {tab==='attendance'?'Attendance Report':'Results Report'} — {report.class?.name}
                {report.class?.stream?` (${report.class.stream})`:''}
              </Typography>
              <Typography sx={{fontSize:'0.69rem',color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif"}}>
                {report.students?.length} students
              </Typography>
            </Box>
          </Box>
 
          {/* ── ATTENDANCE TABLE ── */}
          {tab==='attendance' && (
            <TableContainer component={Paper} elevation={0} sx={{border:`1px solid ${C.border}`,borderRadius:'4px'}}>
              <Table size="small" sx={{borderCollapse:'collapse'}}>
                <TableHead><TableRow>
                  {['#','Student No.','Name','Present','Absent','Late','Excused','Total','Attendance %','PDF'].map((h,i,arr)=>(
                    <TableCell key={h} sx={{...hc,...(i===arr.length-1?{borderRight:'none'}:{})}}>{h}</TableCell>
                  ))}
                </TableRow></TableHead>
                <TableBody>
                  {report.students.length===0?(
                    <TableRow><TableCell colSpan={10} sx={{...bc,borderRight:'none',textAlign:'center',py:4,color:C.muted}}>No attendance data found.</TableCell></TableRow>
                  ):(
                    report.students.map((s,idx)=>(
                      <TableRow key={s.id} sx={{backgroundColor:idx%2===0?C.white:'#fbfbfb'}}>
                        <TableCell sx={{...bc,color:C.muted,textAlign:'center',width:40}}>{idx+1}</TableCell>
                        <TableCell sx={{...bc,fontFamily:'monospace',fontSize:'0.7rem',color:C.brand,fontWeight:700}}>{s.studentNumber}</TableCell>
                        <TableCell sx={{...bc,fontWeight:600}}>{s.firstName} {s.lastName}</TableCell>
                        <TableCell sx={{...bc,color:C.accent,fontWeight:700,textAlign:'center'}}>{s.present}</TableCell>
                        <TableCell sx={{...bc,color:C.danger,fontWeight:700,textAlign:'center'}}>{s.absent}</TableCell>
                        <TableCell sx={{...bc,color:C.warn,fontWeight:700,textAlign:'center'}}>{s.late}</TableCell>
                        <TableCell sx={{...bc,color:C.muted,textAlign:'center'}}>{s.excused}</TableCell>
                        <TableCell sx={{...bc,textAlign:'center'}}>{s.total}</TableCell>
                        <TableCell sx={{...bc}}>
                          {s.percentage!==null?(
                            <Box sx={{display:'flex',alignItems:'center',gap:1}}>
                              <Box sx={{flex:1,height:6,borderRadius:3,background:'#e7e7e7',overflow:'hidden'}}>
                                <Box sx={{height:'100%',width:`${s.percentage}%`,background:attColor(s.percentage),borderRadius:3}}/>
                              </Box>
                              <Typography sx={{fontSize:'0.7rem',fontWeight:700,color:attColor(s.percentage),minWidth:36,fontFamily:"'IBM Plex Sans', sans-serif"}}>{s.percentage}%</Typography>
                            </Box>
                          ):'—'}
                        </TableCell>
                        <TableCell sx={{...bc,borderRight:'none'}}>
                          <Tooltip title="Open report card">
                            <IconButton size="small"
                              onClick={()=>openStudentPDF(s.id)}
                              disabled={pdfLoading===s.id}
                              sx={{color:'#575757'}}>
                              {pdfLoading===s.id?<CircularProgress size={14}/>:<FileDownloadIcon sx={{fontSize:16}}/>}
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
 
          {/* ── RESULTS TABLE ── */}
          {tab==='results' && (
            <Box sx={{overflowX:'auto'}}>
              <Table sx={{borderCollapse:'collapse',minWidth:600}}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{...hc,width:40}}>#</TableCell>
                    <TableCell sx={hc}>Name</TableCell>
                    {(report.subjects||[]).map(sub=>(
                      <TableCell key={sub.id} sx={{...hc,textAlign:'center',minWidth:110}}>{sub.name}</TableCell>
                    ))}
                    <TableCell sx={{...hc,textAlign:'center'}}>Average</TableCell>
                    <TableCell sx={{...hc,borderRight:'none',position:'sticky',right:0,background:C.headerBg,zIndex:2}}>PDF</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.students.length===0?(
                    <TableRow><TableCell colSpan={(report.subjects?.length||0)+4} sx={{...bc,borderRight:'none',textAlign:'center',py:4,color:C.muted}}>No results found.</TableCell></TableRow>
                  ):(
                    report.students.map((s,idx)=>(
                      <TableRow key={s.id} sx={{backgroundColor:idx%2===0?C.white:'#fbfbfb'}}>
                        <TableCell sx={{...bc,color:C.muted,textAlign:'center'}}>{idx+1}</TableCell>
                        <TableCell sx={{...bc,fontWeight:600}}>{s.firstName} {s.lastName}</TableCell>
                        {(report.subjects||[]).map(sub=>{
                          const r=s.results?.[sub.id];
                          const breakdown = r ? [
                            r.assignmentPercentage!==null ? `Assignments: ${r.assignmentPercentage}%${r.weights?` (weight ${r.weights.assignmentWeight}%)`:''}` : null,
                            r.examPercentage!==null ? `Exams: ${r.examPercentage}%${r.weights?` (weight ${r.weights.examWeight}%)`:''}` : null,
                          ].filter(Boolean).join(' · ') : '';
                          return(
                            <TableCell key={sub.id} sx={{...bc,textAlign:'center'}}>
                              {r?(
                                <Tooltip title={breakdown || 'No breakdown available'} arrow>
                                  <Box>
                                    <Typography sx={{fontSize:'0.72rem',fontWeight:700,color:resColor(r.percentage),fontFamily:"'IBM Plex Sans', sans-serif"}}>{r.score}/{r.maxScore}</Typography>
                                    <Typography sx={{fontSize:'0.62rem',color:resColor(r.percentage),fontFamily:"'IBM Plex Sans', sans-serif"}}>{r.percentage}% (Sym {getSymbol(r.percentage)})</Typography>
                                  </Box>
                                </Tooltip>
                              ):<Typography sx={{color:C.muted,fontSize:'0.7rem'}}>—</Typography>}
                            </TableCell>
                          );
                        })}
                        <TableCell sx={{...bc,textAlign:'center'}}>
                          {s.average!==null?(
                            <Typography sx={{fontWeight:800,fontSize:'0.79rem',color:resColor(s.average),fontFamily:"'IBM Plex Sans', sans-serif"}}>{s.average}%</Typography>
                          ):'—'}
                        </TableCell>
                        <TableCell sx={{...bc,borderRight:'none',position:'sticky',right:0,background:'inherit',zIndex:1}}>
                          <Tooltip title="Open report card">
                            <IconButton size="small"
                              onClick={()=>openStudentPDF(s.id)}
                              disabled={pdfLoading===s.id}
                              sx={{color:'#575757'}}>
                              {pdfLoading===s.id?<CircularProgress size={14}/>:<FileDownloadIcon sx={{fontSize:16}}/>}
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Box>
          )}
        </Box>
      )}
 
      <Snack_ snack={snack} onClose={()=>setSnack(s=>({...s,open:false}))}/>
    </Card_>
  );
};

/* ═══════════════════════════════════════════════════════════════
   SUPPORT (IT help desk — tickets to the platform's system admin)
═══════════════════════════════════════════════════════════════ */
const STATUS_COLORS = {
  open:        { color: C.link,   bg: '#E3EEFB' },
  in_progress: { color: C.warn,   bg: C.warnBg },
  resolved:    { color: C.accent, bg: '#E8F5E9' },
  closed:      { color: C.muted,  bg: '#F3F4F6' },
};
const PRIORITY_COLORS = {
  low:    { color: C.muted,  bg: '#F3F4F6' },
  normal: { color: C.link,   bg: '#E3EEFB' },
  high:   { color: C.warn,   bg: C.warnBg },
  urgent: { color: C.danger, bg: C.dangerBg },
};

const SupportSection = () => {
  const [tickets, setTickets]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [newOpen, setNewOpen]   = useState(false);
  const [newForm, setNewForm]   = useState({ subject: '', description: '', priority: 'normal' });
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [snack, setSnack]       = useState({ open: false, msg: '', sev: 'success' });
  const toast = toast_(setSnack);

  const fmt = d => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${BASE}/api/management/support-tickets`, { headers: authH() })
      .then(r => r.json()).then(d => setTickets(Array.isArray(d) ? d : [])).catch(() => setTickets([])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const openTicket = async (id) => {
    setDetailLoading(true); setSelected({ id });
    try {
      const res = await fetch(`${BASE}/api/management/support-tickets/${id}`, { headers: authH() });
      const d = await res.json();
      if (res.ok) setSelected(d); else { toast(d.message || 'Failed to load ticket', 'error'); setSelected(null); }
    } catch { toast('Network error', 'error'); setSelected(null); }
    setDetailLoading(false);
  };

  const submitNewTicket = async () => {
    if (!newForm.subject.trim() || !newForm.description.trim()) { toast('Subject and description are required', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/management/support-tickets`, { method: 'POST', headers: jsonH(), body: JSON.stringify(newForm) });
      const d = await res.json();
      if (res.ok) { toast('Ticket submitted'); setNewOpen(false); setNewForm({ subject: '', description: '', priority: 'normal' }); load(); }
      else toast(d.message || 'Failed to submit ticket', 'error');
    } catch { toast('Network error', 'error'); }
    setSaving(false);
  };

  const sendReply = async () => {
    if (!reply.trim() || !selected) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/management/support-tickets/${selected.id}/reply`, { method: 'POST', headers: jsonH(), body: JSON.stringify({ message: reply.trim() }) });
      if (res.ok) { setReply(''); openTicket(selected.id); load(); }
      else { const d = await res.json(); toast(d.message || 'Failed to send reply', 'error'); }
    } catch { toast('Network error', 'error'); }
    setSaving(false);
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: C.brand }} /></Box>;

  return (
    <Card_ sx={{ p: 2.5 }}>
      <SectionHead title="Support" subtitle="Get help from your platform's IT support team"
        action={<Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setNewOpen(true)}
          sx={{ background: C.brand, textTransform: 'none', fontWeight: 700, boxShadow: 'none', fontFamily: "'IBM Plex Sans', sans-serif" }}>
          New Ticket
        </Button>}
      />
      {tickets.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <Typography sx={{ color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif" }}>No support tickets yet. Raise one if you run into an issue.</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: '4px' }}>
          <Table size="small">
            <TableHead><TableRow>
              {['Subject', 'Priority', 'Status', 'Replies', 'Updated'].map(h => <TableCell key={h} sx={hc}>{h}</TableCell>)}
            </TableRow></TableHead>
            <TableBody>
              {tickets.map(t => (
                <TableRow key={t.id} hover onClick={() => openTicket(t.id)} sx={{ cursor: 'pointer' }}>
                  <TableCell sx={bc}>{t.subject}</TableCell>
                  <TableCell sx={bc}><Chip label={t.priority} size="small" sx={{ fontWeight: 700, fontSize: '0.62rem', textTransform: 'capitalize', ...PRIORITY_COLORS[t.priority] }} /></TableCell>
                  <TableCell sx={bc}><Chip label={t.status.replace('_', ' ')} size="small" sx={{ fontWeight: 700, fontSize: '0.62rem', textTransform: 'capitalize', ...STATUS_COLORS[t.status] }} /></TableCell>
                  <TableCell sx={bc}>{t.replyCount}</TableCell>
                  <TableCell sx={{ ...bc, borderRight: 'none' }}>{fmt(t.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* New ticket dialog */}
      <Dialog open={newOpen} onClose={() => setNewOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '10px' } }}>
        <DialogTitle sx={{ fontWeight: 700, color: C.brand, fontFamily: "'IBM Plex Sans', sans-serif" }}>New Support Ticket</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Subject" value={newForm.subject} onChange={e => setNewForm(f => ({ ...f, subject: e.target.value }))} size="small" fullWidth />
          <TextField label="Priority" select value={newForm.priority} onChange={e => setNewForm(f => ({ ...f, priority: e.target.value }))} size="small" fullWidth>
            {['low', 'normal', 'high', 'urgent'].map(p => <MenuItem key={p} value={p} sx={{ textTransform: 'capitalize' }}>{p}</MenuItem>)}
          </TextField>
          <TextField label="Describe the issue" value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} size="small" fullWidth multiline minRows={4} />
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setNewOpen(false)} sx={{ textTransform: 'none', color: C.muted }}>Cancel</Button>
          <Button variant="contained" disabled={saving} onClick={submitNewTicket} sx={{ background: C.brand, textTransform: 'none', fontWeight: 700, boxShadow: 'none', fontFamily: "'IBM Plex Sans', sans-serif" }}>
            {saving ? 'Submitting…' : 'Submit Ticket'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Ticket detail dialog */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '10px' } }}>
        {(detailLoading || !selected?.description) ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: C.brand }} /></Box>
        ) : (
          <>
            <DialogTitle sx={{ fontWeight: 700, color: C.brand, fontFamily: "'IBM Plex Sans', sans-serif" }}>
              {selected.subject}
              <Box sx={{ mt: 0.5 }}>
                <Chip label={selected.status.replace('_', ' ')} size="small" sx={{ fontWeight: 700, fontSize: '0.62rem', textTransform: 'capitalize', mr: 1, ...STATUS_COLORS[selected.status] }} />
                <Chip label={selected.priority} size="small" sx={{ fontWeight: 700, fontSize: '0.62rem', textTransform: 'capitalize', ...PRIORITY_COLORS[selected.priority] }} />
              </Box>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2.5 }}>
              <Box sx={{ p: 1.5, background: C.bg, borderRadius: '6px', border: `1px solid ${C.border}` }}>
                <Typography sx={{ fontSize: '0.8rem', color: C.text, whiteSpace: 'pre-wrap', fontFamily: "'IBM Plex Sans', sans-serif" }}>{selected.description}</Typography>
              </Box>
              <Box sx={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {selected.replies?.map(r => (
                  <Box key={r.id} sx={{
                    alignSelf: r.authorRole === 'school_admin' ? 'flex-end' : 'flex-start', maxWidth: '85%',
                    background: r.authorRole === 'school_admin' ? C.brand : '#F3F4F6', color: r.authorRole === 'school_admin' ? '#fff' : C.text,
                    borderRadius: '8px', px: 1.5, py: 1,
                  }}>
                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, opacity: 0.75, mb: 0.3, fontFamily: "'IBM Plex Sans', sans-serif" }}>{r.author} · {fmt(r.createdAt)}</Typography>
                    <Typography sx={{ fontSize: '0.78rem', whiteSpace: 'pre-wrap', fontFamily: "'IBM Plex Sans', sans-serif" }}>{r.message}</Typography>
                  </Box>
                ))}
                {(!selected.replies || selected.replies.length === 0) && (
                  <Typography sx={{ fontSize: '0.72rem', color: C.muted, textAlign: 'center', py: 1, fontFamily: "'IBM Plex Sans', sans-serif" }}>No replies yet.</Typography>
                )}
              </Box>
              <TextField multiline minRows={2} placeholder="Reply…" value={reply} onChange={e => setReply(e.target.value)} size="small" fullWidth />
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
              <Button onClick={() => setSelected(null)} sx={{ textTransform: 'none', color: C.muted }}>Close</Button>
              <Button variant="contained" disabled={saving || !reply.trim()} onClick={sendReply} sx={{ background: C.brand, textTransform: 'none', fontWeight: 700, boxShadow: 'none', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                {saving ? 'Sending…' : 'Send Reply'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snack_ snack={snack} onClose={() => setSnack(s => ({ ...s, open: false }))} />
    </Card_>
  );
};

/* ═══════════════════════════════════════════════════════════════
   NAV + ROOT
═══════════════════════════════════════════════════════════════ */
const NAV = [
  {key:'overview', label:'Dashboard',   icon:<DashboardIcon sx={{fontSize:19}}/>},
  {key:'students', label:'Students',    icon:<PeopleAltIcon sx={{fontSize:19}}/>},
  {key:'teachers', label:'Teachers',    icon:<SchoolIcon sx={{fontSize:19}}/>},
  {key:'timetable',label:'Timetable',   icon:<CalendarMonthIcon sx={{fontSize:19}}/>},
  {key:'setup',    label:'School Setup',icon:<SettingsIcon sx={{fontSize:19}}/>},
  {key:'events',   label:'Events',        icon:<EventIcon sx={{fontSize:19}}/> },
  {key:'announcements', label:'Announcements', icon:<CampaignIcon sx={{fontSize:19}}/> },
  {key:'reports',  label:'Reports',       icon:<AssessmentIcon sx={{fontSize:19}}/> },
  {key:'support',  label:'Support',       icon:<SupportAgentIcon sx={{fontSize:19}}/> },
];

// Top dark menu bar groups → jump to a representative section
const MENU = [
  { label:'HOME',      target:'overview' },
  { label:'PEOPLE',    target:'students' },
  { label:'ACADEMICS', target:'timetable' },
  { label:'COMMS',     target:'announcements' },
];

const ManagementDashboard = () => {
  const navigate    = useNavigate();
  const [active,    setActive]    = useState('overview');
  const school    = sessionStorage.getItem('adminSchool') || 'School';
  const adminName = sessionStorage.getItem('adminName')   || 'Admin';

  const adminToken = sessionStorage.getItem('adminToken') || '';
  const schoolId = (() => {
    try {
      const payload = adminToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(payload)).schoolId || '';
    } catch { return ''; }
  })();

  const handleLogout = () => {
    ['adminToken','adminSchool','adminName'].forEach(k=>sessionStorage.removeItem(k));
    navigate('/login');
  };

  const activeLabel = NAV.find(n=>n.key===active)?.label || 'Dashboard';

  return (
    <Box sx={{display:'flex',flexDirection:'column',height:'100vh',background:C.bg,fontFamily:"'IBM Plex Sans', sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      {/* ── Dark top menu bar ── */}
      <Box sx={{height:40,background:C.menubar,display:'flex',alignItems:'center',px:2,flexShrink:0}}>
        <Box sx={{display:'flex',alignItems:'center',gap:1,mr:3}}>
          <Box sx={{width:22,height:22,borderRadius:'4px',background:C.brand,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <SchoolIcon sx={{color:C.white,fontSize:14}}/>
          </Box>
          <Typography sx={{color:C.white,fontWeight:700,fontSize:'0.7rem',letterSpacing:'0.02em',fontFamily:"'IBM Plex Sans', sans-serif",whiteSpace:'nowrap'}}>
            {school}
          </Typography>
        </Box>

        <Box sx={{display:'flex',height:'100%'}}>
          {MENU.map(m=>(
            <Box key={m.label} onClick={()=>setActive(m.target)}
              sx={{display:'flex',alignItems:'center',px:1.75,cursor:'pointer',color:C.menubarTxt,fontSize:'0.63rem',fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase',fontFamily:"'IBM Plex Sans', sans-serif",'&:hover':{background:C.menubarHi}}}>
              {m.label}
            </Box>
          ))}
        </Box>

        <Box sx={{flex:1}}/>

        <Box onClick={()=>navigate('/admin')} sx={{display:'flex',alignItems:'center',gap:0.75,px:1.5,height:'100%',cursor:'pointer',color:C.menubarTxt,'&:hover':{background:C.menubarHi}}}>
          <SwapHorizIcon sx={{fontSize:16}}/>
          <Typography sx={{fontSize:'0.63rem',fontWeight:600,fontFamily:"'IBM Plex Sans', sans-serif",whiteSpace:'nowrap'}}>Applications Portal</Typography>
        </Box>
        <Divider orientation="vertical" flexItem sx={{borderColor:'rgba(255,255,255,0.15)',my:1}}/>
        <Box sx={{display:'flex',alignItems:'center',gap:1,px:1.5}}>
          <Avatar sx={{width:24,height:24,background:C.brand,fontSize:'0.63rem',fontWeight:700}}>{adminName.charAt(0).toUpperCase()}</Avatar>
          <Typography sx={{color:C.white,fontSize:'0.65rem',fontWeight:600,fontFamily:"'IBM Plex Sans', sans-serif",whiteSpace:'nowrap'}}>{adminName}</Typography>
        </Box>
        <Box onClick={handleLogout} sx={{display:'flex',alignItems:'center',gap:0.75,px:1.5,height:'100%',cursor:'pointer',color:C.menubarTxt,'&:hover':{background:C.danger,color:C.white}}}>
          <LogoutIcon sx={{fontSize:16}}/>
          <Typography sx={{fontSize:'0.63rem',fontWeight:600,fontFamily:"'IBM Plex Sans', sans-serif"}}>Logout</Typography>
        </Box>
      </Box>

      {/* ── Tab strip ── */}
      <Box sx={{display:'flex',background:C.tabBar,borderBottom:`1px solid ${C.border}`,px:1,pt:0.75,gap:0.25,overflowX:'auto',flexShrink:0}}>
        {NAV.map(item=>{
          const on=active===item.key;
          return (
            <Box key={item.key} onClick={()=>setActive(item.key)}
              sx={{display:'flex',alignItems:'center',gap:0.75,px:1.75,py:0.9,cursor:'pointer',whiteSpace:'nowrap',
                background:on?C.white:C.tabIdle,
                color:on?C.brand:C.muted,
                border:`1px solid ${C.border}`,
                borderBottom:on?`1px solid ${C.white}`:`1px solid ${C.border}`,
                borderTop:on?`2px solid ${C.link}`:`1px solid ${C.border}`,
                borderRadius:'5px 5px 0 0',
                mb:'-1px',
                transition:'all 0.12s',
                '&:hover':{background:on?C.white:C.sidebarAct,color:C.brand}}}>
              <Box sx={{display:'flex',color:'inherit'}}>{item.icon}</Box>
              <Typography sx={{fontSize:'0.69rem',fontWeight:on?700:500,color:'inherit',fontFamily:"'IBM Plex Sans', sans-serif"}}>{item.label}</Typography>
            </Box>
          );
        })}
      </Box>

      {/* ── Breadcrumb / sub-bar ── */}
      <Box sx={{display:'flex',alignItems:'center',gap:1.5,background:C.white,borderBottom:`1px solid ${C.border}`,px:2.5,py:1,flexShrink:0}}>
        <SchoolLogoHeader schoolId={schoolId} token={adminToken} schoolName={school} logoHeight={26}/>
        <Box sx={{flex:1}}/>
        <Typography sx={{fontSize:'0.7rem',color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif"}}>
          <Box component="span" sx={{color:C.link,fontWeight:600,cursor:'pointer'}} onClick={()=>setActive('overview')}>{school}</Box>
          {'  ›  '}
          <Box component="span" sx={{color:C.text,fontWeight:700}}>{activeLabel}</Box>
        </Typography>
      </Box>

      {/* ── Content ── */}
      <Box sx={{flex:1,minHeight:0,overflowY:'auto',p:2.5}}>
        {active==='overview'       && <OverviewSection/>}
        {active==='students'       && <StudentsSection/>}
        {active==='teachers'       && <TeachersSection/>}
        {active==='timetable'      && <TimetableSection/>}
        {active==='events'         && <EventsSection/>}
        {active==='announcements'  && <AnnouncementsSection/>}
        {active==='reports'        && <ReportsSection/>}
        {active==='setup'          && <SetupSection/>}
        {active==='support'        && <SupportSection/>}
      </Box>

      {/* ── Bottom icon dock ── */}
      <Box sx={{display:'flex',alignItems:'stretch',justifyContent:'center',gap:0.5,background:C.dock,borderTop:`1px solid ${C.border}`,px:2,py:0.75,flexShrink:0,overflowX:'auto'}}>
        {NAV.map(item=>{
          const on=active===item.key;
          return (
            <Tooltip key={item.key} title={item.label}>
              <Box onClick={()=>setActive(item.key)}
                sx={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:0.25,minWidth:74,px:1,py:0.75,cursor:'pointer',borderRadius:'6px',
                  background:on?C.sidebarAct:'transparent',
                  color:on?C.brand:C.muted,
                  '&:hover':{background:C.sidebarAct,color:C.brand},transition:'all 0.12s'}}>
                <Box sx={{display:'flex',color:'inherit'}}>{item.icon}</Box>
                <Typography sx={{fontSize:'0.58rem',fontWeight:on?700:500,color:'inherit',fontFamily:"'IBM Plex Sans', sans-serif",textAlign:'center',lineHeight:1.1}}>{item.label}</Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
};

export default ManagementDashboard;