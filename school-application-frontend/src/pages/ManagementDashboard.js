import React, { useState, useEffect, useCallback } from 'react';
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
import ChevronLeftIcon    from '@mui/icons-material/ChevronLeft';
import MenuIcon           from '@mui/icons-material/Menu';
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

/* ═══════════════════════════════════════════════════════════════
   TOKENS
═══════════════════════════════════════════════════════════════ */
const C = {
  brand:    '#1A3557', brandDark: '#122740',
  accent:   '#2E7D32',
  sidebar:  '#F7F9FC', sidebarAct: '#E8EFF8',
  border:   '#E2E8F0',
  text:     '#1A2332', muted: '#6B7C93',
  white:    '#FFFFFF', bg: '#F0F4F8',
  danger:   '#C62828', dangerBg: '#FFEBEE',
  warn:     '#D97706', warnBg: '#FFFBEB',
  headerBg: '#F0F4F8',
};

const BASE  = 'https://school-management-production-6167.up.railway.app';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('adminToken')}` });
const jsonH = () => ({ 'Content-Type': 'application/json', ...authH() });

const hc = {
  background: '#F0F4F8', color: C.brand, fontWeight: 700,
  fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase',
  borderBottom: `2px solid ${C.brand}`, borderRight: `1px solid ${C.border}`,
  padding: '9px 14px', whiteSpace: 'nowrap', fontFamily: "'IBM Plex Sans', sans-serif",
};
const bc = {
  fontSize: '0.85rem', color: C.text,
  borderBottom: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`,
  padding: '8px 14px', fontFamily: "'IBM Plex Sans', sans-serif",
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
  <Box sx={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '10px', p: 2.5, ...sx }}>
    {children}
  </Box>
);

const SectionHead = ({ title, subtitle, action }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
    <Box>
      <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: C.brand, fontFamily: "'IBM Plex Sans', sans-serif" }}>{title}</Typography>
      {subtitle && <Typography sx={{ fontSize: '0.8rem', color: C.muted, mt: 0.25, fontFamily: "'IBM Plex Sans', sans-serif" }}>{subtitle}</Typography>}
    </Box>
    {action}
  </Box>
);

const InfoBanner = ({ children, color = C.warn, bg = C.warnBg, border = '#FDE68A' }) => (
  <Box sx={{ background: bg, border: `1px solid ${border}`, borderRadius: '6px', p: 1.5, mb: 2, display: 'flex', gap: 1.5 }}>
    <InfoOutlinedIcon sx={{ color, fontSize: 18, mt: 0.1, flexShrink: 0 }} />
    <Typography sx={{ fontSize: '0.8rem', color: '#92400E', fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1.5 }}>{children}</Typography>
  </Box>
);

