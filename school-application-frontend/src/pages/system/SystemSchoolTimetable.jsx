import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Chip,
  CircularProgress, Snackbar, Alert,
  Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions,
} from '@mui/material';
import SystemLayout, {
  FONT, TEAL, BORDER, CARD, INK, INK_SOFT, INK_FAINT,
} from '../../components/system/SystemLayout';
import API_BASE from '../../config';

const token = () => sessionStorage.getItem('systemToken');
const authH = () => ({ Authorization: `Bearer ${token()}` });
const jsonH = () => ({ 'Content-Type': 'application/json', ...authH() });

const DAYS   = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAYS_S = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri' };

const hc = {
  bgcolor: '#0D1E33', color: INK, fontWeight: 700, fontSize: '0.68rem',
  letterSpacing: '0.06em', textTransform: 'uppercase',
  borderBottom: `2px solid ${TEAL}`, borderRight: `1px solid ${BORDER}`,
  padding: '8px 12px', whiteSpace: 'nowrap', fontFamily: FONT,
};
const bc = {
  fontSize: '0.8rem', color: INK, borderBottom: `1px solid ${BORDER}`,
  borderRight: `1px solid ${BORDER}`, padding: '7px 10px', fontFamily: FONT,
};

export default function SystemSchoolTimetable() {
  const schoolId   = sessionStorage.getItem('selectedSchoolId');
  const schoolName = sessionStorage.getItem('selectedSchoolName');

  const [classes,  setClasses]  = useState([]);
  const [selClass, setSelClass] = useState(null);
  const [ttData,   setTtData]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [ttLoad,   setTtLoad]   = useState(false);

  const [slotDlg,  setSlotDlg]  = useState(null);
  const [form,     setForm]     = useState({ subjectId: '', teacherId: '' });
  const [tBusy,    setTBusy]    = useState([]);
  const [clash,    setClash]    = useState('');
  const [saving,   setSaving]   = useState(false);
  const [snack,    setSnack]    = useState({ open: false, msg: '', sev: 'success' });

  const toast = (msg, sev = 'success') => setSnack({ open: true, msg, sev });
  const BASE  = `${API_BASE}/api/system/schools/${schoolId}`;

  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      setLoading(true);
      const r = await fetch(`${BASE}/setup/classes`, { headers: authH() });
      if (r.ok) setClasses(await r.json());
      setLoading(false);
    })();
  }, [schoolId, BASE]);

  const loadTimetable = async cls => {
    setSelClass(cls); setTtData(null); setTtLoad(true);
    const r = await fetch(`${BASE}/timetable/${cls.id}`, { headers: authH() });
    if (r.ok) setTtData(await r.json());
    else toast('Failed to load timetable', 'error');
    setTtLoad(false);
  };

  const slotMap = {};
  ttData?.slots?.forEach(s => { slotMap[`${s.dayOfWeek}-${s.periodId}`] = s; });

  const openSlot = (periodId, day) => {
    const ex = slotMap[`${day}-${periodId}`];
    setForm({ subjectId: ex?.subjectId || '', teacherId: ex?.teacherId || '' });
    setClash(''); setTBusy([]);
    setSlotDlg({ periodId, day, existing: ex });
  };

  const handleTeacherChange = async tid => {
    setForm(f => ({ ...f, teacherId: tid }));
    if (!tid) return setTBusy([]);
    const r = await fetch(`${BASE}/timetable/teacher-availability?teacherId=${tid}`, { headers: authH() });
    if (r.ok) setTBusy(await r.json());
  };

  const isBusy = (periodId, day) =>
    tBusy.some(b => b.dayOfWeek === day && b.periodId === periodId);

  const handleAssign = async () => {
    if (!form.subjectId || !form.teacherId) return setClash('Select both subject and teacher.');
    setSaving(true); setClash('');
    if (slotDlg?.existing) {
      await fetch(`${BASE}/timetable/${slotDlg.existing.id}`, { method: 'DELETE', headers: authH() });
    }
    const res = await fetch(`${BASE}/timetable`, {
      method: 'POST', headers: jsonH(),
      body: JSON.stringify({
        classId: selClass.id, subjectId: form.subjectId,
        teacherId: form.teacherId, periodId: slotDlg.periodId, dayOfWeek: slotDlg.day,
      }),
    });
    const d = await res.json();
    setSaving(false);
    if (res.ok) { toast(`${d.subjectName} assigned`); setSlotDlg(null); loadTimetable(selClass); }
    else setClash(d.message || 'Failed to assign');
  };

  const removeSlot = async slot => {
    await fetch(`${BASE}/timetable/${slot.id}`, { method: 'DELETE', headers: authH() });
    toast('Slot cleared'); loadTimetable(selClass);
  };

  if (!schoolId) {
    return (
      <SystemLayout title="Timetable">
        <Box sx={{ p: 4, color: INK_SOFT, fontFamily: FONT }}>Select a school first.</Box>
      </SystemLayout>
    );
  }

  return (
    <SystemLayout title="Timetable Builder" subtitle={schoolName}>
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>

        {loading
          ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: TEAL }} /></Box>
          : !selClass ? (
            <>
              <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.9rem', color: INK, mb: 2 }}>
                Select a class to build its timetable
              </Typography>
              {classes.length === 0
                ? <Typography sx={{ color: INK_FAINT, fontFamily: FONT }}>No classes found. Add classes in School Setup first.</Typography>
                : (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {classes.map(cls => (
                      <Box key={cls.id} onClick={() => loadTimetable(cls)}
                        sx={{
                          width: 130, p: 2.5, borderRadius: '8px', cursor: 'pointer',
                          border: `1.5px solid ${BORDER}`, bgcolor: CARD, textAlign: 'center',
                          '&:hover': { borderColor: TEAL, bgcolor: `${TEAL}08` },
                          transition: 'all 0.15s',
                        }}>
                        <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', color: INK, lineHeight: 1, fontFamily: FONT }}>{cls.name}</Typography>
                        <Typography sx={{ fontSize: '0.62rem', color: INK_FAINT, mt: 0.5, fontFamily: FONT }}>Grade {cls.grade}</Typography>
                        {cls.stream && <Chip label={cls.stream} size="small" sx={{ mt: 0.75, fontSize: '0.58rem', fontWeight: 700, bgcolor: `${TEAL}20`, color: TEAL }} />}
                      </Box>
                    ))}
                  </Box>
                )}
            </>
          ) : (
            <Box>
              <Box sx={{ bgcolor: TEAL, borderRadius: '8px', p: 2, mb: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff', fontFamily: FONT }}>
                    {selClass.name}
                    {selClass.stream && <Chip label={selClass.stream} size="small" sx={{ ml: 1, bgcolor: 'rgba(0,0,0,0.2)', color: '#fff', fontWeight: 700, fontSize: '0.62rem' }} />}
                  </Typography>
                  <Typography sx={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.5)', fontFamily: FONT }}>
                    Grade {selClass.grade} · {(ttData?.slots || []).length} slots filled
                  </Typography>
                </Box>
                <Button size="small" onClick={() => setSelClass(null)}
                  sx={{ color: '#fff', textTransform: 'none', fontWeight: 700, fontFamily: FONT, border: '1px solid rgba(0,0,0,0.2)', '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' } }}>
                  ← All Classes
                </Button>
              </Box>

              {ttLoad
                ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: TEAL }} /></Box>
                : ttData && (
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table sx={{ borderCollapse: 'collapse' }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ ...hc, width: 90, minWidth: 90 }}>Day</TableCell>
                          {ttData.periods.map((period, i) => (
                            <TableCell key={period.id} sx={{
                              ...hc, textAlign: 'center', minWidth: period.isBreak ? 65 : 110,
                              bgcolor: period.isBreak ? '#0A1628' : '#0D1E33',
                              color: period.isBreak ? INK_FAINT : INK,
                              ...(i === ttData.periods.length - 1 ? { borderRight: 'none' } : {}),
                            }}>
                              <Typography sx={{ fontWeight: 700, fontSize: '0.62rem', fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'inherit' }}>
                                {period.name}
                              </Typography>
                              <Typography sx={{ fontSize: '0.57rem', color: INK_FAINT, fontFamily: FONT, textTransform: 'none', letterSpacing: 0 }}>
                                {period.timeStart?.slice(0, 5)}–{period.timeEnd?.slice(0, 5)}
                              </Typography>
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {DAYS.map(day => (
                          <TableRow key={day}>
                            <TableCell sx={{ ...bc, bgcolor: '#0D1E33', fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                              {DAYS_S[day]}
                            </TableCell>
                            {ttData.periods.map((period, i) => {
                              if (period.isBreak)
                                return <TableCell key={period.id} sx={{ ...bc, bgcolor: '#0A1628', textAlign: 'center', ...(i === ttData.periods.length - 1 ? { borderRight: 'none' } : {}) }}>
                                  <Typography sx={{ fontSize: '0.6rem', color: INK_FAINT, fontStyle: 'italic', fontFamily: FONT }}>—</Typography>
                                </TableCell>;
                              const slot = slotMap[`${day}-${period.id}`];
                              return (
                                <TableCell key={period.id}
                                  onClick={() => openSlot(period.id, day)}
                                  sx={{
                                    ...bc, textAlign: 'center', cursor: 'pointer',
                                    bgcolor: slot ? `${TEAL}18` : CARD,
                                    '&:hover': { bgcolor: `${TEAL}28` },
                                    ...(i === ttData.periods.length - 1 ? { borderRight: 'none' } : {}),
                                  }}>
                                  {slot ? (
                                    <Box>
                                      <Typography sx={{ fontWeight: 700, fontSize: '0.72rem', color: INK, fontFamily: FONT, lineHeight: 1.2 }}>
                                        {slot.subjectName}
                                      </Typography>
                                      <Typography sx={{ fontSize: '0.6rem', color: TEAL, fontFamily: FONT }}>
                                        {slot.teacherFirstName} {slot.teacherLastName?.charAt(0)}.
                                      </Typography>
                                      <Typography sx={{ fontSize: '0.55rem', color: INK_FAINT, fontFamily: FONT, cursor: 'pointer', mt: 0.25 }}
                                        onClick={e => { e.stopPropagation(); removeSlot(slot); }}>
                                        × clear
                                      </Typography>
                                    </Box>
                                  ) : (
                                    <Typography sx={{ fontSize: '0.6rem', color: INK_FAINT, fontFamily: FONT }}>+ assign</Typography>
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
            </Box>
          )}
      </Box>

      {/* ── Assign slot dialog ── */}
      <Dialog open={!!slotDlg} onClose={() => setSlotDlg(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: CARD, border: `1px solid ${BORDER}` } }}>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, color: INK, fontSize: '0.9rem', borderBottom: `1px solid ${BORDER}` }}>
          {slotDlg?.existing ? 'Replace Slot' : 'Assign Slot'} — {slotDlg?.day}, {ttData?.periods?.find(p => p.id === slotDlg?.periodId)?.name}
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField select fullWidth size="small" label="Subject"
              value={form.subjectId}
              onChange={e => { setForm(f => ({ ...f, subjectId: e.target.value })); setClash(''); }}>
              <MenuItem value="">— Select subject —</MenuItem>
              {(ttData?.subjects || []).map(s => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </TextField>
            <TextField select fullWidth size="small" label="Teacher"
              value={form.teacherId}
              onChange={e => handleTeacherChange(e.target.value)}>
              <MenuItem value="">— Select teacher —</MenuItem>
              {(ttData?.teachers || [])
                .filter(t => !form.subjectId || (t.subjectIds || []).includes(
                  (ttData?.subjects || []).find(s => s.id === Number(form.subjectId) || s.id === form.subjectId)?.nationalSubjectId
                ))
                .map(t => {
                  const busy = isBusy(slotDlg?.periodId, slotDlg?.day);
                  return (
                    <MenuItem key={t.id} value={t.id} disabled={busy && form.teacherId !== String(t.id)}>
                      {t.firstName} {t.lastName}{busy ? ' (busy)' : ''}
                    </MenuItem>
                  );
                })}
            </TextField>
            {clash && <Typography sx={{ color: '#EF4444', fontSize: '0.78rem', fontFamily: FONT }}>{clash}</Typography>}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${BORDER}` }}>
          <Button onClick={() => setSlotDlg(null)} sx={{ color: INK_SOFT, textTransform: 'none', fontFamily: FONT }}>Cancel</Button>
          <Button variant="contained" onClick={handleAssign} disabled={saving}
            sx={{ background: TEAL, color: '#fff', textTransform: 'none', fontWeight: 700, fontFamily: FONT, boxShadow: 'none' }}>
            {saving ? 'Assigning…' : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.sev} onClose={() => setSnack(s => ({ ...s, open: false }))} sx={{ fontFamily: FONT }}>{snack.msg}</Alert>
      </Snackbar>
    </SystemLayout>
  );
}
