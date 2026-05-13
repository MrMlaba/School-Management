import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Avatar, CircularProgress,
  IconButton, Tooltip, LinearProgress,
} from '@mui/material';
import AssignmentIcon         from '@mui/icons-material/Assignment';
import CalendarTodayIcon      from '@mui/icons-material/CalendarToday';
import GradeIcon              from '@mui/icons-material/Grade';
import LogoutIcon             from '@mui/icons-material/Logout';
import ChatBubbleOutlineIcon  from '@mui/icons-material/ChatBubbleOutline';
import ArrowForwardIcon       from '@mui/icons-material/ArrowForward';
import MenuBookIcon           from '@mui/icons-material/MenuBook';
import AccessTimeIcon         from '@mui/icons-material/AccessTime';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EmojiEventsIcon        from '@mui/icons-material/EmojiEvents';
import HourglassEmptyIcon     from '@mui/icons-material/HourglassEmpty';
import CalendarMonthIcon      from '@mui/icons-material/CalendarMonth';
import TrendingUpIcon         from '@mui/icons-material/TrendingUp';
import HomeIcon               from '@mui/icons-material/Home';
import MoreHorizIcon          from '@mui/icons-material/MoreHoriz';
import QuizIcon               from '@mui/icons-material/Quiz';
import DashboardIcon          from '@mui/icons-material/Dashboard';
import BarChartIcon           from '@mui/icons-material/BarChart';
import ScheduleIcon           from '@mui/icons-material/Schedule';

/* ─── Google Fonts ─────────────────────────────────────────────────────── */
const _fl = document.createElement('link');
_fl.rel  = 'stylesheet';
_fl.href = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
document.head.appendChild(_fl);

/* ─── Global styles ─────────────────────────────────────────────────────── */
const _gs = document.createElement('style');
_gs.textContent = `
  :root {
    --ink:       #111827;
    --ink-2:     #374151;
    --ink-3:     #6B7280;
    --ink-4:     #9CA3AF;
    --ink-5:     #D1D5DB;
    --paper:     #FFFFFF;
    --paper-2:   #F9FAFB;
    --paper-3:   #F3F4F6;
    --amber:     #D97706;
    --amber-l:   #FEF3C7;
    --amber-m:   #FDE68A;
    --green:     #059669;
    --green-l:   #D1FAE5;
    --red:       #DC2626;
    --red-l:     #FEE2E2;
    --blue:      #2563EB;
    --blue-l:    #EFF6FF;
    --sidebar-w: 240px;
    --shadow-sm: 0 1px 6px rgba(17,24,39,0.08);
    --shadow-md: 0 4px 16px rgba(17,24,39,0.10);
    --r:         14px;
    --r-sm:      10px;
    /* iOS safe area */
    --sat: env(safe-area-inset-top,    0px);
    --sab: env(safe-area-inset-bottom, 0px);
    --sal: env(safe-area-inset-left,   0px);
    --sar: env(safe-area-inset-right,  0px);
  }

  /* ── Reset ── */
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }

  /* ── iOS tap highlight removal ── */
  * { -webkit-tap-highlight-color: transparent; }

  /* ── Viewport fix for iOS Safari's shrinking toolbar ── */
  body {
    background: var(--paper-2) !important;
    /* dvh gives the real visible height on iOS; fall back to svh then vh */
    min-height: 100dvh;
    min-height: 100svh;
    min-height: 100vh;
  }

  /* ── Smooth scrolling on iOS ── */
  .sd-scroll {
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
  }

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--ink-5); border-radius: 99px; }

  @keyframes sd-up {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes sd-pulse { 0%,100%{opacity:1} 50%{opacity:.5} }

  .sd-up { animation: sd-up .38s ease both; }
  .sd-card {
    background: var(--paper);
    border: 1px solid #E5E7EB;
    border-radius: var(--r);
    box-shadow: var(--shadow-sm);
  }
  .sd-row-hover { transition: background .12s; }
  .sd-row-hover:hover { background: var(--paper-3) !important; }

  /* Sidebar nav item */
  .sn-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px; border-radius: 10px;
    cursor: pointer; text-decoration: none;
    transition: all .15s; position: relative;
    color: rgba(255,255,255,0.5);
    user-select: none;
    /* min 44px touch target */
    min-height: 44px;
  }
  .sn-item:hover  { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.9); }
  .sn-item.active { background: rgba(255,255,255,0.11); color: #fff; box-shadow: inset 3px 0 0 #D97706; }
  .sn-item.active .sn-label { font-weight: 700 !important; }

  /* Link card */
  .sd-link-card {
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    padding: 20px 12px; border-radius: var(--r); border: 1px solid #E5E7EB;
    background: #fff; text-decoration: none; cursor: pointer; transition: all .15s;
    /* 44px min touch target is covered by padding */
  }
  .sd-link-card:hover { background: var(--blue-l); border-color: #BFDBFE; transform: translateY(-2px); box-shadow: var(--shadow-md); }

  /* Quiz row — min 52px so it's easy to tap on mobile */
  .sd-quiz-row {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 16px; border-radius: var(--r-sm);
    text-decoration: none; transition: all .15s;
    min-height: 52px;
  }
  .sd-quiz-row:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(17,24,39,0.10); }

  /* ── Mobile top bar: accounts for notch/Dynamic Island ── */
  .mob-topbar {
    /* Push content below status bar on iOS */
    padding-top: var(--sat);
  }

  /* ── Bottom tab bar: pushes above home indicator ── */
  .mob-tabbar {
    /* Extra space for iOS home indicator */
    padding-bottom: var(--sab);
  }

  /* ── Content scroll area on mobile: clears fixed topbar + tabbar ── */
  .mob-content {
    /* 54px top bar + safe-area-top already on bar,
       62px tab bar + safe-area-bottom */
    padding-bottom: calc(62px + var(--sab) + 8px);
  }
`;
document.head.appendChild(_gs);

/* ─── Design tokens ─────────────────────────────────────────────────────── */
const T = {
  ink:'#111827', ink2:'#374151', ink3:'#6B7280', ink4:'#9CA3AF', ink5:'#D1D5DB',
  paper:'#FFFFFF', paper2:'#F9FAFB', paper3:'#F3F4F6',
  amber:'#D97706', amberL:'#FEF3C7', amberM:'#FDE68A',
  green:'#059669', greenL:'#D1FAE5',
  red:'#DC2626', redL:'#FEE2E2',
  blue:'#2563EB', blueL:'#EFF6FF',
  border:'#E5E7EB',
};
const SIDEBAR_W = 240;
const BASE = '%REACT_APP_API_URL%';

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const getInitials = s => s ? `${s.firstName?.[0]??''}${s.lastName?.[0]??''}`.toUpperCase() : '?';
const fmtDate  = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtShort = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) : '—';
const daysUntil = d => d ? Math.ceil((new Date(d)-new Date())/86_400_000) : null;

const dueStatus = dueDate => {
  const days = daysUntil(dueDate);
  if (days===null)  return {label:'No due date', color:T.ink4, bg:T.paper3};
  if (days<0)       return {label:'Overdue',     color:T.red,  bg:T.redL};
  if (days===0)     return {label:'Due today',   color:T.amber,bg:T.amberL};
  if (days<=3)      return {label:`${days}d left`,color:T.amber,bg:T.amberL};
  return                   {label:`${days}d left`,color:T.green,bg:T.greenL};
};