const Snack_ = ({ snack, onClose }) => (
  <Snackbar open={snack.open} autoHideDuration={4000} onClose={onClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
    <Alert severity={snack.sev} onClose={onClose} sx={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}>{snack.msg}</Alert>
  </Snackbar>
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
    <Box sx={{ flex:'1 1 180px', background:C.white, border:`1px solid ${border}`, borderRadius:'10px', p:2, boxShadow:'0 1px 4px rgba(15,31,61,0.05)' }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <Box>
          <Typography sx={{ fontSize:'0.68rem', fontWeight:600, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:"'IBM Plex Sans', sans-serif" }}>{label}</Typography>
          <Typography sx={{ fontSize:'1.9rem', fontWeight:800, color:C.text, lineHeight:1.2, mt:0.5, fontFamily:"'IBM Plex Sans', sans-serif" }}>{value ?? 0}</Typography>
          {sub && <Typography sx={{ fontSize:'0.68rem', color:C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>{sub}</Typography>}
        </Box>
        <Box sx={{ width:40, height:40, borderRadius:'10px', background:bg, display:'flex', alignItems:'center', justifyContent:'center', color }}>{icon}</Box>
      </Box>
    </Box>
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
      <Box sx={{display:'flex',gap:2,flexWrap:'wrap',mb:3}}>
        <StatCard label="Enrolled Students"  value={stats?.totalEnrolled}                     icon={<PeopleAltIcon sx={{fontSize:20}}/>}      bg="#EEF2FF" color="#4F46E5" border="#C7D2FE"/>
        <StatCard label="Teachers"           value={teachers.filter(t=>t.isActive).length}    icon={<SchoolIcon sx={{fontSize:20}}/>}         bg="#FFF7ED" color="#EA580C" border="#FED7AA"/>
        <StatCard label="Parents"            value={stats?.totalParents}                       icon={<FamilyRestroomIcon sx={{fontSize:20}}/>} bg="#F0FDF4" color="#16A34A" border="#BBF7D0"/>
        <StatCard label="Pending Enrollment" value={stats?.pendingEnrollment} sub="Awaiting physical arrival" icon={<HourglassTopIcon sx={{fontSize:20}}/>} bg="#FFF1F2" color="#E11D48" border="#FECDD3"/>
      </Box>

      <Box sx={{display:'flex',gap:2.5,mb:3,flexWrap:'wrap'}}>
        <Card_ sx={{flex:'1 1 380px'}}>
          <SectionHead title="Attendance This Week" subtitle="Daily present vs absent"/>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={attData} barSize={16} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
              <XAxis dataKey="day" tick={{fontSize:11,fontFamily:"'IBM Plex Sans', sans-serif",fill:C.muted}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11,fontFamily:"'IBM Plex Sans', sans-serif",fill:C.muted}} axisLine={false} tickLine={false}/>
              <ReTip contentStyle={{fontFamily:"'IBM Plex Sans', sans-serif",fontSize:11,borderRadius:6,border:`1px solid ${C.border}`}}/>
              <Legend wrapperStyle={{fontSize:11,fontFamily:"'IBM Plex Sans', sans-serif"}}/>
              <Bar dataKey="present" fill="#6C8EBF" radius={[4,4,0,0]} name="Present"/>
              <Bar dataKey="absent"  fill="#FCA5A5" radius={[4,4,0,0]} name="Absent"/>
            </BarChart>
          </ResponsiveContainer>
        </Card_>

        <Card_ sx={{width:260,flexShrink:0}}>
          <Box sx={{display:'flex',justifyContent:'space-between',alignItems:'center',mb:1.5}}>
            <Typography sx={{fontWeight:700,fontSize:'0.85rem',color:C.text,fontFamily:"'IBM Plex Sans', sans-serif"}}>
              {calDate.toLocaleDateString('en-US',{month:'long',year:'numeric'})}
            </Typography>
            <Box sx={{display:'flex',gap:0.25}}>
              {['‹','›'].map((ch,i)=>(
                <Box key={i} onClick={()=>setCalDate(new Date(yr,mo+(i===0?-1:1),1))}
                  sx={{width:22,height:22,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',borderRadius:'4px',fontSize:'0.85rem',color:C.muted,'&:hover':{background:C.sidebarAct}}}>
                  {ch}
                </Box>
              ))}
            </Box>
          </Box>
          <Box sx={{display:'grid',gridTemplateColumns:'repeat(7, 1fr)',mb:0.5}}>
            {['M','T','W','T','F','S','S'].map((d,i)=>(
              <Box key={i} sx={{textAlign:'center',fontSize:'0.65rem',fontWeight:600,color:C.muted,py:'2px',fontFamily:"'IBM Plex Sans', sans-serif"}}>{d}</Box>
            ))}
          </Box>
          <Box sx={{display:'grid',gridTemplateColumns:'repeat(7, 1fr)',gap:'1px'}}>
            {cells.map((d,i)=>{
              const isToday=d&&today.getDate()===d&&today.getMonth()===mo&&today.getFullYear()===yr;
              return <Box key={i} sx={{textAlign:'center',py:'4px',borderRadius:'50%',fontSize:'0.75rem',fontFamily:"'IBM Plex Sans', sans-serif",fontWeight:isToday?800:400,background:isToday?C.brand:'transparent',color:isToday?C.white:d?C.text:'transparent','&:hover':d&&!isToday?{background:C.sidebarAct}:{}}}>{d||''}</Box>;
            })}
          </Box>
        </Card_>
      </Box>
      {/* ── Announcements + Events row ── */}
      <Box sx={{ display: 'flex', gap: 2.5, mt: 3, flexWrap: 'wrap' }}>

        {/* Announcements */}
        <Card_ sx={{ flex: '1 1 340px' }}>
          <SectionHead title="📢 Announcements" subtitle="Recent notices — all audiences shown"/>
          {announcements.length === 0 ? (
            <Typography sx={{ color: C.muted, fontSize: '0.875rem', fontFamily: "'IBM Plex Sans', sans-serif" }}>
              No announcements yet.
            </Typography>
          ) : (
            announcements.slice(0, 5).map(a => {
              const AUDIENCE_COLOR = {
                all:      { bg: '#EEF2FF', color: '#3730A3' },
                teachers: { bg: '#FFF7ED', color: '#C2410C' },
                students: { bg: '#F0FDF4', color: '#166534' },
              };
              const ac = AUDIENCE_COLOR[a.audience] || AUDIENCE_COLOR.all;
              return (
                <Box key={a.id} sx={{
                  py: 1.25, borderBottom: `1px solid ${C.border}`,
                  borderLeft: a.isPinned ? `3px solid ${C.brand}` : '3px solid transparent',
                  pl: 1,
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.25 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: C.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                      {a.isPinned ? '📌 ' : ''}{a.title}
                    </Typography>
                    <Chip label={a.audience} size="small"
                      sx={{ height: 17, fontSize: '0.62rem', fontWeight: 700, bgcolor: ac.bg, color: ac.color, textTransform: 'capitalize' }} />
                  </Box>
                  <Typography sx={{ fontSize: '0.8rem', color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                    {a.body?.length > 100 ? a.body.slice(0, 100) + '…' : a.body}
                  </Typography>
                </Box>
              );
            })
          )}
        </Card_>

        {/* Upcoming Events */}
        <Card_ sx={{ flex: '1 1 340px' }}>
          <SectionHead title="📅 Upcoming Events" subtitle="This month's school calendar"/>
          {events.length === 0 ? (
            <Typography sx={{ color: C.muted, fontSize: '0.875rem', fontFamily: "'IBM Plex Sans', sans-serif" }}>
              No events this month.
            </Typography>
          ) : (
            events
              
              .slice(0, 5)
              .map(ev => {
                const EVENT_COLOR = {
                  general: '#4F46E5', exam: '#BE123C', holiday: '#166534',
                  meeting: '#C2410C', sport: '#0369A1', other: '#374151',
                };
                return (
                  <Box key={ev.id} sx={{ display: 'flex', gap: 1.5, py: 1.25, borderBottom: `1px solid ${C.border}`, alignItems: 'flex-start' }}>
                    <Box sx={{ width: 4, alignSelf: 'stretch', borderRadius: '4px', flexShrink: 0,
                      background: EVENT_COLOR[ev.type] || EVENT_COLOR.other }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: C.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                        {ev.title}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: C.muted, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                        📆 {new Date((ev.eventDate||'').slice(0,10) + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                        {ev.eventTime ? ` · 🕐 ${ev.eventTime.slice(0,5)}` : ''}
                        {ev.location  ? ` · 📍 ${ev.location}` : ''}
                      </Typography>
                    </Box>
                  </Box>
                );
              })
          )}
        </Card_>

      </Box>

      <Card_>
        <SectionHead title="Recently Enrolled" subtitle="Students enrolled in the last 7 days"/>
        {recent.length===0 ? (
          <Typography sx={{color:C.muted,fontSize:'0.875rem',textAlign:'center',py:3,fontFamily:"'IBM Plex Sans', sans-serif"}}>No students enrolled in the last 7 days.</Typography>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{border:`1px solid ${C.border}`,borderRadius:'6px'}}>
            <Table size="small" sx={{borderCollapse:'collapse'}}>
              <TableHead><TableRow>
                {['Student No.','Name','Grade','Stream','Enrolled'].map(h=>(
                  <TableCell key={h} sx={{...hc,...(h==='Enrolled'?{borderRight:'none'}:{})}}>{h}</TableCell>
                ))}
              </TableRow></TableHead>
              <TableBody>
                {recent.map((s,idx)=>(
                  <TableRow key={s.id} sx={{backgroundColor:idx%2===0?C.white:'#FAFBFC','&:hover':{backgroundColor:'#F7FAFC'}}}>
                    <TableCell sx={{...bc,fontFamily:'monospace',fontSize:'0.8rem',color:C.brand,fontWeight:700}}>{s.studentNumber}</TableCell>
                    <TableCell sx={{...bc,fontWeight:600}}>{s.firstName} {s.lastName}</TableCell>
                    <TableCell sx={bc}>{s.grade}</TableCell>
                    <TableCell sx={bc}>{s.stream?<Chip label={s.stream} size="small" sx={{fontSize:'0.7rem',fontWeight:700,bgcolor:'#EEF2FF',color:'#3730A3'}}/>:'—'}</TableCell>
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
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });
  const toast = toast_(setSnack);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${BASE}/api/management/enrolled-students`, {headers:authH()});
    if (res.ok) setEnrolled(await res.json());
    setLoading(false);
  }, []);
  useEffect(()=>{fetchAll();},[fetchAll]);

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
    <Card_>
      <SectionHead title="Enrolled Students" subtitle={`${enrolled.length} student${enrolled.length!==1?'s':''} currently enrolled`}/>
      <Box sx={{display:'flex',gap:2,mb:3,flexWrap:'wrap'}}>
        <TextField placeholder="Search name, student no. or ID…" value={search} onChange={e=>setSearch(e.target.value)} size="small" sx={{width:280,'& .MuiOutlinedInput-root':{borderRadius:'6px',fontSize:'0.85rem',fontFamily:"'IBM Plex Sans', sans-serif"}}}/>
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
          }} sx={{background:'#6A1B9A',textTransform:'none',fontWeight:700,boxShadow:'none',fontFamily:"'IBM Plex Sans', sans-serif"}} startIcon={<KeyIcon/>}>
          {saving?'Working…':'Bulk Generate Logins'}
        </Button>
      </Box>
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
              <Typography sx={{fontWeight:700,fontSize:'0.9rem',color:C.brand,fontFamily:"'IBM Plex Sans', sans-serif"}}> {grade}</Typography>
              <Chip label={grouped[grade].length} size="small" sx={{height:20,fontSize:'0.7rem',fontWeight:700,bgcolor:'#E8F5E9',color:C.accent}}/>
            </Box>
            <TableContainer component={Paper} elevation={0} sx={{border:`1px solid ${C.border}`,borderRadius:'6px'}}>
              <Table size="small" sx={{borderCollapse:'collapse'}}>
                <TableHead><TableRow>
                  {['#','Student No.','Name','National ID','Email','Phone','Stream','Login','Enrolled'].map(h=>(
                    <TableCell key={h} sx={{...hc,...(h==='Enrolled'?{borderRight:'none'}:{})}}>{h}</TableCell>
                  ))}
                </TableRow></TableHead>
                <TableBody>
                  {grouped[grade].map((s,idx)=>(
                    <TableRow key={s.id} sx={{backgroundColor:idx%2===0?C.white:'#FAFBFC','&:hover':{backgroundColor:'#F7FAFC'}}}>
                      <TableCell sx={{...bc,color:C.muted,textAlign:'center',width:40}}>{idx+1}</TableCell>
                      <TableCell sx={{...bc,fontFamily:'monospace',fontSize:'0.8rem',color:C.brand,fontWeight:700}}>{s.studentNumber}</TableCell>
                      <TableCell sx={{...bc,fontWeight:600}}>{s.firstName} {s.lastName}</TableCell>
                      <TableCell sx={{...bc,fontFamily:'monospace',fontSize:'0.8rem'}}>{s.nationalId||'—'}</TableCell>
                      <TableCell sx={{...bc,color:'#1565C0'}}>{s.email||'—'}</TableCell>
                      <TableCell sx={bc}>{s.phone||'—'}</TableCell>
                      <TableCell sx={bc}>{s.stream?<Chip label={s.stream} size="small" sx={{fontSize:'0.7rem',fontWeight:700,bgcolor:'#EEF2FF',color:'#3730A3'}}/>:<Typography sx={{fontSize:'0.8rem',color:C.muted}}>—</Typography>}</TableCell>
                      <TableCell sx={bc}>
                        <Box sx={{display:'flex',gap:0.5}}>
                          <Tooltip title="Set Login Credentials"><IconButton size="small" onClick={()=>{setCredDialogStudent(s);setStudentCred({password:''});}} sx={{color:'#6A1B9A'}}><KeyIcon sx={{fontSize:15}}/></IconButton></Tooltip>
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
          }} disabled={saving} sx={{background:'#6A1B9A',textTransform:'none',fontWeight:700,boxShadow:'none',fontFamily:"'IBM Plex Sans', sans-serif"}}>
            {saving?'Saving…':'Set Credentials'}
          </Button>
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

  return (
    <Card_>
      <SectionHead title="Teachers" subtitle="Manage teachers and their login access"
        action={
          <Button variant="contained" startIcon={<AddIcon/>} onClick={openAdd}
            sx={{background:C.brand,textTransform:'none',fontWeight:700,boxShadow:'none',fontFamily:"'IBM Plex Sans', sans-serif"}}>
            Add Teacher
          </Button>
        }
      />

      {teachers.length===0 ? (
        <Typography sx={{color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif"}}>No teachers added yet.</Typography>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{border:`1px solid ${C.border}`,borderRadius:'6px'}}>
          <Table size="small" sx={{borderCollapse:'collapse'}}>
            <TableHead><TableRow>
              {['#','Name','Emp. No.','Email','Phone','Subjects','Status','Login',''].map(h=>(
                <TableCell key={h} sx={{...hc,...(h===''?{borderRight:'none'}:{})}}>{h}</TableCell>
              ))}
            </TableRow></TableHead>
            <TableBody>
              {teachers.map((t,idx)=>(
                <TableRow key={t.id} sx={{backgroundColor:idx%2===0?C.white:'#FAFBFC'}}>
                  <TableCell sx={{...bc,color:C.muted,textAlign:'center',width:40}}>{idx+1}</TableCell>
                  <TableCell sx={{...bc,fontWeight:600}}>{t.firstName} {t.lastName}</TableCell>
                  <TableCell sx={{...bc,fontFamily:'monospace',fontSize:'0.8rem'}}>{t.employeeNumber||'—'}</TableCell>
                  <TableCell sx={{...bc,color:'#1565C0'}}>{t.email||'—'}</TableCell>
                  {/* ── Phone column ── */}
                  <TableCell sx={bc}>{t.phone||'—'}</TableCell>
                  {/* ── Subjects column ── */}
                  <TableCell sx={bc}>
                    {(t.subjects||[]).length>0 ? (
                      <Box sx={{display:'flex',flexWrap:'wrap',gap:0.5}}>
                        {(t.subjects||[]).slice(0,3).map(s=>(
                          <Chip key={s.id} label={s.name} size="small" sx={{fontSize:'0.65rem',fontWeight:600,height:18,bgcolor:'#EEF2FF',color:'#3730A3'}}/>
                        ))}
                        {(t.subjects||[]).length>3 && <Chip label={`+${(t.subjects||[]).length-3}`} size="small" sx={{fontSize:'0.65rem',height:18,bgcolor:C.headerBg,color:C.muted}}/>}
                      </Box>
                    ) : (
                      <Typography sx={{fontSize:'0.78rem',color:C.muted,fontStyle:'italic',fontFamily:"'IBM Plex Sans', sans-serif"}}>None assigned</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={bc}>
                    <Chip label={t.isActive?'Active':'Inactive'} size="small" sx={{fontWeight:700,fontSize:'0.7rem',bgcolor:t.isActive?'#E8F5E9':'#F5F5F5',color:t.isActive?C.accent:C.muted}}/>
                  </TableCell>
                  <TableCell sx={bc}>
                    <Chip label={t.username?'Set':'Not set'} size="small" sx={{fontWeight:700,fontSize:'0.7rem',bgcolor:t.username?'#EEF2FF':'#FFF3F3',color:t.username?'#3730A3':C.danger}}/>
                  </TableCell>
                  <TableCell sx={{...bc,borderRight:'none'}}>
                    <Box sx={{display:'flex',gap:0.5}}>
                      <Tooltip title="Edit"><IconButton size="small" onClick={()=>openEdit(t)} sx={{color:C.brand}}><EditIcon sx={{fontSize:15}}/></IconButton></Tooltip>
                      <Tooltip title="Set Login Credentials"><IconButton size="small" onClick={()=>{setCredDialog(t);setCred({username:'',password:''});}} sx={{color:'#6A1B9A'}}><KeyIcon sx={{fontSize:15}}/></IconButton></Tooltip>
                      {t.isActive&&<Tooltip title="Deactivate"><IconButton size="small" onClick={()=>handleDeactivate(t.id)} sx={{color:C.danger}}><DeleteIcon sx={{fontSize:15}}/></IconButton></Tooltip>}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialog} onClose={()=>setDialog(false)} maxWidth="sm" fullWidth PaperProps={{sx:{borderRadius:'10px'}}}>
        <DialogTitle sx={{fontWeight:700,color:C.brand,fontFamily:"'IBM Plex Sans', sans-serif"}}>{editing?'Edit Teacher':'Add Teacher'}</DialogTitle>
        <Divider/>
        <DialogContent sx={{pt:2.5,display:'flex',flexDirection:'column',gap:2}}>

          <Box sx={{display:'flex',gap:2}}>
            <TextField label="First Name *" value={form.firstName} size="small" fullWidth
              error={!!errors.firstName} helperText={errors.firstName||''}
              inputProps={{maxLength:50}}
              onChange={e=>{setForm(f=>({...f,firstName:e.target.value}));if(errors.firstName)setErrors(v=>({...v,firstName:''}));}}/>
            <TextField label="Last Name *" value={form.lastName} size="small" fullWidth
              error={!!errors.lastName} helperText={errors.lastName||''}
              inputProps={{maxLength:50}}
              onChange={e=>{setForm(f=>({...f,lastName:e.target.value}));if(errors.lastName)setErrors(v=>({...v,lastName:''}));}}/>
          </Box>

          <Box sx={{display:'flex',gap:2}}>
            <TextField label="Employee Number" value={form.employeeNumber} size="small" fullWidth
              error={!!errors.employeeNumber} helperText={errors.employeeNumber||''}
              inputProps={{maxLength:20}}
              onChange={e=>{setForm(f=>({...f,employeeNumber:e.target.value}));if(errors.employeeNumber)setErrors(v=>({...v,employeeNumber:''}));}}/>
            <TextField select label="Gender" value={form.gender} onChange={e=>setForm(f=>({...f,gender:e.target.value}))} size="small" fullWidth>
              <MenuItem value="">—</MenuItem><MenuItem value="Male">Male</MenuItem><MenuItem value="Female">Female</MenuItem>
            </TextField>
          </Box>

          <TextField label="Email" value={form.email} size="small" fullWidth
            placeholder="teacher@school.co.za"
            error={!!errors.email} helperText={errors.email||''}
            inputProps={{maxLength:100}}
            onChange={e=>{setForm(f=>({...f,email:e.target.value}));if(errors.email)setErrors(v=>({...v,email:''}));}}/>

          <TextField label="Phone *" value={form.phone} size="small" fullWidth
            placeholder="0821234567"
            error={!!errors.phone}
            helperText={errors.phone||`${(form.phone||'').replace(/\D/g,'').length}/10 digits`}
            inputProps={{maxLength:15}}
            onChange={e=>{
              const val=e.target.value.replace(/[^\d\s+\-()]/g,'');
              setForm(f=>({...f,phone:val}));
              if(errors.phone)setErrors(v=>({...v,phone:''}));
            }}/>

          {/* Subject chips */}
          <Box>
            <Typography sx={{fontSize:'0.78rem',fontWeight:600,color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif",mb:1}}>
              Subjects this teacher can teach
            </Typography>
            {allNatSubjects.length===0 ? (
              <Typography sx={{fontSize:'0.78rem',color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif"}}>Loading subjects…</Typography>
            ) : (
              <Box sx={{display:'flex',flexWrap:'wrap',gap:0.75,maxHeight:180,overflowY:'auto',p:1,border:`1px solid ${C.border}`,borderRadius:'6px'}}>
                {allNatSubjects.map(ns=>{
                  const selected=selSubjects.includes(ns.id);
                  return (
                    <Chip key={ns.id} label={ns.name} size="small" clickable
                      onClick={()=>setSelSubjects(p=>selected?p.filter(x=>x!==ns.id):[...p,ns.id])}
                      sx={{fontWeight:600,fontSize:'0.72rem',fontFamily:"'IBM Plex Sans', sans-serif",
                        background:selected?C.brand:C.white,color:selected?C.white:C.text,
                        border:`1px solid ${selected?C.brand:C.border}`}}/>
                  );
                })}
              </Box>
            )}
            {selSubjects.length>0&&(
              <Typography sx={{fontSize:'0.72rem',color:C.accent,mt:0.75,fontFamily:"'IBM Plex Sans', sans-serif"}}>
                {selSubjects.length} subject{selSubjects.length!==1?'s':''} selected
              </Typography>
            )}
          </Box>

        </DialogContent>
        <Divider/>
        <DialogActions sx={{px:3,py:2,gap:1}}>
          <Button onClick={()=>setDialog(false)} sx={{textTransform:'none',color:C.muted}}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            sx={{background:C.brand,textTransform:'none',fontWeight:700,boxShadow:'none',fontFamily:"'IBM Plex Sans', sans-serif"}}>
            {saving?'Saving…':editing?'Update':'Add Teacher'}
          </Button>
        </DialogActions>
      </Dialog>

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
            sx={{background:'#6A1B9A',textTransform:'none',fontWeight:700,boxShadow:'none',fontFamily:"'IBM Plex Sans', sans-serif"}}>
            {saving?'Saving…':'Set Credentials'}
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
    <Card_>
      <SectionHead title="Timetable Builder" subtitle="Click a class to build its weekly timetable"/>
      {!selClass?(
        <>
          {classes.length===0?(
            <Typography sx={{color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif"}}>No classes found. Add classes in School Setup first.</Typography>
          ):(
            <Box sx={{display:'flex',flexWrap:'wrap',gap:2}}>
              {classes.map(cls=>(
                <Box key={cls.id} onClick={()=>loadTimetable(cls)} sx={{width:140,p:2.5,borderRadius:'10px',cursor:'pointer',border:`1.5px solid ${C.border}`,background:C.white,textAlign:'center','&:hover':{borderColor:C.brand,background:'#EFF6FF'},transition:'all 0.15s'}}>
                  <Typography sx={{fontWeight:800,fontSize:'1.7rem',color:C.brand,lineHeight:1,fontFamily:"'IBM Plex Sans', sans-serif"}}>{cls.name}</Typography>
                  <Typography sx={{fontSize:'0.72rem',color:C.muted,mt:0.5,fontFamily:"'IBM Plex Sans', sans-serif"}}>{cls.grade}</Typography>
                  {cls.stream&&<Chip label={cls.stream} size="small" sx={{mt:0.75,fontSize:'0.65rem',fontWeight:700,bgcolor:'#EEF2FF',color:'#3730A3'}}/>}
                </Box>
              ))}
            </Box>
          )}
        </>
      ):(
        <Box>
          <Box sx={{background:C.brand,borderRadius:'8px',p:2,mb:2.5,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <Box>
              <Typography sx={{fontWeight:800,fontSize:'1.3rem',color:C.white,fontFamily:"'IBM Plex Sans', sans-serif"}}>
                {selClass.name} {selClass.stream&&<Chip label={selClass.stream} size="small" sx={{ml:1,bgcolor:'rgba(255,255,255,0.2)',color:C.white,fontWeight:700,fontSize:'0.72rem'}}/>}
              </Typography>
              <Typography sx={{fontSize:'0.78rem',color:'rgba(255,255,255,0.7)',fontFamily:"'IBM Plex Sans', sans-serif"}}>
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
                      <TableCell key={period.id} sx={{...hc,textAlign:'center',minWidth:period.isBreak?70:120,background:period.isBreak?'#EFEFEF':C.headerBg,color:period.isBreak?C.muted:C.brand,...(i===ttData.periods.length-1?{borderRight:'none'}:{})}}>
                        <Typography sx={{fontWeight:700,fontSize:'0.7rem',fontFamily:"'IBM Plex Sans', sans-serif",letterSpacing:'0.04em',textTransform:'uppercase',color:'inherit'}}>{period.name}</Typography>
                        <Typography sx={{fontSize:'0.63rem',color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif",fontWeight:400,textTransform:'none',letterSpacing:0}}>{period.timeStart?.slice(0,5)}–{period.timeEnd?.slice(0,5)}</Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {DAYS.map(day=>(
                    <TableRow key={day}>
                      <TableCell sx={{...bc,background:C.headerBg,fontWeight:700,fontSize:'0.85rem',color:C.brand,whiteSpace:'nowrap'}}>{day.slice(0,3)}</TableCell>
                      {ttData.periods.map((period,i)=>{
                        if(period.isBreak)return(
                          <TableCell key={period.id} sx={{...bc,background:'#F5F5F5',textAlign:'center',...(i===ttData.periods.length-1?{borderRight:'none'}:{})}}>
                            <Typography sx={{fontSize:'0.68rem',color:C.muted,fontStyle:'italic',fontFamily:"'IBM Plex Sans', sans-serif"}}>—</Typography>
                          </TableCell>
                        );
                        const slot=slotMap[`${day}-${period.id}`];
                        return(
                          <TableCell key={period.id} onClick={()=>openSlot(period.id,day)} sx={{...bc,p:'4px',cursor:'pointer',background:slot?'#E8F5E9':C.white,border:`1px solid ${slot?'#A5D6A7':C.border}`,'&:hover':{background:slot?'#D4EDDA':'#EFF6FF'},minWidth:120,...(i===ttData.periods.length-1?{borderRight:'none'}:{})}}>
                            {slot?(
                              <Box sx={{p:'4px 6px',position:'relative'}}>
                                <Typography sx={{fontWeight:700,fontSize:'0.75rem',color:C.brand,fontFamily:"'IBM Plex Sans', sans-serif",lineHeight:1.3}}>{slot.subjectName}</Typography>
                                <Typography sx={{fontSize:'0.68rem',color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif"}}>{slot.teacherFirstName} {slot.teacherLastName}</Typography>
                                <IconButton size="small" onClick={e=>{e.stopPropagation();removeSlot(slot);}} sx={{position:'absolute',top:0,right:0,width:16,height:16,p:0,color:C.muted,opacity:0,'.MuiTableCell-root:hover &':{opacity:1},'&:hover':{color:C.danger}}}>
                                  <CloseIcon sx={{fontSize:11}}/>
                                </IconButton>
                              </Box>
                            ):(
                              <Box sx={{display:'flex',alignItems:'center',justifyContent:'center',height:44}}>
                                <Typography sx={{fontSize:'0.68rem',color:'#CBD5E1',fontFamily:"'IBM Plex Sans', sans-serif"}}>+ assign</Typography>
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
              {slotDlg&&<Typography sx={{fontSize:'0.78rem',color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif"}}>{slotDlg.day} · {ttData?.periods?.find(p=>p.id===slotDlg?.periodId)?.name}</Typography>}
            </DialogTitle>
            <Divider/>
            <DialogContent sx={{pt:2.5,display:'flex',flexDirection:'column',gap:2}}>
              {clash&&<Box sx={{background:C.dangerBg,border:`1px solid ${C.danger}44`,borderRadius:'6px',p:1.25,display:'flex',gap:1}}><WarningAmberIcon sx={{color:C.danger,fontSize:17}}/><Typography sx={{fontSize:'0.8rem',color:C.danger,fontFamily:"'IBM Plex Sans', sans-serif"}}>{clash}</Typography></Box>}
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
    <Card_>
      <SectionHead title="School Setup" subtitle={summary?.currentYear?`Academic Year ${summary.currentYear}`:'Configure your school structure'}/>
      <Box sx={{display:'flex',gap:1,mb:3,flexWrap:'wrap'}}>
        {STEPS.map(s=>(
          <Button key={s.key} onClick={()=>setStep(s.key)} size="small" sx={{textTransform:'none',fontWeight:700,fontSize:'0.8rem',fontFamily:"'IBM Plex Sans', sans-serif",background:step===s.key?C.brand:'transparent',color:step===s.key?C.white:isDone[s.key]?C.accent:C.muted,border:step===s.key?`1.5px solid ${C.brand}`:`1.5px solid ${C.border}`,borderRadius:'6px',px:1.75,py:0.6,'&:hover':{background:step===s.key?C.brand:C.sidebarAct}}}>
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
              <Typography sx={{fontWeight:700,fontSize:'0.9rem',fontFamily:"'IBM Plex Sans', sans-serif"}}>{y.year}</Typography>
              {y.is_current&&<Chip label="Current" size="small" sx={{bgcolor:'#E8F5E9',color:C.accent,fontWeight:700,fontSize:'0.7rem'}}/>}
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
              <Box key={n} sx={{display:'flex',alignItems:'center',gap:2,flexWrap:'wrap',p:1.5,borderRadius:'8px',background:saved?'#F0FDF4':C.bg,border:`1px solid ${saved?'#BBF7D0':C.border}`}}>
                <Box sx={{display:'flex',alignItems:'center',gap:1,minWidth:90}}>
                  {saved?<CheckCircleIcon sx={{color:C.accent,fontSize:18}}/>:<RadioButtonUncheckedIcon sx={{color:C.muted,fontSize:18}}/>}
                  <Typography sx={{fontWeight:700,fontSize:'0.9rem',color:C.brand,fontFamily:"'IBM Plex Sans', sans-serif"}}>Term {n}</Typography>
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
          <TableContainer component={Paper} elevation={0} sx={{border:`1px solid ${C.border}`,borderRadius:'6px'}}>
            <Table size="small" sx={{borderCollapse:'collapse'}}>
              <TableHead><TableRow>{['#','Name','Start','End','Break?',''].map(h=><TableCell key={h} sx={{...hc,...(h===''?{borderRight:'none'}:{})}}>{h}</TableCell>)}</TableRow></TableHead>
              <TableBody>
                {pRows.map((row,idx)=>(
                  <TableRow key={idx} sx={{background:row.isBreak?'#FFF8E1':(idx%2===0?C.white:'#FAFBFC')}}>
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
            <Typography sx={{fontWeight:700,fontSize:'0.85rem',color:C.brand,mb:1.5,fontFamily:"'IBM Plex Sans', sans-serif"}}>Add Subjects</Typography>
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
                      sx={{fontWeight:600,fontSize:'0.75rem',fontFamily:"'IBM Plex Sans', sans-serif",background:selNat.includes(ns.id)?C.brand:C.white,color:selNat.includes(ns.id)?C.white:C.text,border:`1px solid ${selNat.includes(ns.id)?C.brand:C.border}`}}/>
                  ))}
                </Box>
                <Button variant="contained" size="small" onClick={addSubjects} disabled={!selNat.length||saving}
                  sx={{background:C.brand,textTransform:'none',fontWeight:700,boxShadow:'none',fontFamily:"'IBM Plex Sans', sans-serif"}}>
                  Add {selNat.length||''} Subject{selNat.length!==1?'s':''}
                </Button>
              </>
            )}
            {addGrade&&available.length===0&&<Typography sx={{fontSize:'0.82rem',color:C.accent,fontFamily:"'IBM Plex Sans', sans-serif"}}>✓ All subjects for this grade/stream already added.</Typography>}
          </Box>
          {subjects.length>0&&(
            <TableContainer component={Paper} elevation={0} sx={{border:`1px solid ${C.border}`,borderRadius:'6px'}}>
              <Table size="small" sx={{borderCollapse:'collapse'}}>
                <TableHead><TableRow>{['Subject','Code','Grade','Stream',''].map(h=><TableCell key={h} sx={{...hc,...(h===''?{borderRight:'none'}:{})}}>{h}</TableCell>)}</TableRow></TableHead>
                <TableBody>
                  {subjects.map((s,idx)=>(
                    <TableRow key={s.id} sx={{backgroundColor:idx%2===0?C.white:'#FAFBFC'}}>
                      <TableCell sx={{...bc,fontWeight:600}}>{s.name}</TableCell>
                      <TableCell sx={{...bc,fontFamily:'monospace',fontSize:'0.8rem'}}>{s.code||'—'}</TableCell>
                      <TableCell sx={bc}> {s.grade}</TableCell>
                      <TableCell sx={bc}>{s.stream?<Chip label={s.stream} size="small" sx={{fontSize:'0.7rem',fontWeight:700,bgcolor:'#EEF2FF',color:'#3730A3'}}/>:'All'}</TableCell>
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
            <Typography sx={{fontWeight:700,fontSize:'0.85rem',color:C.brand,mb:1.5,fontFamily:"'IBM Plex Sans', sans-serif"}}>Add Class</Typography>
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
              <Typography sx={{fontSize:'0.78rem',color:C.muted,mt:1,fontFamily:"'IBM Plex Sans', sans-serif"}}>
                Preview: <strong style={{color:C.brand}}>{clsForm.grade}{clsForm.letter}{clsForm.stream?` — ${clsForm.stream}`:''}</strong>
              </Typography>
            )}
          </Box>
          {classes.length>0&&(
            <Box sx={{display:'flex',flexWrap:'wrap',gap:1.5}}>
              {classes.map(cls=>(
                <Box key={cls.id} sx={{position:'relative',p:2,borderRadius:'10px',border:`1.5px solid ${C.border}`,background:C.white,textAlign:'center',minWidth:120,'&:hover .del-btn':{opacity:1}}}>
                  <Typography sx={{fontWeight:800,fontSize:'1.5rem',color:C.brand,lineHeight:1,fontFamily:"'IBM Plex Sans', sans-serif"}}>{cls.name}</Typography>
                  <Typography sx={{fontSize:'0.7rem',color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif"}}>{cls.grade}</Typography>
                  {cls.stream&&<Chip label={cls.stream} size="small" sx={{mt:0.5,fontSize:'0.65rem',fontWeight:700,bgcolor:'#EEF2FF',color:'#3730A3'}}/>}
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
    general:  {bg:'#EEF2FF',color:'#3730A3'},
    exam:     {bg:'#FFF1F2',color:'#BE123C'},
    holiday:  {bg:'#F0FDF4',color:'#166534'},
    meeting:  {bg:'#FFF7ED',color:'#C2410C'},
    sport:    {bg:'#F0F9FF',color:'#0369A1'},
    other:    {bg:'#F9FAFB',color:'#374151'},
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
 
  return (
    <Card_>
      <SectionHead title="Events" subtitle={`Events for ${new Date(month+'-01').toLocaleDateString('en-US',{month:'long',year:'numeric'})}`}
        action={
          <Box sx={{display:'flex',gap:1.5,alignItems:'center'}}>
            <TextField type="month" value={month} onChange={e=>setMonth(e.target.value)} size="small" InputLabelProps={{shrink:true}}/>
            <Button variant="contained" startIcon={<AddIcon/>} onClick={openAdd}
              sx={{background:C.brand,textTransform:'none',fontWeight:700,boxShadow:'none',fontFamily:"'IBM Plex Sans', sans-serif"}}>
              Add Event
            </Button>
          </Box>
        }
      />
 
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
              <Typography sx={{fontSize:'0.78rem',fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.06em',mb:1,fontFamily:"'IBM Plex Sans', sans-serif"}}>
                {new Date(date+'T00:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'2-digit',month:'long'})}
              </Typography>
              <Box sx={{display:'flex',flexDirection:'column',gap:0.75}}>
                {grouped[date].map(ev=>{
                  const tc = TYPE_COLORS[ev.type]||TYPE_COLORS.other;
                  return(
                    <Box key={ev.id} sx={{display:'flex',alignItems:'center',gap:2,p:1.5,borderRadius:'8px',border:`1px solid ${C.border}`,background:C.white,'&:hover':{background:C.bg}}}>
                      <Box sx={{width:4,alignSelf:'stretch',borderRadius:'4px',background:tc.color,flexShrink:0}}/>
                      <Box sx={{flex:1,minWidth:0}}>
                        <Box sx={{display:'flex',alignItems:'center',gap:1,flexWrap:'wrap'}}>
                          <Typography sx={{fontWeight:700,fontSize:'0.9rem',color:C.text,fontFamily:"'IBM Plex Sans', sans-serif"}}>{ev.title}</Typography>
                          <Chip label={ev.type} size="small" sx={{height:18,fontSize:'0.65rem',fontWeight:700,bgcolor:tc.bg,color:tc.color}}/>
                        </Box>
                        {ev.description&&<Typography sx={{fontSize:'0.8rem',color:C.muted,mt:0.25,fontFamily:"'IBM Plex Sans', sans-serif"}}>{ev.description}</Typography>}
                        <Box sx={{display:'flex',gap:2,mt:0.5,flexWrap:'wrap'}}>
                          {ev.eventTime&&<Typography sx={{fontSize:'0.75rem',color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif"}}>🕐 {ev.eventTime?.slice(0,5)}</Typography>}
                          {ev.location&&<Typography sx={{fontSize:'0.75rem',color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif"}}>📍 {ev.location}</Typography>}
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
 
      {/* Dialog */}
      <Dialog open={dialog} onClose={()=>setDialog(false)} maxWidth="sm" fullWidth PaperProps={{sx:{borderRadius:'10px'}}}>
        <DialogTitle sx={{fontWeight:700,color:C.brand,fontFamily:"'IBM Plex Sans', sans-serif"}}>{editing?'Edit Event':'Add Event'}</DialogTitle>
        <Divider/>
        <DialogContent sx={{pt:2.5,display:'flex',flexDirection:'column',gap:2}}>
          <TextField label="Title *" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} size="small" fullWidth inputProps={{maxLength:200}}/>
          <TextField label="Description" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} size="small" fullWidth multiline rows={2}/>
          <Box sx={{display:'flex',gap:2}}>
            <TextField label="Date *" type="date" value={form.eventDate} onChange={e=>setForm(f=>({...f,eventDate:e.target.value}))} size="small" fullWidth InputLabelProps={{shrink:true}}/>
            <TextField label="Time" type="time" value={form.eventTime} onChange={e=>setForm(f=>({...f,eventTime:e.target.value}))} size="small" fullWidth InputLabelProps={{shrink:true}}/>
          </Box>
          <Box sx={{display:'flex',gap:2}}>
            <TextField label="Location" value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} size="small" fullWidth/>
            <TextField select label="Type" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} size="small" fullWidth>
              {EVENT_TYPES.map(t=><MenuItem key={t} value={t} sx={{textTransform:'capitalize'}}>{t}</MenuItem>)}
            </TextField>
          </Box>
        </DialogContent>
        <Divider/>
        <DialogActions sx={{px:3,py:2,gap:1}}>
          <Button onClick={()=>setDialog(false)} sx={{textTransform:'none',color:C.muted}}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            sx={{background:C.brand,textTransform:'none',fontWeight:700,boxShadow:'none',fontFamily:"'IBM Plex Sans', sans-serif"}}>
            {saving?'Saving…':editing?'Update':'Create Event'}
          </Button>
        </DialogActions>
      </Dialog>
 
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
 
  const AUDIENCE_COLORS = {all:{bg:'#EEF2FF',color:'#3730A3'},teachers:{bg:'#FFF7ED',color:'#C2410C'},students:{bg:'#F0FDF4',color:'#166534'}};
 
  return (
    <Card_>
      <SectionHead title="Announcements" subtitle="Post notices for teachers and students"
        action={
          <Button variant="contained" startIcon={<AddIcon/>} onClick={openAdd}
            sx={{background:C.brand,textTransform:'none',fontWeight:700,boxShadow:'none',fontFamily:"'IBM Plex Sans', sans-serif"}}>
            New Announcement
          </Button>
        }
      />
 
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
            return(
              <Box key={a.id} sx={{p:2,borderRadius:'8px',border:`1px solid ${a.isPinned?C.brand:C.border}`,background:a.isPinned?'#F0F6FF':C.white,position:'relative'}}>
                {a.isPinned&&<Box sx={{position:'absolute',top:10,left:-1,width:3,height:'calc(100% - 20px)',borderRadius:'0 2px 2px 0',background:C.brand}}/>}
                <Box sx={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:1,flexWrap:'wrap'}}>
                  <Box sx={{flex:1,minWidth:0}}>
                    <Box sx={{display:'flex',alignItems:'center',gap:1,flexWrap:'wrap',mb:0.5}}>
                      {a.isPinned&&<PushPinIcon sx={{fontSize:14,color:C.brand,transform:'rotate(45deg)'}}/>}
                      <Typography sx={{fontWeight:700,fontSize:'0.95rem',color:C.text,fontFamily:"'IBM Plex Sans', sans-serif"}}>{a.title}</Typography>
                      <Chip label={a.audience} size="small" sx={{height:18,fontSize:'0.65rem',fontWeight:700,bgcolor:ac.bg,color:ac.color,textTransform:'capitalize'}}/>
                    </Box>
                    <Typography sx={{fontSize:'0.85rem',color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif",lineHeight:1.6,whiteSpace:'pre-wrap'}}>{a.body}</Typography>
                    <Typography sx={{fontSize:'0.72rem',color:C.muted,mt:1,fontFamily:"'IBM Plex Sans', sans-serif"}}>
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
 
      <Dialog open={dialog} onClose={()=>setDialog(false)} maxWidth="sm" fullWidth PaperProps={{sx:{borderRadius:'10px'}}}>
        <DialogTitle sx={{fontWeight:700,color:C.brand,fontFamily:"'IBM Plex Sans', sans-serif"}}>{editing?'Edit Announcement':'New Announcement'}</DialogTitle>
        <Divider/>
        <DialogContent sx={{pt:2.5,display:'flex',flexDirection:'column',gap:2}}>
          <TextField label="Title *" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} size="small" fullWidth inputProps={{maxLength:200}}/>
          <TextField label="Body *" value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))} size="small" fullWidth multiline rows={4} placeholder="Write the announcement here…"/>
          <Box sx={{display:'flex',gap:2,alignItems:'center'}}>
            <TextField select label="Audience" value={form.audience} onChange={e=>setForm(f=>({...f,audience:e.target.value}))} size="small" sx={{width:160}}>
              <MenuItem value="all">Everyone</MenuItem>
              <MenuItem value="teachers">Teachers only</MenuItem>
              <MenuItem value="students">Students only</MenuItem>
            </TextField>
            <Box sx={{display:'flex',alignItems:'center',gap:1}}>
              <Switch checked={form.isPinned} onChange={e=>setForm(f=>({...f,isPinned:e.target.checked}))} size="small" inputProps={{ id: 'pin-switch', name: 'pin-switch' }}/>
              <Typography sx={{fontSize:'0.82rem',color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif"}}>Pin to top</Typography>
            </Box>
          </Box>
        </DialogContent>
        <Divider/>
        <DialogActions sx={{px:3,py:2,gap:1}}>
          <Button onClick={()=>setDialog(false)} sx={{textTransform:'none',color:C.muted}}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            sx={{background:C.brand,textTransform:'none',fontWeight:700,boxShadow:'none',fontFamily:"'IBM Plex Sans', sans-serif"}}>
            {saving?'Saving…':editing?'Update':'Post'}
          </Button>
        </DialogActions>
      </Dialog>
 
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
 
  // ── Export to Excel ──
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
        'Total Days':  s.total,
        'Attendance %': s.percentage!==null ? `${s.percentage}%` : '—',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = Object.keys(rows[0]||{}).map(k=>({wch:Math.max(k.length,12)}));
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
      XLSX.writeFile(wb, `attendance_${report.class?.name}_${new Date().toISOString().slice(0,10)}.xlsx`);
    } else {
      // Results: students as rows, subjects as columns
      const headers = ['Student No.','Name',...(report.subjects||[]).map(s=>s.name),'Average %'];
      const rows = report.students.map(s=>{
        const row = {'Student No.':s.studentNumber, 'Name':`${s.firstName} ${s.lastName}`};
        (report.subjects||[]).forEach(sub=>{
          const r = s.results?.[sub.id];
          row[sub.name] = r ? `${r.score}/${r.maxScore} (${r.percentage}%)` : '—';
        });
        row['Average %'] = s.average!==null ? `${s.average}%` : '—';
        return row;
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = headers.map(()=>({wch:18}));
      XLSX.utils.book_append_sheet(wb, ws, 'Results');
      XLSX.writeFile(wb, `results_${report.class?.name}_${new Date().toISOString().slice(0,10)}.xlsx`);
    }
    toast('Excel file downloaded');
  };
 
  // ── Attendance colour ──
  const attColor = (pct) => {
    if (pct===null) return C.muted;
    if (pct>=80) return '#16A34A';
    if (pct>=60) return '#D97706';
    return '#C62828';
  };
 
  // ── Result colour ──
  const resColor = (pct) => {
    if (pct===null) return C.muted;
    if (pct>=75) return '#16A34A';
    if (pct>=50) return '#D97706';
    return '#C62828';
  };
 
  return (
    <Card_>
      <SectionHead title="Reports" subtitle="Generate attendance and results reports"/>
 
      {/* Report type tabs */}
      <Box sx={{display:'flex',gap:1.5,mb:3}}>
          {['attendance','results'].map((t,i)=>(
          <Button key={t} onClick={()=>{setTab(t);setReport(null);}} size="small" sx={{
            textTransform:'none', fontWeight:700, fontSize:'0.82rem',
            fontFamily:"'IBM Plex Sans', sans-serif",
            background: tab===t ? C.brand : 'transparent',
            color: tab===t ? C.white : C.muted,
            border: tab===t ? `1.5px solid ${C.brand}` : `1.5px solid ${C.border}`,
            borderRadius:'6px', px:2, py:0.75,
            '&:hover':{ background: tab===t ? C.brand : C.sidebarAct },
          }}>
            {t==='attendance' ? '📋 Attendance Report' : '🏆 Results Report'}
          </Button>
        ))}
      </Box>
 
      {/* Filters */}
      <Box sx={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:'8px',p:2,mb:3}}>
        <Box sx={{display:'flex',gap:2,flexWrap:'wrap',alignItems:'flex-end'}}>
          <TextField select label="Class *" value={selClass} onChange={e=>setSelClass(e.target.value)} size="small" sx={{minWidth:150}}>
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
              {terms.map(t=><MenuItem key={t.id} value={t.id}>Term {t.term_number}</MenuItem>)}
            </TextField>
          )}
 
          <Button variant="contained" onClick={generate} disabled={loading||!selClass}
            sx={{background:C.brand,textTransform:'none',fontWeight:700,boxShadow:'none',fontFamily:"'IBM Plex Sans', sans-serif"}}>
            {loading?'Generating…':'Generate Report'}
          </Button>
 
          {report&&(
            <Button variant="outlined" startIcon={<FileDownloadIcon/>} onClick={exportExcel}
              sx={{borderColor:C.accent,color:C.accent,textTransform:'none',fontWeight:700,fontFamily:"'IBM Plex Sans', sans-serif",'&:hover':{background:'#F0FDF4'}}}>
              Export to Excel
            </Button>
          )}
        </Box>
      </Box>
 
      {/* Report output */}
      {loading && <Box sx={{display:'flex',justifyContent:'center',py:6}}><CircularProgress sx={{color:C.brand}}/></Box>}
 
      {report && !loading && (
        <Box>
          {/* Report header */}
          <Box sx={{display:'flex',alignItems:'center',justifyContent:'space-between',mb:2,flexWrap:'wrap',gap:1}}>
            <Box>
              <Typography sx={{fontWeight:700,fontSize:'1rem',color:C.brand,fontFamily:"'IBM Plex Sans', sans-serif"}}>
                {tab==='attendance'?'Attendance Report':'Results Report'} — {report.class?.name}
              </Typography>
              <Typography sx={{fontSize:'0.78rem',color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif"}}>
                {report.students?.length} students
                {tab==='attendance'&&report.dateRange?.startDate&&` · ${report.dateRange.startDate} to ${report.dateRange.endDate||'today'}`}
              </Typography>
            </Box>
          </Box>
 
          {/* ── ATTENDANCE TABLE ── */}
          {tab==='attendance'&&(
            <TableContainer component={Paper} elevation={0} sx={{border:`1px solid ${C.border}`,borderRadius:'6px'}}>
              <Table size="small" sx={{borderCollapse:'collapse'}}>
                <TableHead><TableRow>
                  {['#','Student No.','Name','Present','Absent','Late','Total','Attendance %'].map((h,i,arr)=>(
                    <TableCell key={h} sx={{...hc,...(i===arr.length-1?{borderRight:'none'}:{})}}>{h}</TableCell>
                  ))}
                </TableRow></TableHead>
                <TableBody>
                  {report.students.length===0?(
                    <TableRow><TableCell colSpan={8} sx={{...bc,borderRight:'none',textAlign:'center',py:4,color:C.muted}}>No data available.</TableCell></TableRow>
                  ):(
                    report.students.map((s,idx)=>(
                      <TableRow key={s.id} sx={{backgroundColor:idx%2===0?C.white:'#FAFBFC'}}>
                        <TableCell sx={{...bc,color:C.muted,textAlign:'center',width:40}}>{idx+1}</TableCell>
                        <TableCell sx={{...bc,fontFamily:'monospace',fontSize:'0.8rem',color:C.brand,fontWeight:700}}>{s.studentNumber}</TableCell>
                        <TableCell sx={{...bc,fontWeight:600}}>{s.firstName} {s.lastName}</TableCell>
                        <TableCell sx={{...bc,color:'#16A34A',fontWeight:700}}>{s.present}</TableCell>
                        <TableCell sx={{...bc,color:'#C62828',fontWeight:700}}>{s.absent}</TableCell>
                        <TableCell sx={{...bc,color:'#D97706',fontWeight:700}}>{s.late}</TableCell>
                        <TableCell sx={bc}>{s.total}</TableCell>
                        <TableCell sx={{...bc,borderRight:'none'}}>
                          {s.percentage!==null?(
                            <Box sx={{display:'flex',alignItems:'center',gap:1}}>
                              <Box sx={{flex:1,height:6,borderRadius:3,background:'#E2E8F0',overflow:'hidden'}}>
                                <Box sx={{height:'100%',width:`${s.percentage}%`,background:attColor(s.percentage),borderRadius:3,transition:'width 0.3s'}}/>
                              </Box>
                              <Typography sx={{fontSize:'0.8rem',fontWeight:700,color:attColor(s.percentage),minWidth:40,fontFamily:"'IBM Plex Sans', sans-serif"}}>
                                {s.percentage}%
                              </Typography>
                            </Box>
                          ):'—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
 
          {/* ── RESULTS TABLE ── */}
          {tab==='results'&&(
            <Box sx={{overflowX:'auto'}}>
              <Table sx={{borderCollapse:'collapse',minWidth:600}}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{...hc,width:40}}>#</TableCell>
                    <TableCell sx={hc}>Name</TableCell>
                    {(report.subjects||[]).map(sub=>(
                      <TableCell key={sub.id} sx={{...hc,textAlign:'center',minWidth:110}}>{sub.name}</TableCell>
                    ))}
                    <TableCell sx={{...hc,borderRight:'none',textAlign:'center'}}>Average</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.students.length===0?(
                    <TableRow><TableCell colSpan={(report.subjects?.length||0)+3} sx={{...bc,borderRight:'none',textAlign:'center',py:4,color:C.muted}}>No results found.</TableCell></TableRow>
                  ):(
                    report.students.map((s,idx)=>(
                      <TableRow key={s.id} sx={{backgroundColor:idx%2===0?C.white:'#FAFBFC'}}>
                        <TableCell sx={{...bc,color:C.muted,textAlign:'center'}}>{idx+1}</TableCell>
                        <TableCell sx={{...bc,fontWeight:600}}>{s.firstName} {s.lastName}</TableCell>
                        {(report.subjects||[]).map(sub=>{
                          const r=s.results?.[sub.id];
                          return(
                            <TableCell key={sub.id} sx={{...bc,textAlign:'center'}}>
                              {r?(
                                <Box>
                                  <Typography sx={{fontSize:'0.82rem',fontWeight:700,color:resColor(r.percentage),fontFamily:"'IBM Plex Sans', sans-serif"}}>{r.score}/{r.maxScore}</Typography>
                                  <Typography sx={{fontSize:'0.7rem',color:resColor(r.percentage),fontFamily:"'IBM Plex Sans', sans-serif"}}>{r.percentage}%</Typography>
                                </Box>
                              ):<Typography sx={{color:C.muted,fontSize:'0.8rem'}}>—</Typography>}
                            </TableCell>
                          );
                        })}
                        <TableCell sx={{...bc,borderRight:'none',textAlign:'center'}}>
                          {s.average!==null?(
                            <Typography sx={{fontWeight:800,fontSize:'0.9rem',color:resColor(s.average),fontFamily:"'IBM Plex Sans', sans-serif"}}>{s.average}%</Typography>
                          ):'—'}
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
];

const ManagementDashboard = () => {
  const navigate    = useNavigate();
  const [active,    setActive]    = useState('overview');
  const [collapsed, setCollapsed] = useState(false);
  const school    = localStorage.getItem('adminSchool') || 'School';
  const adminName = localStorage.getItem('adminName')   || 'Admin';

  useEffect(()=>{ if(!localStorage.getItem('adminToken')) navigate('/login'); },[navigate]);

  const handleLogout = () => {
    ['adminToken','adminSchool','adminName'].forEach(k=>localStorage.removeItem(k));
    navigate('/login');
  };

  return (
    <Box sx={{display:'flex',minHeight:'100vh',background:C.bg,fontFamily:"'IBM Plex Sans', sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Sidebar */}
      <Box sx={{width:collapsed?64:240,minHeight:'100vh',background:C.sidebar,borderRight:`1px solid ${C.border}`,display:'flex',flexDirection:'column',transition:'width 0.2s ease',flexShrink:0}}>
        <Box sx={{px:collapsed?1.5:2.5,py:2.5,display:'flex',alignItems:'center',gap:1.5,borderBottom:`1px solid ${C.border}`}}>
          <Box sx={{width:34,height:34,borderRadius:'8px',background:C.brand,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <SchoolIcon sx={{color:C.white,fontSize:18}}/>
          </Box>
          {!collapsed&&(
            <Box sx={{overflow:'hidden'}}>
              <Typography sx={{fontWeight:800,fontSize:'0.85rem',color:C.brand,lineHeight:1.2,fontFamily:"'IBM Plex Sans', sans-serif",whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{school}</Typography>
              <Typography sx={{fontSize:'0.65rem',color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif"}}>Management Portal</Typography>
            </Box>
          )}
        </Box>

        <Box sx={{flex:1,py:1.5,px:collapsed?0.75:1.5,overflowY:'auto'}}>
          {!collapsed&&<Typography sx={{fontSize:'0.62rem',fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.08em',px:1,mb:0.75,fontFamily:"'IBM Plex Sans', sans-serif"}}>Menu</Typography>}
          {NAV.map(item=>{
            const on=active===item.key;
            return(
              <Tooltip key={item.key} title={collapsed?item.label:''} placement="right">
                <Box onClick={()=>setActive(item.key)} sx={{display:'flex',alignItems:'center',gap:1.5,px:collapsed?1.25:1.5,py:1,borderRadius:'8px',cursor:'pointer',mb:0.25,background:on?C.sidebarAct:'transparent',color:on?C.brand:C.muted,'&:hover':{background:C.sidebarAct,color:C.brand},transition:'all 0.12s'}}>
                  <Box sx={{color:'inherit',display:'flex',flexShrink:0}}>{item.icon}</Box>
                  {!collapsed&&<Typography sx={{fontSize:'0.85rem',fontWeight:on?700:500,color:'inherit',fontFamily:"'IBM Plex Sans', sans-serif",whiteSpace:'nowrap'}}>{item.label}</Typography>}
                  {on&&!collapsed&&<Box sx={{ml:'auto',width:5,height:5,borderRadius:'50%',background:C.brand}}/>}
                </Box>
              </Tooltip>
            );
          })}
          {!collapsed?<><Divider sx={{my:1.5,borderColor:C.border}}/><Typography sx={{fontSize:'0.62rem',fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.08em',px:1,mb:0.75,fontFamily:"'IBM Plex Sans', sans-serif"}}>Switch Mode</Typography></>:<Divider sx={{my:1,borderColor:C.border}}/>}
          <Tooltip title={collapsed?'Applications Portal':''} placement="right">
            <Box onClick={()=>navigate('/admin')} sx={{display:'flex',alignItems:'center',gap:1.5,px:collapsed?1.25:1.5,py:1,borderRadius:'8px',cursor:'pointer',color:C.muted,'&:hover':{background:C.sidebarAct,color:C.brand}}}>
              <SwapHorizIcon sx={{fontSize:19,flexShrink:0}}/>
              {!collapsed&&<Typography sx={{fontSize:'0.85rem',fontWeight:500,color:'inherit',fontFamily:"'IBM Plex Sans', sans-serif",whiteSpace:'nowrap'}}>Applications Portal</Typography>}
            </Box>
          </Tooltip>
        </Box>

        <Box sx={{p:collapsed?0.75:1.5,borderTop:`1px solid ${C.border}`}}>
          <Tooltip title={collapsed?'Expand':''} placement="right">
            <Box onClick={()=>setCollapsed(c=>!c)} sx={{display:'flex',alignItems:'center',gap:1.5,px:collapsed?1.25:1.5,py:0.9,borderRadius:'8px',cursor:'pointer',color:C.muted,'&:hover':{background:C.sidebarAct,color:C.brand}}}>
              {collapsed?<MenuIcon sx={{fontSize:19}}/>:<><ChevronLeftIcon sx={{fontSize:19}}/><Typography sx={{fontSize:'0.82rem',fontWeight:500,fontFamily:"'IBM Plex Sans', sans-serif"}}>Collapse</Typography></>}
            </Box>
          </Tooltip>
          <Tooltip title={collapsed?'Logout':''} placement="right">
            <Box onClick={handleLogout} sx={{display:'flex',alignItems:'center',gap:1.5,px:collapsed?1.25:1.5,py:0.9,borderRadius:'8px',cursor:'pointer',color:C.muted,'&:hover':{background:'#FFEBEE',color:C.danger}}}>
              <LogoutIcon sx={{fontSize:19,flexShrink:0}}/>
              {!collapsed&&<Typography sx={{fontSize:'0.82rem',fontWeight:500,fontFamily:"'IBM Plex Sans', sans-serif"}}>Logout</Typography>}
            </Box>
          </Tooltip>
        </Box>
      </Box>

      {/* Main */}
      <Box sx={{flex:1,minWidth:0,display:'flex',flexDirection:'column'}}>
        <Box sx={{background:C.white,borderBottom:`1px solid ${C.border}`,px:3,height:56,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <Typography sx={{fontWeight:700,fontSize:'0.95rem',color:C.text,fontFamily:"'IBM Plex Sans', sans-serif"}}>
            {NAV.find(n=>n.key===active)?.label||'Dashboard'}
          </Typography>
          <Box sx={{display:'flex',alignItems:'center',gap:1.5}}>
            <Avatar sx={{width:32,height:32,background:C.brand,fontSize:'0.8rem',fontWeight:700}}>{adminName.charAt(0).toUpperCase()}</Avatar>
            <Box>
              <Typography sx={{fontSize:'0.8rem',fontWeight:700,color:C.text,lineHeight:1.2,fontFamily:"'IBM Plex Sans', sans-serif"}}>{adminName}</Typography>
              <Typography sx={{fontSize:'0.65rem',color:C.muted,fontFamily:"'IBM Plex Sans', sans-serif"}}>School Admin</Typography>
            </Box>
          </Box>
        </Box>
        <Box sx={{flex:1,p:3,overflowY:'auto'}}>
          {active==='overview'  && <OverviewSection/>}
          {active==='students'  && <StudentsSection/>}
          {active==='teachers'  && <TeachersSection/>}
          {active==='timetable' && <TimetableSection/>}
          {active==='events'         && <EventsSection/>}
          {active==='announcements'  && <AnnouncementsSection/>}
          {active==='reports'        && <ReportsSection/>}
          {active==='setup'     && <SetupSection/>}

        </Box>
      </Box>
    </Box>
  );
};

export default ManagementDashboard;



