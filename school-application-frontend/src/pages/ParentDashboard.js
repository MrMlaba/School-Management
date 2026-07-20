// src/pages/ParentDashboard.js — Parent Portal: children, attendance, results
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Card, CardContent, CircularProgress,
  Chip, Button, Collapse, Table, TableBody, TableCell, TableHead, TableRow, Divider,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import LogoutIcon from '@mui/icons-material/Logout';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { core } from '../theme/tokens';
import API_BASE from '../config';
import OfflineBanner from '../components/OfflineBanner';

const BASE  = `${API_BASE}`;
const authH = () => ({ Authorization: `Bearer ${sessionStorage.getItem('parentToken')}` });

const ParentDashboard = () => {
  const navigate   = useNavigate();
  const firstName  = sessionStorage.getItem('parentFirstName') || '';
  const [children, setChildren]   = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [expanded, setExpanded]   = useState(null);
  const [childData, setChildData] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/parent/children`, { headers: authH() });
        if (res.status === 401) { sessionStorage.removeItem('parentToken'); navigate('/parent-login'); return; }
        if (res.ok) setChildren(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const toggleChild = useCallback(async (id) => {
    setExpanded(prev => (prev === id ? null : id));
    if (childData[id]) return;
    setChildData(prev => ({ ...prev, [id]: { loading: true } }));
    try {
      const [attRes, resRes] = await Promise.all([
        fetch(`${BASE}/api/parent/children/${id}/attendance`, { headers: authH() }),
        fetch(`${BASE}/api/parent/children/${id}/results`,    { headers: authH() }),
      ]);
      const attendance = attRes.ok ? await attRes.json() : { records: [], summary: {} };
      const results    = resRes.ok ? await resRes.json()  : [];
      setChildData(prev => ({ ...prev, [id]: { loading: false, attendance, results } }));
    } catch {
      setChildData(prev => ({ ...prev, [id]: { loading: false, attendance: null, results: [] } }));
    }
  }, [childData]);

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
        <Typography sx={{ fontSize: 22, fontWeight: 700, color: core.brand, mb: 0.5 }}>My Children</Typography>
        <Typography sx={{ fontSize: 13, color: core.muted, mb: 3 }}>
          {children.length} {children.length === 1 ? 'child' : 'children'} linked to your account
        </Typography>

        {children.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center', border: `1px solid ${core.border}` }}>
            <Typography sx={{ color: core.muted }}>
              No children are linked to your account yet. Contact the school office if this looks wrong.
            </Typography>
          </Card>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {children.map(child => {
              const data   = childData[child.id];
              const isOpen = expanded === child.id;
              return (
                <Card key={child.id} sx={{ border: `1px solid ${core.border}`, borderRadius: '10px' }}>
                  <CardContent
                    onClick={() => toggleChild(child.id)}
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
                    {isOpen ? <ExpandLessIcon sx={{ color: core.muted }} /> : <ExpandMoreIcon sx={{ color: core.muted }} />}
                  </CardContent>

                  <Collapse in={isOpen}>
                    <Divider sx={{ borderColor: core.border }} />
                    <CardContent>
                      {data?.loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                          <CircularProgress size={22} sx={{ color: core.brand }} />
                        </Box>
                      ) : (
                        <>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: core.text, mb: 1 }}>
                            Attendance (last 90 recorded days)
                          </Typography>
                          {data?.attendance?.summary?.total ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
                              <Chip
                                label={`${data.attendance.summary.percentage}% present`}
                                sx={{
                                  bgcolor: data.attendance.summary.percentage >= 80 ? core.accentBg : core.warnBg,
                                  color:   data.attendance.summary.percentage >= 80 ? core.accent   : core.warn,
                                  fontWeight: 700,
                                }}
                              />
                              <Typography sx={{ fontSize: 12, color: core.muted }}>
                                {data.attendance.summary.present} of {data.attendance.summary.total} recorded days
                              </Typography>
                            </Box>
                          ) : (
                            <Typography sx={{ fontSize: 12, color: core.muted, mb: 2.5 }}>No attendance recorded yet.</Typography>
                          )}

                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: core.text, mb: 1 }}>Recent Results</Typography>
                          {data?.results?.length ? (
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
                          ) : (
                            <Typography sx={{ fontSize: 12, color: core.muted }}>No results captured yet.</Typography>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Collapse>
                </Card>
              );
            })}
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default ParentDashboard;