const resultBadge = sub => {
  if (!sub)          return {label:'Not submitted',  color:T.ink4, bg:T.paper3,icon:null};
  if (!sub.gradedAt) return {label:'Awaiting review',color:T.amber,bg:T.amberL,icon:'pending'};
  const pct = parseFloat(sub.percentage)||0;
  return {
    label:`${pct.toFixed(1)}%  (${sub.marksObtained}/${sub.totalMarks??'?'})`,
    color:pct>=75?T.green:pct>=50?T.amber:T.red,
    bg:pct>=75?T.greenL:pct>=50?T.amberL:T.redL,
    icon:'graded', pct,
  };
};

const gradeLabel = pct => {
  if (pct>=80) return {text:'Outstanding',color:T.green};
  if (pct>=70) return {text:'Great work', color:T.green};
  if (pct>=60) return {text:'Good job',   color:T.amber};
  if (pct>=50) return {text:'Keep going', color:T.amber};
  return              {text:'Needs work', color:T.red};
};

/* ─── Micro-components ───────────────────────────────────────────────────── */
const Pill = ({label,color,bg,icon}) => (
  <Box sx={{display:'inline-flex',alignItems:'center',gap:'4px',px:1.25,py:'4px',borderRadius:'6px',background:bg}}>
    {icon==='graded'  && <EmojiEventsIcon   sx={{fontSize:11,color}}/>}
    {icon==='pending' && <HourglassEmptyIcon sx={{fontSize:11,color}}/>}
    <Typography sx={{
      /* FIX: minimum 11px (0.69rem) for mobile legibility */
      fontSize:{xs:'0.72rem',md:'0.68rem'},
      fontWeight:700,color,letterSpacing:'0.01em',whiteSpace:'nowrap',
      fontFamily:"'Plus Jakarta Sans',sans-serif",
    }}>{label}</Typography>
  </Box>
);

const Card = ({title,aside,children,delay=0,sx:sxProp={}}) => (
  <Box className="sd-card sd-up" sx={{overflow:'hidden',animationDelay:`${delay}ms`,...sxProp}}>
    <Box sx={{px:2.5,py:1.75,display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:`1px solid ${T.border}`,background:T.paper2}}>
      <Typography sx={{
        fontWeight:700,
        /* FIX: slightly larger on mobile for readability */
        fontSize:{xs:'0.8rem',md:'0.75rem'},
        color:T.ink3,fontFamily:"'Plus Jakarta Sans',sans-serif",letterSpacing:'0.07em',textTransform:'uppercase',
      }}>{title}</Typography>
      {aside}
    </Box>
    {children}
  </Box>
);

