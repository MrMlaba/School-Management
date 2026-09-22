// src/pages/ParentDashboard.js — Parent Portal: children, announcements, events
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Card, CardContent, CircularProgress,
  Chip, Button, Collapse, Table, TableBody, TableCell, TableHead, TableRow,
  Divider, Tabs, Tab, Snackbar, Alert,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import LogoutIcon from '@mui/icons-material/Logout';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PushPinIcon from '@mui/icons-material/PushPin';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { core } from '../theme/tokens';
import API_BASE from '../config';
import { handleUnauthorized } from '../utils/authGuard';
import OfflineBanner from '../components/OfflineBanner';

const BASE  = `${API_BASE}`;
const authH = () => ({ Authorization: `Bearer ${sessionStorage.getItem('parentToken')}` });

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Event dates arrive as a plain "YYYY-MM-DD" string, so build the Date from its
// parts — new Date("2026-09-25") is parsed as UTC and can display the day before.
const parseDay     = (s) => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const fmtEventDate = (s) => parseDay(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtPosted    = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const sectionLabel = { fontSize: 13, fontWeight: 700, color: core.text, mb: 1 };
const emptyText    = { fontSize: 12, color: core.muted };

/* ── Weekly timetable for one child ─────────────────────────────────────── */
const Timetable = ({ data }) => {
  if (!data) return <Typography sx={emptyText}>Could not load the timetable.</Typography>;
  if (!data.class || !data.periods?.length)
    return <Typography sx={emptyText}>No timetable has been set up for this class yet.</Typography>;

  const slotMap = {};
  data.slots.forEach(s => { slotMap[`${s.dayOfWeek}-${s.periodNumber}`] = s; });

  return (
    <>
      <Typography sx={{ ...emptyText, mb: 1 }}>Class {data.class.name}</Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 560 }}>
          <TableHead>
            <TableRow>
              <TableCell>Period</TableCell>
              {DAYS.map(d => <TableCell key={d} align="center">{d.slice(0, 3)}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.periods.map(p => (
              <TableRow key={p.periodNumber}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{p.name}</Typography>
                  <Typography sx={{ fontSize: 11, color: core.muted }}>
                    {p.timeStart?.slice(0, 5)}–{p.timeEnd?.slice(0, 5)}
                  </Typography>
                </TableCell>
                {p.isBreak ? (
                  <TableCell colSpan={DAYS.length} align="center"
                    sx={{ bgcolor: core.headerBg, color: core.muted, fontSize: 12, fontStyle: 'italic' }}>
                    Break
                  </TableCell>
                ) : DAYS.map(d => {
                  const s = slotMap[`${d}-${p.periodNumber}`];
                  return (
                    <TableCell key={d} align="center">
                      {s && (
                        <>
                          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{s.subjectName}</Typography>
                          <Typography sx={{ fontSize: 11, color: core.muted }}>
                            {s.teacherFirstName?.[0]}. {s.teacherLastName}
                          </Typography>
                        </>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </>
  );
};

/* ── One child: attendance, results, report cards, timetable ────────────── */
const ChildCard = ({ child, reportTerms, toast }) => {
  const [open, setOpen]             = useState(false);
  const [data, setData]             = useState(null);  // null = not loaded yet
  const [pdfLoading, setPdfLoading] = useState(null);  // termId being generated

  const load = useCallback(async () => {
    setData({ loading: true });
    try {
      const [attRes, resRes, ttRes] = await Promise.all([
        fetch(`${BASE}/api/parent/children/${child.id}/attendance`, { headers: authH() }),
        fetch(`${BASE}/api/parent/children/${child.id}/results`,    { headers: authH() }),
        fetch(`${BASE}/api/parent/children/${child.id}/timetable`,  { headers: authH() }),
      ]);
      if (handleUnauthorized('parent', [attRes, resRes, ttRes])) return;
      // A failed request stays null so it reads as "couldn't load", not "no data".
      setData({
        loading:    false,
        attendance: attRes.ok ? await attRes.json() : null,
        results:    resRes.ok ? await resRes.json() : null,
        timetable:  ttRes.ok  ? await ttRes.json()  : null,
      });
    } catch {
      setData({ loading: false, failed: true, attendance: null, results: null, timetable: null });
    }
  }, [child.id]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && (!data || data.failed)) load();
  };

  const openReport = async (term) => {
    setPdfLoading(term.id);
    try {
      const res = await fetch(`${BASE}/api/parent/children/${child.id}/report-card/${term.id}/pdf`, { headers: authH() });
      if (handleUnauthorized('parent', res)) return;
      if (!res.ok) {
        toast(res.status === 403 ? 'This report has not been released yet.' : 'Could not generate the report card. Please try again.', 'error');
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      // Popup blockers can reject window.open after an await — fall back to a download.
      if (!window.open(url, '_blank')) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-card-term-${term.termNumber}.pdf`;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast('Network error — please try again.', 'error');
    } finally {
      setPdfLoading(null);
    }
  };

  const attendance = data?.attendance;

  return (
    <Card sx={{ border: `1px solid ${core.border}`, borderRadius: '10px' }}>
      <CardContent
        onClick={toggle}
        sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Box>
          <Typography sx={{ fontWeight: 700, color: core.text }}>
            {child.firstName} {child.lastName}
          </Typography>
          <Typography sx={{ fontSize: 12, color: core.muted }}>
            {child.grade}{child.stream ? ` · ${child.stream}` : ''} · {child.studentNumber}
          </Typography>
        </Box>
        {open ? <ExpandLessIcon sx={{ color: core.muted }} /> : <ExpandMoreIcon sx={{ color: core.muted }} />}
      </CardContent>

      <Collapse in={open}>
        <Divider sx={{ borderColor: core.border }} />
        <CardContent>
          {!data || data.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={22} sx={{ color: core.brand }} />
            </Box>
          ) : (
            <>
              <Typography sx={sectionLabel}>Attendance (last 90 recorded days)</Typography>
              {attendance === null ? (
                <Typography sx={{ ...emptyText, mb: 2.5 }}>Could not load attendance.</Typography>
              ) : attendance.summary?.total ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
                  <Chip
                    label={`${attendance.summary.percentage}% present`}
                    sx={{
                      bgcolor: attendance.summary.percentage >= 80 ? core.accentBg : core.warnBg,
                      color:   attendance.summary.percentage >= 80 ? core.accent   : core.warn,
                      fontWeight: 700,
                    }}
                  />
                  <Typography sx={emptyText}>
                    {attendance.summary.present} of {attendance.summary.total} recorded days
                  </Typography>
                </Box>
              ) : (
                <Typography sx={{ ...emptyText, mb: 2.5 }}>No attendance recorded yet.</Typography>
              )}

              <Typography sx={sectionLabel}>Recent Results</Typography>
              {data.results === null ? (
                <Typography sx={{ ...emptyText, mb: 2.5 }}>Could not load results.</Typography>
              ) : data.results.length ? (
                <Box sx={{ overflowX: 'auto', mb: 2.5 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Subject</TableCell>
                        <TableCell>Exam</TableCell>
                        <TableCell align="right">Score</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.results.slice(0, 8).map(r => (
                        <TableRow key={r.id}>
                          <TableCell>{r.subjectName}</TableCell>
                          <TableCell>{r.examTitle}</TableCell>
                          <TableCell align="right">
                            {r.marksObtained}/{r.totalMarks} ({Math.round(r.percentage)}%)
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              ) : (
                <Typography sx={{ ...emptyText, mb: 2.5 }}>No results captured yet.</Typography>
              )}

              <Typography sx={sectionLabel}>Report Cards</Typography>
              {reportTerms.length ? (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2.5 }}>
                  {reportTerms.map(t => (
                    <Button
                      key={t.id}
                      size="small"
                      variant="outlined"
                      disabled={pdfLoading !== null}
                      onClick={() => openReport(t)}
                      startIcon={pdfLoading === t.id ? <CircularProgress size={14} /> : <PictureAsPdfIcon />}
                      sx={{ textTransform: 'none', borderColor: core.border, color: core.brand }}
                    >
                      Term {t.termNumber}
                    </Button>
                  ))}
                </Box>
              ) : (
                <Typography sx={{ ...emptyText, mb: 2.5 }}>
                  No report cards have been released yet. They appear here once the school releases a term.
                </Typography>
              )}

              <Typography sx={sectionLabel}>Timetable</Typography>
              <Timetable data={data.timetable} />
            </>
          )}
        </CardContent>
      </Collapse>
    </Card>
  );
};

/* ── Page ───────────────────────────────────────────────────────────────── */
const ParentDashboard = () => {
  const navigate  = useNavigate();
  const firstName = sessionStorage.getItem('parentFirstName') || '';

  const [tab, setTab]                     = useState(0);
  const [loading, setLoading]             = useState(true);
  const [loadError, setLoadError]         = useState(false);
  const [children, setChildren]           = useState([]);
  const [announcements, setAnnouncements] = useState([]);   // null = failed to load
  const [events, setEvents]               = useState([]);   // null = failed to load
  const [reportTerms, setReportTerms]     = useState([]);
  const [snack, setSnack]                 = useState({ open: false, msg: '', sev: 'success' });
  const toast = useCallback((msg, sev = 'success') => setSnack({ open: true, msg, sev }), []);

  useEffect(() => {
    (async () => {
      try {
        const [cRes, aRes, eRes, tRes] = await Promise.all([
          fetch(`${BASE}/api/parent/children`,      { headers: authH() }),
          fetch(`${BASE}/api/parent/announcements`, { headers: authH() }),
          fetch(`${BASE}/api/parent/events`,        { headers: authH() }),
          fetch(`${BASE}/api/parent/report-terms`,  { headers: authH() }),
        ]);
        if (handleUnauthorized('parent', [cRes, aRes, eRes, tRes])) return;
        if (cRes.ok) setChildren(await cRes.json()); else setLoadError(true);
        setAnnouncements(aRes.ok ? await aRes.json() : null);
        setEvents(eRes.ok ? await eRes.json() : null);
        if (tRes.ok) setReportTerms(await tRes.json());
      } catch {
        setLoadError(true);
        setAnnouncements(null);
        setEvents(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLogout = () => {
    ['parentToken', 'parentFirstName', 'parentLastName'].forEach(k => sessionStorage.removeItem(k));
    navigate('/parent-login');
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: core.bg }}>
        <CircularProgress sx={{ color: core.brand }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: core.bg }}>
      <OfflineBanner/>
      <Box sx={{ bgcolor: core.white, borderBottom: `1px solid ${core.border}` }}>
        <Container maxWidth="md" sx={{ py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: core.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SchoolIcon sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, color: core.brand, lineHeight: 1.2 }}>Parent Portal</Typography>
              <Typography sx={{ fontSize: 12, color: core.muted }}>Welcome, {firstName}</Typography>
            </Box>
          </Box>
          <Button onClick={handleLogout} startIcon={<LogoutIcon />} sx={{ color: core.muted, textTransform: 'none' }}>
            Log out
          </Button>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            mb: 3,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
            '& .Mui-selected': { color: core.brand },
            '& .MuiTabs-indicator': { bgcolor: core.brand },
          }}
        >
          <Tab label="My Children" />
          <Tab label="Announcements" />
          <Tab label="Events" />
        </Tabs>

        {/* ── My Children ── */}
        {tab === 0 && (
          <>
            <Typography sx={{ fontSize: 13, color: core.muted, mb: 2 }}>
              {children.length} {children.length === 1 ? 'child' : 'children'} linked to your account
            </Typography>
            {loadError ? (
              <Card sx={{ p: 4, textAlign: 'center', border: `1px solid ${core.border}` }}>
                <Typography sx={{ color: core.muted }}>
                  We couldn't load your children. Check your connection and refresh the page.
                </Typography>
              </Card>
            ) : children.length === 0 ? (
              <Card sx={{ p: 4, textAlign: 'center', border: `1px solid ${core.border}` }}>
                <Typography sx={{ color: core.muted }}>
                  No children are linked to your account yet. Contact the school office if this looks wrong.
                </Typography>
              </Card>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {children.map(child => (
                  <ChildCard key={child.id} child={child} reportTerms={reportTerms} toast={toast} />
                ))}
              </Box>
            )}
          </>
        )}

        {/* ── Announcements ── */}
        {tab === 1 && (
          announcements === null ? (
            <Typography sx={emptyText}>Could not load announcements. Please refresh the page.</Typography>
          ) : announcements.length === 0 ? (
            <Card sx={{ p: 4, textAlign: 'center', border: `1px solid ${core.border}` }}>
              <Typography sx={{ color: core.muted }}>No announcements from the school yet.</Typography>
            </Card>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {announcements.map(a => (
                <Card key={a.id} sx={{ border: `1px solid ${a.isPinned ? core.brand : core.border}`, borderRadius: '10px' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      {a.isPinned && <PushPinIcon sx={{ fontSize: 16, color: core.brand }} />}
                      <Typography sx={{ fontWeight: 700, color: core.text }}>{a.title}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 13, color: core.text, whiteSpace: 'pre-wrap', mb: 1 }}>{a.body}</Typography>
                    <Typography sx={{ fontSize: 11, color: core.muted }}>Posted {fmtPosted(a.createdAt)}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )
        )}

        {/* ── Events ── */}
        {tab === 2 && (
          events === null ? (
            <Typography sx={emptyText}>Could not load events. Please refresh the page.</Typography>
          ) : events.length === 0 ? (
            <Card sx={{ p: 4, textAlign: 'center', border: `1px solid ${core.border}` }}>
              <Typography sx={{ color: core.muted }}>No upcoming events.</Typography>
            </Card>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {events.map(ev => (
                <Card key={ev.id} sx={{ border: `1px solid ${core.border}`, borderRadius: '10px' }}>
                  <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Box sx={{ minWidth: 76, textAlign: 'center', bgcolor: core.headerBg, borderRadius: '8px', py: 1, px: 1 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: core.brand }}>{fmtEventDate(ev.eventDate)}</Typography>
                      {ev.eventTime && <Typography sx={{ fontSize: 11, color: core.muted }}>{ev.eventTime.slice(0, 5)}</Typography>}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontWeight: 700, color: core.text }}>{ev.title}</Typography>
                        {ev.type && ev.type !== 'general' && (
                          <Chip label={ev.type} size="small" sx={{ height: 20, fontSize: 11, textTransform: 'capitalize' }} />
                        )}
                      </Box>
                      {ev.location && <Typography sx={{ fontSize: 12, color: core.muted }}>{ev.location}</Typography>}
                      {ev.description && <Typography sx={{ fontSize: 13, color: core.text, mt: 0.5, whiteSpace: 'pre-wrap' }}>{ev.description}</Typography>}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )
        )}
      </Container>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.sev} onClose={() => setSnack(s => ({ ...s, open: false }))} sx={{ width: '100%' }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ParentDashboard;