const StatTile = ({icon,label,value,sub,accent,delay=0}) => (
  <Box className="sd-card sd-up" sx={{p:{xs:1.75,md:2},display:'flex',alignItems:'center',gap:1.75,animationDelay:`${delay}ms`,flex:'1 1 120px',minWidth:0}}>
    <Box sx={{width:40,height:40,borderRadius:'10px',background:`${accent}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
      {React.cloneElement(icon,{sx:{color:accent,fontSize:20}})}
    </Box>
    <Box sx={{minWidth:0}}>
      <Typography sx={{fontSize:{xs:'1.3rem',md:'1.4rem'},fontWeight:800,color:T.ink,lineHeight:1,fontFamily:"'Fraunces',serif"}}>{value??'—'}</Typography>
      {/* FIX: 0.75rem minimum on mobile (was 0.67rem) */}
      <Typography sx={{fontSize:{xs:'0.75rem',md:'0.68rem'},color:T.ink3,mt:'3px',fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{label}</Typography>
      {sub && <Typography sx={{fontSize:{xs:'0.72rem',md:'0.62rem'},color:accent,fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,mt:'2px'}}>{sub}</Typography>}
    </Box>
  </Box>
);

/* ── Mobile assignment card ── */
const AssignmentCard = ({a,sub}) => {
  const ds=dueStatus(a.dueDate), rb=resultBadge(sub);
  const overdue=daysUntil(a.dueDate)!==null&&daysUntil(a.dueDate)<0&&!sub;
  return (
    <Box sx={{p:2,borderRadius:'var(--r)',border:`1.5px solid ${overdue?'#FECACA':T.border}`,background:overdue?'#FFF8F8':T.paper,mb:1.25}}>
      <Box sx={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',mb:1}}>
        <Box sx={{flex:1,mr:1.5}}>
          {/* FIX: 0.9rem on mobile for legibility */}
          <Typography sx={{fontWeight:700,fontSize:{xs:'0.92rem',md:'0.88rem'},color:T.ink,fontFamily:"'Plus Jakarta Sans',sans-serif",lineHeight:1.4}}>{a.title}</Typography>
          <Typography sx={{fontSize:{xs:'0.78rem',md:'0.7rem'},color:T.ink3,fontFamily:"'Plus Jakarta Sans',sans-serif",mt:'4px'}}>{a.subjectName??'—'}{a.className?` · ${a.className}`:''}</Typography>
        </Box>
        <Pill label={ds.label} color={ds.color} bg={ds.bg}/>
      </Box>
      <Box sx={{display:'flex',alignItems:'center',justifyContent:'space-between',mt:1.5}}>
        <Pill label={rb.label} color={rb.color} bg={rb.bg} icon={rb.icon}/>
        <Box sx={{display:'flex',alignItems:'center',gap:1.5}}>
          <Typography sx={{fontSize:{xs:'0.75rem',md:'0.7rem'},color:T.ink4,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{fmtShort(a.dueDate)}</Typography>
          {/* FIX: min 36px height touch target */}
          <Box component="a" href={`/assignments/${a.id}`}
            sx={{px:1.75,py:'7px',borderRadius:'8px',background:T.blueL,color:T.blue,fontSize:{xs:'0.78rem',md:'0.73rem'},fontWeight:700,textDecoration:'none',fontFamily:"'Plus Jakarta Sans',sans-serif",minHeight:36,display:'flex',alignItems:'center'}}>
            Open
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

/* ════════════════════════════════════════════════════════════
   SIDEBAR (desktop only — hidden on mobile)
════════════════════════════════════════════════════════════ */
function Sidebar({student,desktopTab,setDesktopTab,overdueCount,pendingQuizzesCount,avgMark,gradeId,onLogout}) {
  const NAV = [
    {key:'overview',   label:'Overview',    icon:<DashboardIcon  sx={{fontSize:17}}/>},
    {key:'assignments',label:'Assignments', icon:<AssignmentIcon sx={{fontSize:17}}/>, badge:overdueCount},
    {key:'quizzes',    label:'Quizzes',     icon:<QuizIcon       sx={{fontSize:17}}/>, badge:pendingQuizzesCount},
    {key:'results',    label:'Results',     icon:<BarChartIcon   sx={{fontSize:17}}/>},
    {key:'deadlines',  label:'Deadlines',   icon:<ScheduleIcon   sx={{fontSize:17}}/>},
  ];
  const LINKS = [
    {label:'Class Chat', icon:<ChatBubbleOutlineIcon sx={{fontSize:15}}/>, href:`/classroom-chat/${gradeId}`},
    {label:'Timetable',  icon:<CalendarMonthIcon    sx={{fontSize:15}}/>, href:'/student/timetable'},
  ];
  return (
    <Box sx={{width:SIDEBAR_W,flexShrink:0,background:T.ink,display:{xs:'none',md:'flex'},flexDirection:'column',position:'fixed',top:0,left:0,bottom:0,zIndex:200,borderRight:'1px solid rgba(255,255,255,0.06)',overflowY:'auto',overflowX:'hidden'}}>
      <Box sx={{px:2.25,pt:2.5,pb:2,borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
        <Box sx={{display:'flex',alignItems:'center',gap:1.25}}>
          <Box sx={{width:32,height:32,borderRadius:'9px',background:T.amber,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <MenuBookIcon sx={{color:T.ink,fontSize:16}}/>
          </Box>
          <Box>
            <Typography sx={{color:'#fff',fontWeight:700,fontSize:'0.88rem',fontFamily:"'Plus Jakarta Sans',sans-serif",lineHeight:1.2}}>Student Portal</Typography>
            <Typography sx={{color:'rgba(255,255,255,0.28)',fontSize:'0.6rem',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Learning Management</Typography>
          </Box>
        </Box>
      </Box>
      {student && (
        <Box sx={{mx:1.5,mt:2,mb:0.5,p:1.5,borderRadius:'12px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
          <Box sx={{display:'flex',alignItems:'center',gap:1.25}}>
            <Avatar sx={{width:34,height:34,fontSize:'0.72rem',fontWeight:800,background:T.amber,color:T.ink,fontFamily:"'Fraunces',serif",flexShrink:0}}>{getInitials(student)}</Avatar>
            <Box sx={{minWidth:0}}>
              <Typography sx={{color:'#fff',fontSize:'0.8rem',fontWeight:700,fontFamily:"'Plus Jakarta Sans',sans-serif",overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{student.firstName} {student.lastName}</Typography>
              <Typography sx={{color:'rgba(255,255,255,0.32)',fontSize:'0.63rem',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{student.grade}{student.stream?` · ${student.stream}`:''}</Typography>
            </Box>
          </Box>
          {avgMark!=null && (
            <Box sx={{mt:1.5}}>
              <Box sx={{display:'flex',justifyContent:'space-between',mb:'5px'}}>
                <Typography sx={{fontSize:'0.59rem',color:'rgba(255,255,255,0.3)',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Average</Typography>
                <Typography sx={{fontSize:'0.59rem',color:T.amber,fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700}}>{avgMark}%</Typography>
              </Box>
              <Box sx={{height:4,borderRadius:99,background:'rgba(255,255,255,0.1)',overflow:'hidden'}}>
                <Box sx={{height:'100%',width:`${avgMark}%`,borderRadius:99,background:avgMark>=75?T.green:avgMark>=50?T.amber:T.red,transition:'width .6s ease'}}/>
              </Box>
            </Box>
          )}
        </Box>
      )}
      <Typography sx={{px:2.25,pt:2,pb:0.5,fontSize:'0.58rem',fontWeight:700,color:'rgba(255,255,255,0.2)',letterSpacing:'0.13em',textTransform:'uppercase',fontFamily:"'Plus Jakarta Sans',sans-serif",flexShrink:0}}>Menu</Typography>
      <Box sx={{px:1.25,display:'flex',flexDirection:'column',gap:'2px',flexShrink:0}}>
        {NAV.map(item=>(
          <Box key={item.key} className={`sn-item${desktopTab===item.key?' active':''}`} onClick={()=>setDesktopTab(item.key)}>
            <Box sx={{color:'inherit',display:'flex',flexShrink:0}}>{item.icon}</Box>
            <Typography className="sn-label" sx={{fontSize:'0.82rem',fontWeight:500,fontFamily:"'Plus Jakarta Sans',sans-serif",flex:1,color:'inherit'}}>{item.label}</Typography>
            {item.badge>0&&<Box sx={{minWidth:18,height:18,borderRadius:'9px',background:item.key==='quizzes'?'#7C3AED':T.red,display:'flex',alignItems:'center',justifyContent:'center',px:'3px'}}><Typography sx={{fontSize:'0.52rem',fontWeight:800,color:'#fff',lineHeight:1}}>{item.badge}</Typography></Box>}
          </Box>
        ))}
      </Box>
      <Typography sx={{px:2.25,pt:2.25,pb:0.5,fontSize:'0.58rem',fontWeight:700,color:'rgba(255,255,255,0.2)',letterSpacing:'0.13em',textTransform:'uppercase',fontFamily:"'Plus Jakarta Sans',sans-serif",flexShrink:0}}>Quick Access</Typography>
      <Box sx={{px:1.25,display:'flex',flexDirection:'column',gap:'2px',flexShrink:0}}>
        {LINKS.map(link=>(
          <Box key={link.label} component="a" href={link.href} className="sn-item" sx={{textDecoration:'none'}}>
            <Box sx={{color:'inherit',display:'flex',flexShrink:0}}>{link.icon}</Box>
            <Typography sx={{fontSize:'0.82rem',fontWeight:500,fontFamily:"'Plus Jakarta Sans',sans-serif",color:'inherit'}}>{link.label}</Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{flex:1}}/>
      {overdueCount>0&&<Box sx={{mx:1.5,mb:1.5,p:1.5,borderRadius:'10px',background:'rgba(220,38,38,0.14)',border:'1px solid rgba(220,38,38,0.22)',animation:'sd-pulse 2.5s ease infinite',flexShrink:0}}>
        <Box sx={{display:'flex',alignItems:'center',gap:1}}><AccessTimeIcon sx={{fontSize:13,color:'#FCA5A5',flexShrink:0}}/><Typography sx={{fontSize:'0.7rem',fontWeight:700,color:'#FCA5A5',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{overdueCount} overdue</Typography></Box>
        <Typography sx={{fontSize:'0.6rem',color:'rgba(252,165,165,0.6)',fontFamily:"'Plus Jakarta Sans',sans-serif",mt:'3px'}}>Click Assignments to review</Typography>
      </Box>}
      <Box sx={{px:1.25,pb:2.5,borderTop:'1px solid rgba(255,255,255,0.07)',pt:1.5,flexShrink:0}}>
        <Box className="sn-item" onClick={onLogout}><LogoutIcon sx={{fontSize:16,color:'inherit'}}/><Typography sx={{fontSize:'0.82rem',fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:500,color:'inherit'}}>Log Out</Typography></Box>
      </Box>
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
export default function StudentDashboard() {
  const [student,        setStudent]        = useState(null);
  const [assignments,    setAssignments]    = useState([]);
  const [submissionsMap, setSubmissionsMap] = useState({});
  const [quizzes,        setQuizzes]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [mobileTab,      setMobileTab]      = useState('home');
  const [desktopTab,     setDesktopTab]     = useState('overview');
  const navigate = useNavigate();

  const gradeId = student ? `grade-${(student.grade||'').replace(/[^0-9]/g,'')}` : 'grade-unknown';

  useEffect(()=>{
    const token = localStorage.getItem('studentToken');
    if (!token){navigate('/student-login');return;}
    const headers = {Authorization:`Bearer ${token}`};
    (async()=>{
      try {
        const [pRes,aRes,sRes,qRes] = await Promise.all([
          fetch(`${BASE}/api/student/me`,          {headers}),
          fetch(`${BASE}/api/student/assignments`, {headers}),
          fetch(`${BASE}/api/student/submissions`, {headers}),
          fetch(`${BASE}/api/student/quizzes`,     {headers}),
        ]);
        if (pRes.status===401){localStorage.removeItem('studentToken');navigate('/student-login');return;}
        if (pRes.ok) setStudent(await pRes.json());
        if (aRes.ok) setAssignments(await aRes.json());
        if (sRes.ok){
          const subs=await sRes.json(),map={};
          subs.forEach(s=>{map[String(s.assignmentId)]=s;});
          setSubmissionsMap(map);
        }
        if (qRes?.ok) setQuizzes(await qRes.json());
      } catch(e){console.error(e);}
      finally{setLoading(false);}
    })();
  },[navigate]);

  const handleLogout = ()=>{localStorage.removeItem('studentToken');navigate('/student-login');};

  /* ── Derived ── */
  const overdueCount      = assignments.filter(a=>{const d=daysUntil(a.dueDate);return d!==null&&d<0&&!submissionsMap[String(a.id)];}).length;
  const dueSoonCount      = assignments.filter(a=>{const d=daysUntil(a.dueDate);return d!==null&&d>=0&&d<=3;}).length;
  const gradedSubs        = Object.values(submissionsMap).filter(s=>s.gradedAt&&s.percentage!=null);
  const avgMark           = gradedSubs.length>0 ? Math.round(gradedSubs.reduce((s,x)=>s+parseFloat(x.percentage),0)/gradedSubs.length) : null;
  const sortedAssignments = [...assignments].sort((a,b)=>new Date(a.dueDate??0)-new Date(b.dueDate??0));
  const pendingDeadlines  = assignments.filter(a=>{const d=daysUntil(a.dueDate);return d!==null&&d>=0&&!submissionsMap[String(a.id)];}).sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate));
  const pendingQuizzes    = quizzes.filter(q=>!q.submittedAt);

  if (loading) return (
    <Box sx={{minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:T.paper2,flexDirection:'column',gap:2}}>
      <CircularProgress size={30} thickness={4} sx={{color:T.amber}}/>
      <Typography sx={{color:T.ink3,fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'0.9rem'}}>Loading your portal…</Typography>
    </Box>
  );

  /* ── Mobile tab config ── */
  const MOBILE_TABS = [
    {key:'home',   icon:<HomeIcon/>,       label:'Home',   badge:0},
    {key:'tasks',  icon:<AssignmentIcon/>, label:'Tasks',  badge:overdueCount},
    {key:'quizzes',icon:<QuizIcon/>,       label:'Quizzes',badge:pendingQuizzes.length},
    {key:'grades', icon:<EmojiEventsIcon/>,label:'Grades', badge:0},
    {key:'more',   icon:<MoreHorizIcon/>,  label:'More',   badge:0},
  ];

  /* ════ MOBILE PANELS ════ */

  const MobileHome = ()=>(
    <Box sx={{display:'flex',flexDirection:'column',gap:2}}>
      {/* Stat 2×2 */}
      <Box sx={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1.25}}>
        <StatTile icon={<AssignmentIcon/>} label="Assignments"     value={assignments.length}                    accent={T.blue}  delay={0}/>
        <StatTile icon={<AccessTimeIcon/>} label="Due Soon"        value={dueSoonCount}                          accent={T.amber} delay={50}/>
        <StatTile icon={<TrendingUpIcon/>} label="Avg Mark"        value={avgMark!=null?`${avgMark}%`:'—'}       accent={T.green} delay={100} sub={avgMark!=null?gradeLabel(avgMark).text:null}/>
        <StatTile icon={<QuizIcon/>}       label="Quizzes Pending" value={pendingQuizzes.length}                accent="#7C3AED" delay={150}/>
      </Box>

      {/* Overdue alert */}
      {overdueCount>0&&(
        <Box sx={{p:2,borderRadius:'var(--r)',background:T.redL,border:'1px solid #FECACA',display:'flex',alignItems:'center',gap:1.5}}>
          <AccessTimeIcon sx={{color:T.red,fontSize:22,flexShrink:0}}/>
          <Box>
            <Typography sx={{fontWeight:700,fontSize:'0.9rem',color:T.red,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{overdueCount} overdue assignment{overdueCount!==1?'s':''}</Typography>
            <Typography sx={{fontSize:'0.78rem',color:T.red,opacity:.75,mt:'3px',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Tap Tasks to catch up</Typography>
          </Box>
        </Box>
      )}

      {/* Pending quizzes */}
      {pendingQuizzes.length>0&&(
        <Card title={`Quizzes to Attempt (${pendingQuizzes.length})`} aside={
          <Box onClick={()=>setMobileTab('quizzes')} sx={{px:1.25,py:'5px',borderRadius:'6px',background:'#EDE9FE',cursor:'pointer',minHeight:32,display:'flex',alignItems:'center'}}>
            <Typography sx={{fontSize:'0.75rem',fontWeight:700,color:'#7C3AED',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>View all</Typography>
          </Box>}>
          <Box sx={{p:1.5,display:'flex',flexDirection:'column',gap:1}}>
            {pendingQuizzes.slice(0,3).map(q=>(
              <Box key={q.id} component="a" href={`/student/quiz/${q.id}`} className="sd-quiz-row" sx={{background:'#F5F3FF',border:'1px solid #DDD6FE',color:'inherit'}}>
                <QuizIcon sx={{fontSize:20,color:'#7C3AED',flexShrink:0}}/>
                <Box sx={{flex:1,minWidth:0}}>
                  <Typography sx={{fontSize:'0.88rem',fontWeight:700,color:'#5B21B6',fontFamily:"'Plus Jakarta Sans',sans-serif",overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{q.title}</Typography>
                  <Typography sx={{fontSize:'0.75rem',color:T.ink3,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{q.subjectName} · {q.total_questions} Q</Typography>
                </Box>
                <Box sx={{px:1.5,py:'7px',borderRadius:'7px',background:'#7C3AED',minHeight:34,display:'flex',alignItems:'center'}}>
                  <Typography sx={{fontSize:'0.75rem',fontWeight:700,color:'#fff',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Start</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Card>
      )}

      {/* Upcoming deadlines */}
      <Card title="Upcoming Deadlines">
        <Box sx={{p:1.5,display:'flex',flexDirection:'column',gap:1}}>
          {pendingDeadlines.length===0
            ?<Typography sx={{color:T.ink4,fontSize:'0.85rem',textAlign:'center',py:3,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>No pending deadlines</Typography>
            :pendingDeadlines.slice(0,4).map(a=>{
              const days=daysUntil(a.dueDate),urgent=days<=3;
              return(
                <Box key={a.id} sx={{display:'flex',alignItems:'center',gap:1.5,px:2,py:1.5,borderRadius:'var(--r-sm)',background:urgent?T.amberL:T.paper3,border:`1px solid ${urgent?T.amberM:T.border}`,minHeight:56}}>
                  <Box sx={{width:40,height:40,borderRadius:'9px',background:urgent?T.amberM:T.blueL,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <Typography sx={{fontSize:'0.72rem',fontWeight:800,color:urgent?T.amber:T.blue,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{days===0?'NOW':`${days}d`}</Typography>
                  </Box>
                  <Box sx={{flex:1,minWidth:0}}>
                    <Typography sx={{fontSize:'0.88rem',fontWeight:600,color:T.ink,fontFamily:"'Plus Jakarta Sans',sans-serif",overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.title}</Typography>
                    <Typography sx={{fontSize:'0.75rem',color:T.ink3,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{a.subjectName}</Typography>
                  </Box>
                </Box>
              );
            })}
        </Box>
      </Card>

      {/* Quick actions */}
      <Box sx={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1.25}}>
        {[
          {label:'Class Chat',  icon:<ChatBubbleOutlineIcon sx={{fontSize:24,color:T.blue}}/>, href:`/classroom-chat/${gradeId}`},
          {label:'My Timetable',icon:<CalendarMonthIcon    sx={{fontSize:24,color:T.blue}}/>, href:'/student/timetable'},
        ].map(link=>(
          <Box key={link.label} component="a" href={link.href} className="sd-link-card">
            {link.icon}
            <Typography sx={{fontSize:'0.82rem',fontWeight:600,color:T.ink,fontFamily:"'Plus Jakarta Sans',sans-serif",textAlign:'center'}}>{link.label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );

  const MobileTasks = ()=>(
    <Box>
      <Typography sx={{fontSize:'0.72rem',fontWeight:700,color:T.ink4,textTransform:'uppercase',letterSpacing:'0.09em',mb:1.5,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
        {assignments.length} assignment{assignments.length!==1?'s':''} · by due date
      </Typography>
      {sortedAssignments.length===0
        ?<Box sx={{textAlign:'center',py:7}} className="sd-card"><CheckCircleOutlineIcon sx={{fontSize:44,color:T.ink5,mb:1.5}}/><Typography sx={{color:T.ink3,fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:600,fontSize:'0.95rem'}}>No assignments right now</Typography></Box>
        :sortedAssignments.map(a=><AssignmentCard key={a.id} a={a} sub={submissionsMap[String(a.id)]||null}/>)}
    </Box>
  );

  const MobileGrades = ()=>(
    <Box sx={{display:'flex',flexDirection:'column',gap:2}}>
      {avgMark!=null&&(
        <Box sx={{background:T.ink,borderRadius:'var(--r)',p:2.5,display:'flex',alignItems:'center',gap:2.5}}>
          <Box sx={{width:68,height:68,borderRadius:'50%',border:`3px solid ${T.amber}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0,background:'rgba(255,255,255,0.05)'}}>
            <Typography sx={{color:T.amber,fontWeight:800,fontSize:'1.4rem',fontFamily:"'Fraunces',serif",lineHeight:1}}>{avgMark}</Typography>
            <Typography sx={{color:'rgba(255,255,255,0.4)',fontSize:'0.65rem',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>avg %</Typography>
          </Box>
          <Box>
            <Typography sx={{color:'rgba(255,255,255,0.4)',fontSize:'0.68rem',fontWeight:700,fontFamily:"'Plus Jakarta Sans',sans-serif",textTransform:'uppercase',letterSpacing:'0.1em',mb:.5}}>Overall Average</Typography>
            <Typography sx={{color:'#fff',fontSize:'1rem',fontWeight:700,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{gradeLabel(avgMark).text}</Typography>
            <Typography sx={{color:'rgba(255,255,255,0.3)',fontSize:'0.75rem',fontFamily:"'Plus Jakarta Sans',sans-serif",mt:'4px'}}>{gradedSubs.length} graded submission{gradedSubs.length!==1?'s':''}</Typography>
          </Box>
        </Box>
      )}
      <RecentResultsSection gradedSubs={gradedSubs} assignments={assignments}/>
    </Box>
  );

  const MobileQuizzes = ()=>(
    <Box sx={{display:'flex',flexDirection:'column',gap:2}}>
      <Box sx={{display:'flex',gap:1.25}}>
        <Box sx={{flex:1,p:2.5,borderRadius:'var(--r)',background:'#F5F3FF',border:'1px solid #DDD6FE',textAlign:'center'}}>
          <Typography sx={{fontWeight:800,fontSize:'1.6rem',color:'#7C3AED',fontFamily:"'Fraunces',serif"}}>{pendingQuizzes.length}</Typography>
          <Typography sx={{fontSize:'0.78rem',color:T.ink3,fontFamily:"'Plus Jakarta Sans',sans-serif",mt:'3px'}}>Pending</Typography>
        </Box>
        <Box sx={{flex:1,p:2.5,borderRadius:'var(--r)',background:T.greenL,border:'1px solid #A7F3D0',textAlign:'center'}}>
          <Typography sx={{fontWeight:800,fontSize:'1.6rem',color:T.green,fontFamily:"'Fraunces',serif"}}>{quizzes.length-pendingQuizzes.length}</Typography>
          <Typography sx={{fontSize:'0.78rem',color:T.ink3,fontFamily:"'Plus Jakarta Sans',sans-serif",mt:'3px'}}>Completed</Typography>
        </Box>
      </Box>
      <QuizzesSection quizzes={quizzes}/>
    </Box>
  );

  /* FIX: MobileMore now includes quick links + profile + logout */
  const MobileMore = ()=>(
    <Box sx={{display:'flex',flexDirection:'column',gap:2}}>
      {/* Profile card */}
      {student&&(
        <Box className="sd-card" sx={{p:2.5,display:'flex',alignItems:'center',gap:2}}>
          <Avatar sx={{width:52,height:52,fontSize:'1rem',fontWeight:800,background:T.ink,color:T.amber,fontFamily:"'Fraunces',serif",flexShrink:0}}>{getInitials(student)}</Avatar>
          <Box>
            <Typography sx={{fontWeight:700,fontSize:'1rem',color:T.ink,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{student.firstName} {student.lastName}</Typography>
            <Typography sx={{fontSize:'0.78rem',color:T.ink3,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{student.grade}{student.stream?` · ${student.stream}`:''}</Typography>
            {avgMark!=null&&<Box sx={{mt:1}}>
              <Box sx={{display:'flex',justifyContent:'space-between',mb:'4px'}}>
                <Typography sx={{fontSize:'0.7rem',color:T.ink4,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Average</Typography>
                <Typography sx={{fontSize:'0.7rem',color:avgMark>=75?T.green:avgMark>=50?T.amber:T.red,fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700}}>{avgMark}%</Typography>
              </Box>
              <Box sx={{height:5,borderRadius:99,background:T.paper3,overflow:'hidden'}}>
                <Box sx={{height:'100%',width:`${avgMark}%`,borderRadius:99,background:avgMark>=75?T.green:avgMark>=50?T.amber:T.red}}/>
              </Box>
            </Box>}
          </Box>
        </Box>
      )}

      {/* Quick links grid */}
      <Card title="Quick Links">
        <Box sx={{p:1.75,display:'grid',gridTemplateColumns:'1fr 1fr',gap:1}}>
          {[
            {label:'Timetable', icon:<CalendarMonthIcon    sx={{fontSize:22,color:T.blue}}/>, href:'/student/timetable', disabled:false},
            {label:'Class Chat', icon:<ChatBubbleOutlineIcon sx={{fontSize:22,color:T.blue}}/>, href:`/classroom-chat/${gradeId}`, disabled:false},
            {label:'My Profile', icon:<GradeIcon             sx={{fontSize:22,color:T.ink4}}/>, href:'#', disabled:true},
            {label:'Messages',   icon:<MenuBookIcon          sx={{fontSize:22,color:T.ink4}}/>, href:'#', disabled:true},
          ].map(link=>(
            <Box key={link.label}
              component={link.disabled?'div':'a'} href={link.href}
              className={link.disabled?'':' sd-link-card'}
              sx={link.disabled?{display:'flex',flexDirection:'column',alignItems:'center',gap:1,p:'18px 12px',borderRadius:'var(--r)',border:`1px solid ${T.border}`,background:T.paper2,opacity:.4,cursor:'not-allowed'}:{}}>
              {link.icon}
              <Typography sx={{fontSize:'0.78rem',fontWeight:600,color:link.disabled?T.ink4:T.ink,fontFamily:"'Plus Jakarta Sans',sans-serif",textAlign:'center'}}>{link.label}</Typography>
              {link.disabled&&<Typography sx={{fontSize:'0.65rem',color:T.ink4,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Coming soon</Typography>}
            </Box>
          ))}
        </Box>
      </Card>

      {/* Logout — full-width, tall touch target */}
      <Button fullWidth onClick={handleLogout} startIcon={<LogoutIcon sx={{fontSize:18}}/>}
        sx={{background:T.redL,color:T.red,textTransform:'none',fontWeight:700,fontSize:'0.92rem',borderRadius:'var(--r)',py:1.5,fontFamily:"'Plus Jakarta Sans',sans-serif",'&:hover':{background:'#FEE2E2'}}}>
        Log Out
      </Button>
    </Box>
  );

  /* ════ DESKTOP OVERVIEW ════ */
  const DesktopOverview = ()=>(
    <Box sx={{display:'grid',gridTemplateColumns:'1fr 320px',gap:2.5,alignItems:'start'}}>
      <Box sx={{display:'flex',flexDirection:'column',gap:2.5}}>
        <AssignmentsSection sortedAssignments={sortedAssignments} submissionsMap={submissionsMap} assignments={assignments}/>
        {avgMark!=null&&(
          <Card title="Performance" delay={200}>
            <Box sx={{p:2.5}}>
              <Box sx={{display:'flex',justifyContent:'space-between',mb:1.25}}>
                <Typography sx={{fontSize:'0.82rem',color:T.ink3,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Average across {gradedSubs.length} graded</Typography>
                <Typography sx={{fontSize:'1.05rem',fontWeight:800,color:avgMark>=75?T.green:avgMark>=50?T.amber:T.red,fontFamily:"'Fraunces',serif"}}>{avgMark}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={avgMark} sx={{height:8,borderRadius:99,background:T.paper3,'& .MuiLinearProgress-bar':{background:avgMark>=75?T.green:avgMark>=50?T.amber:T.red,borderRadius:99}}}/>
              <Typography sx={{fontSize:'0.72rem',color:T.ink3,fontFamily:"'Plus Jakarta Sans',sans-serif",mt:1}}>{gradeLabel(avgMark).text}</Typography>
            </Box>
          </Card>
        )}
      </Box>
      <Box sx={{display:'flex',flexDirection:'column',gap:2}}>
        <QuizzesSection quizzes={quizzes}/>
        <RecentResultsSection gradedSubs={gradedSubs} assignments={assignments}/>
        <DeadlinesSection pendingDeadlines={pendingDeadlines}/>
      </Box>
    </Box>
  );

  /* ════ RENDER ════ */
  return (
    <Box sx={{
      /* FIX: dvh for correct iOS full-height */
      minHeight:'100dvh', minHeight:'100svh', minHeight:'100vh',
      background:T.paper2,fontFamily:"'Plus Jakarta Sans',sans-serif",display:'flex',
    }}>

      {/* Sidebar (desktop only) */}
      <Sidebar student={student} desktopTab={desktopTab} setDesktopTab={setDesktopTab}
        overdueCount={overdueCount} pendingQuizzesCount={pendingQuizzes.length}
        avgMark={avgMark} gradeId={gradeId} onLogout={handleLogout}/>

      {/* Main content */}
      <Box sx={{flex:1,ml:{xs:0,md:`${SIDEBAR_W}px`},minHeight:'100dvh',display:'flex',flexDirection:'column'}}>

        {/* Desktop topbar */}
        <Box sx={{display:{xs:'none',md:'flex'},alignItems:'center',justifyContent:'space-between',px:4,py:2.25,borderBottom:`1px solid ${T.border}`,background:T.paper,position:'sticky',top:0,zIndex:100,boxShadow:'0 1px 4px rgba(17,24,39,0.05)'}}>
          <Box>
            <Typography sx={{fontWeight:700,fontSize:'1.05rem',color:T.ink,fontFamily:"'Fraunces',serif",lineHeight:1.2}}>
              {desktopTab==='overview'?'Overview':desktopTab==='assignments'?'Assignments':desktopTab==='quizzes'?'Quizzes':desktopTab==='results'?'Results':'Deadlines'}
            </Typography>
            {student&&<Typography sx={{fontSize:'0.7rem',color:T.ink4,fontFamily:"'Plus Jakarta Sans',sans-serif",mt:'2px'}}>Welcome back, {student.firstName}</Typography>}
          </Box>
          <Box sx={{display:'flex',alignItems:'center',gap:1.5}}>
            {overdueCount>0&&<Box onClick={()=>setDesktopTab('assignments')} sx={{display:'flex',alignItems:'center',gap:'6px',px:1.5,py:'6px',borderRadius:'8px',background:T.redL,border:`1px solid #FECACA`,cursor:'pointer',animation:'sd-pulse 2.5s ease infinite'}}><AccessTimeIcon sx={{color:T.red,fontSize:13}}/><Typography sx={{color:T.red,fontSize:'0.7rem',fontWeight:700,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{overdueCount} overdue</Typography></Box>}
            {avgMark!=null&&<Box sx={{display:'flex',alignItems:'center',gap:'6px',px:1.5,py:'6px',borderRadius:'8px',background:T.paper3,border:`1px solid ${T.border}`}}><TrendingUpIcon sx={{color:avgMark>=75?T.green:T.amber,fontSize:13}}/><Typography sx={{color:T.ink2,fontSize:'0.7rem',fontWeight:700,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{avgMark}% avg</Typography></Box>}
          </Box>
        </Box>

        {/* ── FIX: Mobile topbar with safe-area-inset-top for notch/Dynamic Island ── */}
        <Box className="mob-topbar" sx={{
          display:{xs:'flex',md:'none'},
          alignItems:'flex-end', /* content sits below the safe area */
          justifyContent:'space-between',
          px:2,
          pb:1.25,
          /* height adapts: 54px visible + safe area top */
          minHeight:'calc(54px + env(safe-area-inset-top, 0px))',
          background:T.ink,
          position:'sticky', top:0, zIndex:200,
          boxShadow:'0 2px 12px rgba(17,24,39,0.2)',
        }}>
          <Box sx={{display:'flex',alignItems:'center',gap:1}}>
            <Box sx={{width:28,height:28,borderRadius:'8px',background:T.amber,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <MenuBookIcon sx={{color:T.ink,fontSize:14}}/>
            </Box>
            <Typography sx={{color:'#fff',fontWeight:700,fontSize:'0.92rem',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Student Portal</Typography>
          </Box>
          {student&&(
            <Box sx={{display:'flex',alignItems:'center',gap:1}}>
              {overdueCount>0&&<Box sx={{px:1.25,py:'5px',borderRadius:'7px',background:'rgba(220,38,38,0.2)',border:'1px solid rgba(220,38,38,0.3)',display:'flex',alignItems:'center',gap:'5px',animation:'sd-pulse 2.5s ease infinite'}}>
                <AccessTimeIcon sx={{fontSize:12,color:'#FCA5A5'}}/><Typography sx={{fontSize:'0.7rem',fontWeight:700,color:'#FCA5A5',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{overdueCount}</Typography>
              </Box>}
              <Avatar sx={{width:32,height:32,fontSize:'0.68rem',fontWeight:800,background:T.amber,color:T.ink,fontFamily:"'Fraunces',serif"}}>{getInitials(student)}</Avatar>
            </Box>
          )}
        </Box>

        {/* Desktop stat row */}
        <Box sx={{display:{xs:'none',md:'grid'},gridTemplateColumns:'repeat(4,1fr)',gap:2,px:4,pt:3}}>
          <StatTile icon={<AssignmentIcon/>} label="Open Assignments" value={assignments.length}                    accent={T.blue}  delay={0}/>
          <StatTile icon={<AccessTimeIcon/>} label="Due This Week"    value={dueSoonCount}                          accent={T.amber} delay={60}/>
          <StatTile icon={<TrendingUpIcon/>} label="Average Mark"     value={avgMark!=null?`${avgMark}%`:'—'}       accent={T.green} delay={120} sub={avgMark!=null?gradeLabel(avgMark).text:null}/>
          <StatTile icon={<QuizIcon/>}       label="Pending Quizzes"  value={pendingQuizzes.length}                accent="#7C3AED" delay={180}/>
        </Box>

        {/* Desktop tab content */}
        <Box sx={{display:{xs:'none',md:'block'},px:4,py:3}}>
          {desktopTab==='overview'    && <DesktopOverview/>}
          {desktopTab==='assignments' && <AssignmentsSection sortedAssignments={sortedAssignments} submissionsMap={submissionsMap} assignments={assignments}/>}
          {desktopTab==='quizzes'     && <QuizzesSection quizzes={quizzes} fullWidth/>}
          {desktopTab==='results'     && <RecentResultsSection gradedSubs={gradedSubs} assignments={assignments} fullWidth/>}
          {desktopTab==='deadlines'   && <DeadlinesSection pendingDeadlines={pendingDeadlines} fullWidth/>}
        </Box>

        {/* ── FIX: Mobile content — sd-scroll for iOS smooth scroll, mob-content for safe bottom padding ── */}
        <Box className="sd-scroll mob-content" sx={{display:{xs:'block',md:'none'},px:2,pt:2,overflowY:'auto',flex:1}}>
          {mobileTab==='home'    && <MobileHome/>}
          {mobileTab==='tasks'   && <MobileTasks/>}
          {mobileTab==='quizzes' && <MobileQuizzes/>}
          {mobileTab==='grades'  && <MobileGrades/>}
          {mobileTab==='more'    && <MobileMore/>}
        </Box>
      </Box>

      {/* ── FIX: Mobile bottom tab bar — mob-tabbar adds env(safe-area-inset-bottom) ── */}
      <Box className="mob-tabbar" sx={{
        display:{xs:'flex',md:'none'},
        flexDirection:'column', /* column so safe-area padding extends below the tabs */
        position:'fixed', bottom:0, left:0, right:0,
        background:T.paper,
        borderTop:`1px solid ${T.border}`,
        zIndex:300,
        boxShadow:'0 -4px 18px rgba(17,24,39,0.08)',
      }}>
        {/* Tab items row */}
        <Box sx={{display:'flex',alignItems:'center',justifyContent:'space-around',height:62}}>
          {MOBILE_TABS.map(tab=>{
            const active=mobileTab===tab.key;
            return(
              <Box key={tab.key} onClick={()=>setMobileTab(tab.key)}
                sx={{
                  display:'flex',flexDirection:'column',alignItems:'center',gap:'3px',
                  flex:1, height:'100%', /* full row height = easy tap */
                  justifyContent:'center',
                  cursor:'pointer',position:'relative',
                  transition:'all .12s','&:active':{transform:'scale(0.88)'},
                }}>
                <Box sx={{position:'relative'}}>
                  {React.cloneElement(tab.icon,{sx:{fontSize:23,color:active?T.ink:T.ink4,transition:'color .15s'}})}
                  {tab.badge>0&&(
                    <Box sx={{position:'absolute',top:-3,right:-5,minWidth:15,height:15,borderRadius:'8px',background:tab.key==='quizzes'?'#7C3AED':T.red,border:`1.5px solid ${T.paper}`,display:'flex',alignItems:'center',justifyContent:'center',px:'2px'}}>
                      <Typography sx={{fontSize:'0.53rem',fontWeight:800,color:'#fff',lineHeight:1}}>{tab.badge}</Typography>
                    </Box>
                  )}
                </Box>
                {/* FIX: minimum 11px label */}
                <Typography sx={{fontSize:'0.68rem',fontWeight:active?700:500,fontFamily:"'Plus Jakarta Sans',sans-serif",color:active?T.ink:T.ink4,transition:'color .15s'}}>{tab.label}</Typography>
                {active&&<Box sx={{position:'absolute',bottom:0,width:22,height:2.5,borderRadius:'2px 2px 0 0',background:T.amber}}/>}
              </Box>
            );
          })}
        </Box>
        {/* FIX: Safe area spacer — fills the home indicator zone on iPhone */}
        <Box sx={{height:'env(safe-area-inset-bottom, 0px)',background:T.paper,flexShrink:0}}/>
      </Box>
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════
   SECTION COMPONENTS (unchanged)
════════════════════════════════════════════════════════════ */
function AssignmentsSection({sortedAssignments,submissionsMap,assignments}) {
  return (
    <Card title={`Assignments (${assignments.length})`}
      aside={<Typography sx={{fontSize:'0.65rem',color:T.ink4,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Sorted by due date</Typography>}
      delay={0}>
      {sortedAssignments.length===0
        ?<Box sx={{textAlign:'center',py:7}}><CheckCircleOutlineIcon sx={{fontSize:40,color:'#E5E7EB',mb:1.5}}/><Typography sx={{color:'#9CA3AF',fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:600}}>No assignments right now</Typography></Box>
        :<Box sx={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:520,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
            <thead><tr style={{background:'#F9FAFB'}}>
              {['Assignment','Subject','Due','Status','Result',''].map((h,i)=>(
                <th key={i} style={{padding:'10px 16px',fontSize:'0.62rem',fontWeight:700,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'0.08em',borderBottom:'1px solid #E5E7EB',textAlign:i===5?'right':'left',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {sortedAssignments.map(a=>{
                const ds=dueStatus(a.dueDate),sub=submissionsMap[String(a.id)]||null,rb=resultBadge(sub);
                return(
                  <tr key={a.id} className="sd-row-hover" style={{background:'#fff'}}>
                    <td style={{padding:'13px 16px',borderBottom:'1px solid #F3F4F6'}}><div style={{fontWeight:600,fontSize:'0.875rem',color:'#111827',lineHeight:1.35}}>{a.title}</div>{a.className&&<div style={{fontSize:'0.66rem',color:'#9CA3AF',marginTop:3}}>{a.className}</div>}</td>
                    <td style={{padding:'13px 16px',borderBottom:'1px solid #F3F4F6',fontSize:'0.8rem',color:'#6B7280',whiteSpace:'nowrap'}}>{a.subjectName??'—'}</td>
                    <td style={{padding:'13px 16px',borderBottom:'1px solid #F3F4F6',fontSize:'0.8rem',color:'#374151',whiteSpace:'nowrap',fontWeight:500}}>{fmtDate(a.dueDate)}</td>
                    <td style={{padding:'13px 16px',borderBottom:'1px solid #F3F4F6'}}><Pill label={ds.label} color={ds.color} bg={ds.bg}/></td>
                    <td style={{padding:'13px 16px',borderBottom:'1px solid #F3F4F6'}}><Pill label={rb.label} color={rb.color} bg={rb.bg} icon={rb.icon}/></td>
                    <td style={{padding:'13px 16px',borderBottom:'1px solid #F3F4F6',textAlign:'right'}}><a href={`/assignments/${a.id}`} style={{display:'inline-flex',alignItems:'center',textDecoration:'none',fontSize:'0.75rem',fontWeight:700,color:'#2563EB',background:'#EFF6FF',borderRadius:'7px',padding:'5px 12px',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Open</a></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Box>}
    </Card>
  );
}

function RecentResultsSection({gradedSubs,assignments,fullWidth}) {
  return (
    <Card title="Recent Results" aside={gradedSubs.length>0&&<Box sx={{px:1.25,py:'3px',borderRadius:'6px',background:'#D1FAE5'}}><Typography sx={{fontSize:'0.65rem',fontWeight:700,color:'#059669',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{gradedSubs.length} graded</Typography></Box>}>
      <Box sx={{p:1.75,display:'flex',flexDirection:'column',gap:1}}>
        {gradedSubs.length===0
          ?<Typography sx={{color:'#9CA3AF',fontSize:'0.82rem',textAlign:'center',py:3,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>No results yet.</Typography>
          :[...gradedSubs].sort((a,b)=>new Date(b.gradedAt)-new Date(a.gradedAt)).slice(0,fullWidth?10:5).map(s=>{
            const pct=parseFloat(s.percentage)||0;
            const color=pct>=75?'#059669':pct>=50?'#D97706':'#DC2626';
            const bg=pct>=75?'#D1FAE5':pct>=50?'#FEF3C7':'#FEE2E2';
            const asgn=assignments.find(a=>String(a.id)===String(s.assignmentId));
            return(
              <Box key={s.submissionId} sx={{display:'flex',alignItems:'center',gap:1.5,px:1.75,py:1.25,borderRadius:'var(--r-sm)',background:'#F9FAFB',border:'1px solid #F3F4F6',minHeight:52}}>
                <Box sx={{width:38,height:38,borderRadius:'9px',background:bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Typography sx={{fontSize:{xs:'0.78rem',md:'0.72rem'},fontWeight:800,color,fontFamily:"'Fraunces',serif"}}>{pct.toFixed(0)}%</Typography></Box>
                <Box sx={{flex:1,minWidth:0}}>
                  <Typography sx={{fontSize:{xs:'0.85rem',md:'0.82rem'},fontWeight:600,color:'#111827',fontFamily:"'Plus Jakarta Sans',sans-serif",overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{asgn?.title??`Assignment #${s.assignmentId}`}</Typography>
                  <Typography sx={{fontSize:{xs:'0.72rem',md:'0.67rem'},color:'#9CA3AF',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{asgn?.subjectName??''}</Typography>
                </Box>
                <EmojiEventsIcon sx={{fontSize:15,color,flexShrink:0}}/>
              </Box>
            );
          })}
      </Box>
    </Card>
  );
}

function DeadlinesSection({pendingDeadlines,fullWidth}) {
  return (
    <Card title="Upcoming Deadlines">
      <Box sx={{p:1.75,display:'flex',flexDirection:'column',gap:1}}>
        {pendingDeadlines.length===0
          ?<Typography sx={{color:'#9CA3AF',fontSize:'0.82rem',textAlign:'center',py:3,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>No pending deadlines</Typography>
          :pendingDeadlines.slice(0,fullWidth?20:5).map(a=>{
            const days=daysUntil(a.dueDate),urgent=days<=3;
            return(
              <Box key={a.id} sx={{display:'flex',alignItems:'center',gap:1.5,px:1.75,py:1.25,borderRadius:'var(--r-sm)',background:urgent?'#FEF3C7':'#F9FAFB',border:`1px solid ${urgent?'#FDE68A':'#E5E7EB'}`,minHeight:52}}>
                <Box sx={{width:36,height:36,borderRadius:'9px',background:urgent?'#FEF3C7':'#EFF6FF',border:`1px solid ${urgent?'#FCD34D':'#BFDBFE'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Typography sx={{fontSize:{xs:'0.72rem',md:'0.67rem'},fontWeight:800,color:urgent?'#D97706':'#2563EB',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{days===0?'NOW':`${days}d`}</Typography></Box>
                <Box sx={{flex:1,minWidth:0}}>
                  <Typography sx={{fontSize:{xs:'0.85rem',md:'0.82rem'},fontWeight:600,color:'#111827',fontFamily:"'Plus Jakarta Sans',sans-serif",overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.title}</Typography>
                  <Typography sx={{fontSize:{xs:'0.72rem',md:'0.67rem'},color:'#9CA3AF',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{a.subjectName}</Typography>
                </Box>
                {urgent&&<AccessTimeIcon sx={{fontSize:15,color:'#D97706',flexShrink:0}}/>}
              </Box>
            );
          })}
      </Box>
    </Card>
  );
}

function QuizzesSection({quizzes,fullWidth}) {
  const pending=quizzes.filter(q=>!q.submittedAt);
  return (
    <Card title={`Quizzes (${quizzes.length})`} aside={pending.length>0&&<Box sx={{px:1.25,py:'3px',borderRadius:'6px',background:'#EDE9FE'}}><Typography sx={{fontSize:'0.65rem',fontWeight:700,color:'#7C3AED',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{pending.length} pending</Typography></Box>}>
      <Box sx={{p:1.75,display:'flex',flexDirection:'column',gap:1}}>
        {quizzes.length===0
          ?<Typography sx={{color:'#9CA3AF',fontSize:'0.82rem',textAlign:'center',py:3,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>No quizzes yet.</Typography>
          :quizzes.slice(0,fullWidth?30:5).map(q=>{
            const attempted=!!q.submittedAt,pct=parseFloat(q.percentage)||0;
            const scoreColor=pct>=75?'#059669':pct>=50?'#D97706':'#DC2626';
            const scoreBg=pct>=75?'#D1FAE5':pct>=50?'#FEF3C7':'#FEE2E2';
            return(
              <Box key={q.id} component="a" href={`/student/quiz/${q.id}`} className="sd-quiz-row" sx={{background:attempted?'#F9FAFB':'#F5F3FF',border:`1px solid ${attempted?'#E5E7EB':'#DDD6FE'}`,color:'inherit'}}>
                <Box sx={{width:40,height:40,borderRadius:'10px',background:attempted?scoreBg:'#EDE9FE',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {attempted?<Typography sx={{fontSize:{xs:'0.78rem',md:'0.72rem'},fontWeight:800,color:scoreColor,fontFamily:"'Fraunces',serif"}}>{pct.toFixed(0)}%</Typography>:<QuizIcon sx={{fontSize:18,color:'#7C3AED'}}/>}
                </Box>
                <Box sx={{flex:1,minWidth:0}}>
                  <Typography sx={{fontSize:{xs:'0.88rem',md:'0.82rem'},fontWeight:700,color:attempted?'#111827':'#5B21B6',fontFamily:"'Plus Jakarta Sans',sans-serif",overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{q.title}</Typography>
                  <Typography sx={{fontSize:{xs:'0.72rem',md:'0.67rem'},color:'#9CA3AF',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{q.subjectName} · {q.total_questions} Q · {q.time_limit_minutes} min</Typography>
                </Box>
                {attempted
                  ?<Box sx={{px:1.25,py:'5px',borderRadius:'6px',background:scoreBg,minHeight:30,display:'flex',alignItems:'center'}}><Typography sx={{fontSize:{xs:'0.72rem',md:'0.62rem'},fontWeight:700,color:scoreColor,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Done ✓</Typography></Box>
                  :<Box sx={{px:1.5,py:'7px',borderRadius:'7px',background:'#7C3AED',minHeight:34,display:'flex',alignItems:'center'}}><Typography sx={{fontSize:{xs:'0.75rem',md:'0.62rem'},fontWeight:700,color:'#fff',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Start</Typography></Box>}
              </Box>
            );
          })}
      </Box>
    </Card>
  );
}