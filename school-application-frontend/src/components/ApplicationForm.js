import API_BASE from '../config';
import React, { useState, useEffect } from 'react';
import {
  TextField, Button, MenuItem, FormControl, Select,
  Box, Typography, Grid, Chip, CircularProgress, Stack, LinearProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SendIcon from '@mui/icons-material/Send';
import CheckIcon from '@mui/icons-material/Check';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { useNavigate, useSearchParams } from 'react-router-dom';

const C = {
  navy:         '#1a3a8c',
  navyDark:     '#0f2666',
  navyGhost:    'rgba(26,58,140,0.07)',
  navyBorder:   'rgba(26,58,140,0.2)',
  pageBg:       '#f4f6fb',
  white:        '#ffffff',
  text:         '#1a2340',
  textSub:      '#4a5a80',
  textMuted:    '#8a9abf',
  border:       '#dde3f0',
  error:        '#dc2626',
  success:      '#16a34a',
  successBg:    'rgba(22,163,74,0.06)',
  successBorder:'rgba(22,163,74,0.25)',
};

const DISPLAY = "'Merriweather', Georgia, serif";
const BODY    = "'Source Sans 3', sans-serif";

const useFonts = () => {
  useEffect(() => {
    if (document.getElementById('form-fonts')) return;
    const link = document.createElement('link');
    link.id   = 'form-fonts';
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(link);
  }, []);
};

const grades   = ['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const subjects = {
  'Grade 10': ['Physics', 'Commerce', 'Humanities'],
  'Grade 11': ['Physics', 'Commerce', 'Humanities'],
  'Grade 12': ['Physics', 'Commerce', 'Humanities'],
};
const subjectDescriptions = {
  Physics:    'Mathematics, Physical Sciences & Engineering',
  Commerce:   'Business Studies, Accounting & Economics',
  Humanities: 'History, Geography & Languages',
};

const STEPS = [
  { num: 1, label: 'Learner Info' },
  { num: 2, label: 'School Info' },
  { num: 3, label: 'Parent / Guardian' },
  { num: 4, label: 'Documents' },
];

// ─── Two-column field wrapper ─────────────────────────────────────────────
// Uses inline style width to guarantee exactly 2 columns — immune to MUI
// breakpoint quirks or theme overrides.
const TwoColField = ({ children }) => (
  <Box sx={{
    width: { xs: '100%', sm: 'calc(50% - 10px)' },
    flexShrink: 0,
  }}>
    {children}
  </Box>
);

// ─── Full-width field wrapper ─────────────────────────────────────────────
const FullField = ({ children }) => (
  <Box sx={{ width: '100%' }}>
    {children}
  </Box>
);

// ─── Row container ────────────────────────────────────────────────────────
const FieldRow = ({ children }) => (
  <Box sx={{
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    mb: 2.5,
  }}>
    {children}
  </Box>
);

// ─── Field styles ─────────────────────────────────────────────────────────
const fieldSx = {
  '& .MuiOutlinedInput-root': {
    fontFamily: BODY,
    fontSize: '0.9rem',
    borderRadius: '4px',
    backgroundColor: C.white,
    '& fieldset': { borderColor: C.border },
    '&:hover fieldset': { borderColor: '#94a3b8' },
    '&.Mui-focused fieldset': { borderColor: C.navy, borderWidth: '1.5px' },
    '&.Mui-disabled': { bgcolor: '#f8f9fc' },
  },
  '& .MuiFormHelperText-root': { fontFamily: BODY, fontSize: '0.72rem', ml: 0 },
  '& .MuiInputBase-input': { fontFamily: BODY, color: C.text, py: '13px' },
  '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: C.textSub },
};

const readOnlySx = {
  ...fieldSx,
  '& .MuiOutlinedInput-root': {
    ...fieldSx['& .MuiOutlinedInput-root'],
    bgcolor: '#f8f9fc',
  },
};

const selectMenuSx = {
  PaperProps: {
    sx: {
      mt: 0.5, borderRadius: '4px',
      border: `1px solid ${C.border}`,
      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
      bgcolor: C.white,
      '& .MuiMenuItem-root': {
        fontFamily: BODY, fontSize: '0.875rem', color: C.text, minHeight: 40,
        '&:hover': { bgcolor: C.navyGhost },
        '&.Mui-selected': { bgcolor: C.navyGhost, color: C.navy },
      },
    },
  },
};

const FieldLabel = ({ children, required }) => (
  <Typography sx={{ fontFamily: BODY, fontWeight: 700, fontSize: '0.87rem', color: C.text, mb: 0.6 }}>
    {children}{required && <Box component="span" sx={{ color: C.error, ml: 0.3 }}>*</Box>}
  </Typography>
);

const FieldError = ({ msg }) => msg
  ? <Typography sx={{ fontFamily: BODY, fontSize: '0.72rem', color: C.error, mt: 0.4 }}>{msg}</Typography>
  : null;

const Section = ({ title, children }) => (
  <Box sx={{ mb: 3 }}>
    <Box sx={{ borderLeft: `4px solid ${C.navy}`, pl: 1.5, mb: 2.5 }}>
      <Typography sx={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: '1rem', color: C.text }}>
        {title}
      </Typography>
    </Box>
    {children}
  </Box>
);

// ─── Reusable text field block (label + input + error) ────────────────────
const FieldBlock = ({ name, label, type, readOnly, multiline, rows, required, value, error, onChange }) => (
  <Box>
    <FieldLabel required={required}>{label}</FieldLabel>
    <TextField
      name={name}
      value={value ?? ''}
      onChange={onChange}
      fullWidth
      size="small"
      type={type}
      multiline={multiline}
      rows={rows}
      InputLabelProps={type === 'date' ? { shrink: true } : undefined}
      label={undefined}
      InputProps={readOnly ? { readOnly: true } : undefined}
      error={!!error}
      sx={readOnly ? readOnlySx : fieldSx}
    />
    <FieldError msg={error} />
  </Box>
);

// ─── Upload row ───────────────────────────────────────────────────────────
const UploadRow = ({ docType, label, accept, required = true, hasDoc, onUpload }) => (
  <Box sx={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 1.5, px: 2, py: 1.4,
    bgcolor: hasDoc ? C.successBg : C.white,
    border: `1px solid ${hasDoc ? C.successBorder : C.border}`,
    borderRadius: '4px',
    transition: 'all 0.2s ease',
    flexWrap: 'wrap',
  }}>
    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: hasDoc ? 'rgba(22,163,74,0.12)' : C.navyGhost,
        color: hasDoc ? C.success : C.textMuted,
      }}>
        {hasDoc
          ? <CheckCircleIcon sx={{ fontSize: 16 }} />
          : <RadioButtonUncheckedIcon sx={{ fontSize: 16 }} />}
      </Box>
      <Box>
        <Typography sx={{ fontFamily: BODY, fontWeight: 600, fontSize: '0.82rem', color: hasDoc ? C.success : C.text }}>
          {label}
        </Typography>
        <Typography sx={{ fontFamily: BODY, fontSize: '0.7rem', color: C.textMuted }}>
          {required ? 'Required' : 'Optional'}
        </Typography>
      </Box>
    </Stack>
    {!hasDoc ? (
      <Button component="label" size="small" variant="outlined"
        startIcon={<CloudUploadIcon sx={{ fontSize: '14px !important' }} />}
        sx={{
          fontFamily: BODY, fontWeight: 600, fontSize: '0.75rem',
          textTransform: 'none', px: 2, py: 0.6, borderRadius: '4px',
          borderColor: C.navyBorder, color: C.navy, flexShrink: 0,
          '&:hover': { borderColor: C.navy, bgcolor: C.navyGhost },
        }}>
        Upload
        <input type="file" hidden accept={accept} onChange={(e) => onUpload(e, docType)} />
      </Button>
    ) : (
      <Typography sx={{ fontFamily: BODY, fontWeight: 700, fontSize: '0.75rem', color: C.success }}>
        ✓ Uploaded
      </Typography>
    )}
  </Box>
);

// ─── FormField for Grid-based steps (Step 1, 2) ───────────────────────────
const FormField = React.memo(({ name, label, xs = 12, sm, type, readOnly, multiline, rows, required, form, errors, onChange }) => (
  <Grid item xs={xs} sm={sm}>
    <FieldLabel required={required}>{label}</FieldLabel>
    <TextField
      name={name} value={form[name] ?? ''} onChange={onChange}
      fullWidth size="small" type={type} multiline={multiline} rows={rows}
      InputLabelProps={type === 'date' ? { shrink: true } : undefined}
      label={undefined}
      InputProps={readOnly ? { readOnly: true } : undefined}
      error={!!errors[name]}
      sx={readOnly ? readOnlySx : fieldSx}
    />
    <FieldError msg={errors[name]} />
  </Grid>
));

// ══════════════════════════════════════════════════════════════════════════
const ApplicationForm = () => {
  useFonts();
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeStep, setActiveStep]   = useState(0);
  const [availableSchools, setAvailableSchools] = useState([]);
  const [schoolsLoading, setSchoolsLoading]     = useState(true);
  const preselectedSchool = searchParams.get('school') || null;

  const [form, setForm] = useState({
    nationalId: '', firstName: '', lastName: '', dateOfBirth: '', gender: '',
    email: '', phone: '', address: '', city: '',
    parentName: '', parentPhone: '', parentEmail: '', parentOccupation: '', relationship: '',
    schools: preselectedSchool ? [preselectedSchool] : [],
    grade: '', subject: '', previousSchool: '', achievements: '',
    whyAttend: '', emergencyContact: '', emergencyPhone: '', documents: [],
  });

  const [errors, setErrors]               = useState({});
  const [loading, setLoading]             = useState(false);
  const [applicationId, setApplicationId] = useState(null);
  const [isEditMode, setIsEditMode]       = useState(false);
  const [existingApplication, setExistingApplication] = useState(null);

  const allowedFileTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  const maxFileSize      = 5 * 1024 * 1024;

  useEffect(() => {
    fetch(`${API_BASE}/api/schools`)
      .then(r => r.json()).then(d => setAvailableSchools(Array.isArray(d) ? d : []))
      .catch(e => console.error(e)).finally(() => setSchoolsLoading(false));
  }, []);

  // Clear any stale draft on mount — form always starts fresh
  useEffect(() => { sessionStorage.removeItem('applicationDraft'); }, []);

  useEffect(() => {
    const edit = searchParams.get('edit') === 'true';
    const id   = searchParams.get('applicationId');
    const nid  = searchParams.get('nationalId');
    if (edit && id) { setIsEditMode(true); loadExisting(id, nid); }
  }, [searchParams]);

  const loadExisting = async (appId, nationalId) => {
    try {
      setLoading(true);
      const p = new URLSearchParams();
      if (nationalId) p.append('nationalId', nationalId);
      if (appId)      p.append('applicationId', appId);
      const res  = await fetch(`${API_BASE}/api/applicant-applications?${p}`);
      const apps = await res.json();
      if (res.ok && apps.length > 0) {
        const app = apps.find(a => String(a.id) === String(appId));
        if (app) {
          setExistingApplication(app);
          setApplicationId(app.id);
          setForm({
            nationalId: app.nationalId||'', firstName: app.firstName||'', lastName: app.lastName||'',
            dateOfBirth: app.dateOfBirth||'', gender: app.gender||'',
            email: app.email||'', phone: app.phone||'', address: app.address||'', city: app.city||'',
            parentName: app.parentName||'', parentPhone: app.parentPhone||'',
            parentEmail: app.parentEmail||'', parentOccupation: app.parentOccupation||'',
            relationship: app.relationship||'', schools: [app.school]||[],
            grade: app.grade||'', subject: app.subject||'',
            previousSchool: app.previousSchool||'', achievements: app.achievements||'',
            whyAttend: app.whyAttend||'', emergencyContact: app.emergencyContact||'',
            emergencyPhone: app.emergencyPhone||'', documents: app.documents||[],
          });
        }
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const vEmail  = v => !v ? 'Required.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Invalid email.' : '';
  const vPhone  = v => { if (!v) return 'Required.'; const c = v.replace(/\D/g,''); return (c.length===10&&c.startsWith('0'))||(c.length===11&&c.startsWith('27')) ? '' : 'Use format: 082 123 4567 or 27821234567'; };
  const vName   = v => !v ? 'Required.' : v.length<2 ? 'Min 2 characters.' : !/^[a-zA-Z\s\-'\.]+$/.test(v) ? 'Letters only.' : '';

  const sanitizeValue = (name, raw) => {
    if (typeof raw !== 'string') return raw;
    if (['phone', 'parentPhone', 'emergencyPhone'].includes(name))
      return raw.replace(/[^\d\s\-\+\(\)]/g, '');
    if (name === 'nationalId')
      return raw.replace(/\D/g, '').slice(0, 13);
    if (['firstName', 'lastName', 'parentName', 'emergencyContact'].includes(name))
      return raw.replace(/[^a-zA-Z\s\-'\.]/g, '');
    return raw;
  };
  const vReq    = (v, f) => !v?.trim() ? `${f} is required.` : '';
  const vSAID   = id => { const c = id.replace(/[\s-]/g,''); if (!/^\d{13}$/.test(c)) return { ok:false,e:'Must be 13 digits.' }; return { ok:true,e:null }; };

  const validate = (n, v) => {
    switch(n) {
      case 'email': return vEmail(v);
      case 'phone': case 'parentPhone': case 'emergencyPhone': return vPhone(v);
      case 'firstName': case 'lastName': case 'parentName': case 'emergencyContact': return vName(v);
      case 'nationalId': { if (!v) return 'Required.'; const r = vSAID(v); return r.ok?'':r.e; }
      case 'schools': return v.length===0 ? 'Select at least one school.' : '';
      case 'grade': return vReq(v,'Grade');
      case 'address': return !v?.trim()?'Required.':v.length<10?'Min 10 characters.':'';
      case 'city': return vReq(v,'City');
      case 'parentEmail': return v ? vEmail(v) : '';
      case 'parentOccupation': return vReq(v,'Occupation');
      case 'relationship': return vReq(v,'Relationship');
      case 'previousSchool': return vReq(v,'Previous School');
      default: return '';
    }
  };

  const extractDOB    = id => { const c=id.replace(/[\s-]/g,''); if(c.length!==13)return''; const y=+c.slice(0,2)<=29?`20${c.slice(0,2)}`:`19${c.slice(0,2)}`; return `${y}-${c.slice(2,4)}-${c.slice(4,6)}`; };
  const extractGender = id => { const c=id.replace(/[\s-]/g,''); if(c.length!==13)return''; return +c.slice(6,10)>=5000?'Male':'Female'; };

  const handleChange = e => {
    const { name } = e.target;
    const value = sanitizeValue(name, e.target.value);
    if (name === 'schools') {
      const v = typeof value === 'string' ? value.split(',') : value;
      setForm(p => ({ ...p, schools: v }));
      setErrors(p => ({ ...p, schools: v.length===0?'Select at least one school.':'' }));
    } else {
      setForm(p => ({ ...p, [name]: value }));
      setErrors(p => ({ ...p, [name]: validate(name, value) }));
      if (name==='nationalId'&&value.length===13) {
        setForm(p => ({ ...p, dateOfBirth: extractDOB(value), gender: extractGender(value) }));
      }
    }
  };

  const handleFileUpload = (e, type) => {
    const files = Array.from(e.target.files).filter(f => {
      if (!allowedFileTypes.includes(f.type)) { alert(`${f.name}: invalid file type.`); return false; }
      if (f.size > maxFileSize) { alert(`${f.name}: exceeds 5MB.`); return false; }
      return true;
    });
    setForm(p => ({ ...p, documents: [...p.documents, ...files.map(f => ({ file:f, type, name:f.name }))] }));
  };

  const removeDoc    = i => setForm(p => ({ ...p, documents: p.documents.filter((_,idx) => idx!==i) }));
  const hasDoc       = t => form.documents.some(d => d.type===t);
  const schoolsRequiringForm = () => availableSchools.filter(s => form.schools.includes(s.name) && s.application_form_required);
  const requiredDocs = () => {
    const base = form.grade==='Grade 8' ? ['id','parentId','gradeResult','gradeReport'] : ['id','parentId','removal','gradeResult','gradeReport'];
    const schoolForms = schoolsRequiringForm().map(s => `schoolForm_${s.name}`);
    return [...base, ...schoolForms];
  };
  const allDocsOk    = () => requiredDocs().every(t => hasDoc(t));
  const docsProgress = () => { const req=requiredDocs(); return (req.filter(t=>hasDoc(t)).length/req.length)*100; };

  const validateStep = step => {
    const e = {};
    if (step===0) ['nationalId','firstName','lastName','email','phone','address','city'].forEach(f => { e[f]=validate(f,form[f]); });
    if (step===1) {
      ['schools','grade'].forEach(f => { e[f]=validate(f,form[f]); });
      if (['Grade 10','Grade 11','Grade 12'].includes(form.grade)) e.subject = !form.subject ? 'Subject stream is required.' : '';
      if (form.grade && form.grade!=='Grade 8') e.previousSchool = validate('previousSchool',form.previousSchool);
    }
    if (step===2) ['parentName','parentPhone'].forEach(f => { e[f]=validate(f,form[f]); });
    if (step===3) {
      const uploaded = form.documents.map(d=>d.type);
      requiredDocs().forEach(t => { if (!uploaded.includes(t)) e.documents='Missing required documents.'; });
      if (form.documents.length===0) e.documents='At least one document required.';
    }
    setErrors(e);
    return Object.values(e).every(v=>!v);
  };

  const handleNext   = () => { if (validateStep(activeStep)) setActiveStep(p=>p+1); };
  const handleBack   = () => setActiveStep(p=>p-1);

  const handleSubmit = async e => {
    e.preventDefault();
    if (activeStep!==STEPS.length-1 || !validateStep(activeStep) || form.schools.length===0) return;
    setLoading(true);
    const fd = new FormData();
    Object.keys(form).forEach(k => { if (k!=='documents'&&k!=='schools') fd.append(k,form[k]); });
    fd.append('schools', JSON.stringify(form.schools));
    form.documents.forEach(d => fd.append('documents', d.file));
    fd.append('documentTypes', JSON.stringify(form.documents.map(d=>d.type)));
    try {
      const url = isEditMode ? `${API_BASE}/api/applications/${applicationId}` : `${API_BASE}/api/applications`;
      const res  = await fetch(url, { method: isEditMode?'PUT':'POST', body: fd });
      const data = await res.json();
      if (data.success) { sessionStorage.removeItem('applicationDraft'); navigate(`/applicant-dashboard?nationalId=${encodeURIComponent(form.nationalId)}`); }
      else alert('Submission failed: ' + data.message);
    } catch { alert('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  // Helper for Grid-based steps
  const F = (props) => <FormField {...props} form={form} errors={errors} onChange={handleChange} />;

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 0 — uses flexbox rows with explicit 50% width, NOT MUI Grid
  // This guarantees exactly 2 columns regardless of MUI theme/breakpoints
  // ─────────────────────────────────────────────────────────────────────────
  const renderStep0 = () => (
    <Section title="Learner Information">

      
      <FieldRow>
        <TwoColField>
          <FieldBlock name="nationalId" label="SA ID Number" required
            value={form.nationalId} error={errors.nationalId} onChange={handleChange} />
        </TwoColField>
        <TwoColField>
          <FieldBlock name="dateOfBirth" label="Date of Birth" type="date" readOnly required
            value={form.dateOfBirth} error={errors.dateOfBirth} onChange={handleChange} />
        </TwoColField>
      </FieldRow>

    
      <FieldRow>
        <TwoColField>
          <FieldBlock name="firstName" label="First Name" required
            value={form.firstName} error={errors.firstName} onChange={handleChange} />
        </TwoColField>
        <TwoColField>
          <FieldBlock name="lastName" label="Surname" required
            value={form.lastName} error={errors.lastName} onChange={handleChange} />
        </TwoColField>
      </FieldRow>

      
      <FieldRow>
        <TwoColField>
          <FieldBlock name="gender" label="Gender" readOnly
            value={form.gender} error={errors.gender} onChange={handleChange} />
        </TwoColField>
        <TwoColField>
          <FieldBlock name="phone" label="Phone Number" required type="tel"
            value={form.phone} error={errors.phone} onChange={handleChange} />
        </TwoColField>
      </FieldRow>

      
      <FieldRow>
        <TwoColField>
          <FieldBlock name="email" label="Email Address" type="email" required
            value={form.email} error={errors.email} onChange={handleChange} />
        </TwoColField>
        <TwoColField>
          <FieldBlock name="city" label="City / Town" required
            value={form.city} error={errors.city} onChange={handleChange} />
        </TwoColField>
      </FieldRow>

     
      <FieldRow>
        <FullField>
          <FieldBlock name="address" label="Home Address" multiline rows={3} required
            value={form.address} error={errors.address} onChange={handleChange} />
        </FullField>
      </FieldRow>

    </Section>
  );

  // ── Step 1: School Info ───────────────────────────────────────────────
  const renderStep1 = () => (
    <Section title="School & Academic Information">
      <Grid container spacing={2.5}>

        <Grid item xs={12}>
          <FieldLabel required>
            {preselectedSchool ? 'Applying To' : 'Select School(s)'}
          </FieldLabel>

          {preselectedSchool ? (
            /* Single-school mode — locked display */
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              px: 2, py: 1.25,
              bgcolor: C.navyGhost, border: `1.5px solid ${C.navyBorder}`, borderRadius: '4px',
            }}>
              {availableSchools.find(s => s.name === preselectedSchool)?.image && (
                <img
                  src={availableSchools.find(s => s.name === preselectedSchool).image}
                  alt={preselectedSchool}
                  style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
              )}
              <Box>
                <Typography sx={{ fontFamily: BODY, fontWeight: 700, fontSize: '0.9rem', color: C.navy }}>
                  {preselectedSchool}
                </Typography>
                <Typography sx={{ fontFamily: BODY, fontSize: '0.72rem', color: C.textMuted }}>
                  Single school application — school is pre-selected
                </Typography>
              </Box>
            </Box>
          ) : (
            /* Multi-school mode — dropdown */
            <>
              <FormControl fullWidth size="small" error={!!errors.schools} sx={fieldSx}>
                <Select
                  name="schools" multiple value={form.schools}
                  onChange={handleChange} renderValue={() => ''} MenuProps={selectMenuSx}
                  displayEmpty
                  sx={{ fontFamily:BODY, fontSize:'0.9rem', color:C.text }}
                >
                  {schoolsLoading
                    ? <MenuItem disabled><CircularProgress size={16} sx={{ mr:1 }} /> Loading…</MenuItem>
                    : availableSchools.map(s => (
                      <MenuItem key={s.id} value={s.name} sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
                        <img src={s.image} alt={s.name} style={{ width:30,height:30,borderRadius:'50%',objectFit:'cover',flexShrink:0 }} />
                        <Box>
                          <Typography sx={{ fontFamily:BODY, fontSize:'0.875rem', fontWeight:600, color:C.text }}>{s.name}</Typography>
                          {s.location && <Typography sx={{ fontFamily:BODY, fontSize:'0.72rem', color:C.textMuted }}>{s.location}</Typography>}
                        </Box>
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              <FieldError msg={errors.schools} />
              {form.schools.length > 0 && (
                <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.75, mt:1 }}>
                  {form.schools.map((name, i) => (
                    <Chip key={i} label={name} size="small"
                      onDelete={() => { const v=form.schools.filter((_,idx)=>idx!==i); setForm(p=>({...p,schools:v})); }}
                      sx={{
                        fontFamily:BODY, fontSize:'0.75rem', fontWeight:600,
                        bgcolor:C.navyGhost, border:`1px solid ${C.navyBorder}`,
                        color:C.navy, borderRadius:'4px',
                        '& .MuiChip-deleteIcon':{ color:C.textMuted, fontSize:14 },
                      }}
                    />
                  ))}
                </Box>
              )}
            </>
          )}
        </Grid>

        <Grid item xs={12} sm={6}>
          <FieldLabel required>Grade Applying For</FieldLabel>
          <FormControl fullWidth size="small" error={!!errors.grade} sx={fieldSx}>
            <Select name="grade" value={form.grade} onChange={handleChange} displayEmpty MenuProps={selectMenuSx}
              sx={{ fontFamily:BODY, fontSize:'0.9rem', color:form.grade?C.text:C.textMuted }}>
              <MenuItem value="" disabled><em>Select grade</em></MenuItem>
              {grades.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
            </Select>
          </FormControl>
          <FieldError msg={errors.grade} />
        </Grid>

        {['Grade 10','Grade 11','Grade 12'].includes(form.grade) && (
          <Grid item xs={12} sm={6}>
            <FieldLabel required>Subject Stream</FieldLabel>
            <FormControl fullWidth size="small" error={!!errors.subject} sx={fieldSx}>
              <Select name="subject" value={form.subject} onChange={handleChange} displayEmpty MenuProps={selectMenuSx}
                sx={{ fontFamily:BODY, fontSize:'0.9rem', color:form.subject?C.text:C.textMuted }}>
                <MenuItem value="" disabled><em>Select stream</em></MenuItem>
                {(subjects[form.grade]||[]).map(s => (
                  <MenuItem key={s} value={s}>
                    <Box>
                      <Typography sx={{ fontFamily:BODY, fontSize:'0.875rem', fontWeight:600 }}>{s}</Typography>
                      <Typography sx={{ fontFamily:BODY, fontSize:'0.72rem', color:C.textMuted }}>{subjectDescriptions[s]}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FieldError msg={errors.subject} />
          </Grid>
        )}

        {form.grade && form.grade!=='Grade 8' &&
          F({ name:'previousSchool', label:'Previous School', xs:12, required:true })}
        {F({ name:'achievements', label:'Academic Achievements / Awards', xs:12, multiline:true, rows:2 })}
        {F({ name:'whyAttend',    label:'Why do you want to attend?',      xs:12, multiline:true, rows:2 })}
      </Grid>
    </Section>
  );

  // ── Step 2: Parent / Guardian ─────────────────────────────────────────
  const renderStep2 = () => (
    <Section title="Parent / Guardian Information">
      <Grid container spacing={2}>
        {F({ name:'parentName',       label:'Full Name',     xs:12, required:true })}
        {F({ name:'parentPhone',      label:'Phone Number',  xs:12, sm:6, required:true, type:'tel' })}
        {F({ name:'parentEmail',      label:'Email Address', xs:12, sm:6, type:'email' })}
        {F({ name:'parentOccupation', label:'Occupation',    xs:12, sm:6, required:true })}

        <Grid item xs={12} sm={6}>
          <FieldLabel required>Relationship to Learner</FieldLabel>
          <FormControl fullWidth size="small" error={!!errors.relationship} sx={fieldSx}>
            <Select name="relationship" value={form.relationship} onChange={handleChange} displayEmpty MenuProps={selectMenuSx}
              sx={{ fontFamily:BODY, fontSize:'0.9rem', color:form.relationship?C.text:C.textMuted }}>
              <MenuItem value="" disabled><em>Select relationship</em></MenuItem>
              {['Father','Mother','Guardian','Grandfather','Grandmother','Uncle','Aunt','Sibling','Other'].map(r => (
                <MenuItem key={r} value={r}>{r}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FieldError msg={errors.relationship} />
        </Grid>

        {F({ name:'emergencyContact', label:'Emergency Contact Name', xs:12, sm:6 })}
        {F({ name:'emergencyPhone',   label:'Emergency Phone',        xs:12, sm:6, type:'tel' })}
      </Grid>
    </Section>
  );

  // ── Step 3: Documents ─────────────────────────────────────────────────
  const renderStep3 = () => {
    const req      = requiredDocs();
    const progress = docsProgress();
    const DOC_LABELS = { id:'SA ID Document', parentId:'Parent / Guardian ID Document', removal:'School Removal Letter', gradeResult:'Previous Grade Result', gradeReport:'Grade Report', additional:'Additional Documents' };
    const DOC_ACCEPT = { id:'.pdf,.jpg,.jpeg,.png', parentId:'.pdf,.jpg,.jpeg,.png', removal:'.pdf', gradeResult:'.pdf,.jpg,.jpeg,.png', gradeReport:'.pdf,.jpg,.jpeg,.png', additional:'.pdf,.jpg,.jpeg,.png' };
    const schoolsNeedingForm = schoolsRequiringForm();

    return (
      <>
        <Box sx={{ mb:3, p:2.5, bgcolor:'#fffbeb', border:'1px solid #fde68a', borderLeft:'4px solid #f59e0b', borderRadius:'4px' }}>
          <Typography sx={{ fontFamily:BODY, fontWeight:700, fontSize:'0.85rem', color:'#92400e', mb:1 }}>
            Please ensure all required documents are prepared and ready for upload.
            Incomplete documentation will prevent your application from being submitted.
          </Typography>
          <Box component="ul" sx={{ m:0, pl:2.5 }}>
            {[
              'SA ID / Passport copy',
              'Parent / Guardian ID copy',
              'Latest school report / grade results',
              'Grade report',
              ...(form.grade && form.grade!=='Grade 8' ? ['School removal / transfer letter'] : []),
              ...(schoolsNeedingForm.length > 0 ? schoolsNeedingForm.map(s => `${s.name} — completed application form`) : []),
            ].map(item => (
              <Box component="li" key={item} sx={{ fontFamily:BODY, fontSize:'0.82rem', color:'#78350f', mb:0.3 }}>{item}</Box>
            ))}
          </Box>
        </Box>

        <Section title="Upload Documents">
          <Box sx={{ mb:2.5 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb:0.75 }}>
              <Typography sx={{ fontFamily:BODY, fontSize:'0.78rem', fontWeight:600, color:C.text }}>Upload Progress</Typography>
              <Typography sx={{ fontFamily:BODY, fontSize:'0.78rem', color: progress===100 ? C.success : C.textSub }}>
                {req.filter(t=>hasDoc(t)).length} / {req.length} required documents
              </Typography>
            </Stack>
            <LinearProgress variant="determinate" value={progress}
              sx={{
                height:6, borderRadius:3,
                bgcolor:'rgba(26,58,140,0.08)',
                '& .MuiLinearProgress-bar':{ borderRadius:3, bgcolor: progress===100 ? C.success : C.navy },
              }}
            />
          </Box>

          <Stack spacing={1.25} sx={{ mb:2.5 }}>
            {['id','parentId','gradeResult','gradeReport'].map(t => (
              <UploadRow key={t} docType={t} label={DOC_LABELS[t]} accept={DOC_ACCEPT[t]}
                hasDoc={hasDoc(t)} onUpload={handleFileUpload} />
            ))}
            {form.grade && form.grade!=='Grade 8' && (
              <UploadRow docType="removal" label={DOC_LABELS.removal} accept={DOC_ACCEPT.removal}
                hasDoc={hasDoc('removal')} onUpload={handleFileUpload} />
            )}
            <UploadRow docType="additional" label={DOC_LABELS.additional} accept={DOC_ACCEPT.additional}
              required={false} hasDoc={hasDoc('additional')} onUpload={handleFileUpload} />
          </Stack>

          {/* ── Per-school application forms ── */}
          {schoolsNeedingForm.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Box sx={{ borderLeft: `4px solid #e8a020`, pl: 1.5, mb: 2 }}>
                <Typography sx={{ fontFamily: BODY, fontWeight: 700, fontSize: '0.9rem', color: C.text }}>
                  School Application Forms
                </Typography>
                <Typography sx={{ fontFamily: BODY, fontSize: '0.75rem', color: C.textMuted, mt: 0.25 }}>
                  The following school(s) require you to download, complete, and upload their official application form.
                </Typography>
              </Box>
              <Stack spacing={2}>
                {schoolsNeedingForm.map(school => {
                  const docType = `schoolForm_${school.name}`;
                  return (
                    <Box key={school.id} sx={{ p: 2, border: `1px solid #fde68a`, borderLeft: `4px solid #e8a020`, borderRadius: '4px', bgcolor: '#fffbeb' }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
                        <Stack direction="row" alignItems="center" spacing={1.25}>
                          {school.image && (
                            <img src={school.image} alt={school.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                          )}
                          <Box>
                            <Typography sx={{ fontFamily: BODY, fontWeight: 700, fontSize: '0.85rem', color: C.text }}>{school.name}</Typography>
                            <Typography sx={{ fontFamily: BODY, fontSize: '0.7rem', color: C.textMuted }}>Requires completed application form</Typography>
                          </Box>
                        </Stack>
                        {school.application_form_url && (
                          <Button
                            component="a"
                            href={school.application_form_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="small"
                            variant="outlined"
                            sx={{
                              fontFamily: BODY, fontWeight: 600, fontSize: '0.75rem',
                              textTransform: 'none', px: 2, py: 0.6, borderRadius: '4px',
                              borderColor: '#e8a020', color: '#92400e', flexShrink: 0,
                              '&:hover': { borderColor: '#d97706', bgcolor: 'rgba(232,160,32,0.08)' },
                            }}
                          >
                            Download Form Template
                          </Button>
                        )}
                      </Stack>
                      <UploadRow
                        docType={docType}
                        label="Completed Application Form"
                        accept=".pdf"
                        hasDoc={hasDoc(docType)}
                        onUpload={handleFileUpload}
                      />
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          )}


          {form.documents.length > 0 && (
            <Box sx={{ mb:2, p:2, bgcolor:C.pageBg, border:`1px solid ${C.border}`, borderRadius:'4px' }}>
              <Typography sx={{ fontFamily:BODY, fontSize:'0.78rem', fontWeight:700, color:C.text, mb:1 }}>
                Uploaded Files ({form.documents.length})
              </Typography>
              <Stack spacing={0.75}>
                {form.documents.map((doc,i) => (
                  <Box key={i} sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:1 }}>
                    <Typography sx={{ fontFamily:BODY, fontSize:'0.78rem', color:C.textSub, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
                      <Box component="span" sx={{ color:C.navy, fontWeight:700, mr:0.5 }}>{doc.type}</Box>
                      — {doc.name}
                    </Typography>
                    <Box component="button" onClick={() => removeDoc(i)}
                      sx={{ border:'none', bgcolor:'transparent', cursor:'pointer', color:C.textMuted, p:0.3, display:'flex', alignItems:'center', borderRadius:'3px', '&:hover':{ color:C.error } }}>
                      <DeleteIcon sx={{ fontSize:16 }} />
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {errors.documents && (
            <Box sx={{ mb:2, p:1.5, bgcolor:'rgba(220,38,38,0.05)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:'4px' }}>
              <Typography sx={{ fontFamily:BODY, fontSize:'0.8rem', fontWeight:600, color:C.error }}>⚠ {errors.documents}</Typography>
            </Box>
          )}
        </Section>

        <Section title="Application Summary">
          <Grid container spacing={1.5}>
            {[
              ['Full Name',  `${form.firstName} ${form.lastName}`],
              ['Grade',       form.grade],
              ['School(s)',   form.schools.join(', ')],
              ['Email',       form.email],
              ['Phone',       form.phone],
              ['Parent',      form.parentName],
            ].map(([k,v]) => (
              <Grid item xs={12} sm={6} key={k}>
                <Box sx={{ p:1.5, bgcolor:C.pageBg, border:`1px solid ${C.border}`, borderRadius:'4px' }}>
                  <Typography sx={{ fontFamily:BODY, fontSize:'0.7rem', fontWeight:600, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', mb:0.25 }}>{k}</Typography>
                  <Typography sx={{ fontFamily:BODY, fontSize:'0.88rem', fontWeight:600, color:C.text }}>{v || '—'}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Section>
      </>
    );
  };

  if (loading && isEditMode) return (
    <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'60vh', gap:2, bgcolor:C.pageBg }}>
      <CircularProgress sx={{ color:C.navy }} size={28} />
      <Typography sx={{ fontFamily:BODY, color:C.textSub, fontSize:'0.9rem' }}>Loading application…</Typography>
    </Box>
  );

  const currentStep = STEPS[activeStep];

  return (
    <Box sx={{ bgcolor: C.pageBg, minHeight: '100vh' }}>

      <Box sx={{ bgcolor: C.navy, py: 5.5, px: { xs:2, md:4 } }}>
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
          <Typography sx={{
            fontFamily: DISPLAY, fontWeight:700,
            fontSize: { xs:'1.2rem', md:'1.5rem' },
            color: '#ffffff', textAlign:'center',
          }}>
            {isEditMode
            ? `Edit Application — ${existingApplication?.school || ''}`
            : preselectedSchool
              ? `Application — ${preselectedSchool}`
              : 'School Application Form'}
          </Typography>
          <Typography sx={{ fontFamily:BODY, fontWeight:400, fontSize:'0.82rem', color:'rgba(255,255,255,0.65)', textAlign:'center', mt:0.4 }}>
            KwaZulu-Natal · 2025 / 2026 Academic Year · Fields marked * are required
          </Typography>
        </Box>
      </Box>

      <Box sx={{ bgcolor: C.white, borderBottom: `1px solid ${C.border}` }}>
        <Box sx={{ maxWidth:900, mx:'auto', px:{ xs:2, md:4 }, py:0 }}>
          <Stack direction="row" sx={{ overflowX:'auto' }}>
            {STEPS.map((step, i) => {
              const done   = i < activeStep;
              const active = i === activeStep;
              return (
                <Box key={step.num}
                  sx={{
                    display:'flex', alignItems:'center', gap:1.25,
                    px:{ xs:2, md:3 }, py:1.75,
                    borderBottom: active ? `3px solid ${C.navy}` : '3px solid transparent',
                    cursor: done ? 'pointer' : 'default',
                    transition:'border-color 0.2s', flexShrink:0,
                  }}
                  onClick={() => done && setActiveStep(i)}
                >
                  <Box sx={{
                    width:28, height:28, borderRadius:'50%', flexShrink:0,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    bgcolor: done||active ? C.navy : 'transparent',
                    border: `2px solid ${done||active ? C.navy : C.border}`,
                    color: done||active ? '#fff' : C.textMuted,
                    fontSize:'0.75rem', fontWeight:700, fontFamily:BODY, transition:'all 0.2s',
                  }}>
                    {done ? <CheckIcon sx={{ fontSize:14 }} /> : step.num}
                  </Box>
                  <Typography sx={{
                    fontFamily:BODY, fontWeight:600, fontSize:'0.8rem',
                    color: active ? C.navy : done ? C.textSub : C.textMuted, whiteSpace:'nowrap',
                  }}>
                    {step.label}
                  </Typography>
                  {i < STEPS.length-1 && (
                    <Box sx={{ width:32, height:1, bgcolor:C.border, flexShrink:0, ml:1 }} />
                  )}
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Box>

      <Box sx={{ maxWidth:900, mx:'auto', px:{ xs:2, md:4 }, py:4 }}>

        <Typography sx={{
          fontFamily: DISPLAY, fontWeight:700, fontSize:'1.15rem', color:C.text,
          mb:3, pb:1.5, borderBottom:`1px solid ${C.border}`,
        }}>
          Step {currentStep.num} — {currentStep.label}
        </Typography>

        <Box sx={{
          bgcolor: C.white, border:`1px solid ${C.border}`, borderRadius:'6px',
          p:{ xs:2.5, md:4 }, boxShadow:'0 1px 6px rgba(0,0,0,0.05)',
          animation:'stepIn 0.28s ease',
          '@keyframes stepIn':{ from:{ opacity:0, transform:'translateY(10px)' }, to:{ opacity:1, transform:'none' } },
        }}>
          {activeStep===0 && renderStep0()}
          {activeStep===1 && renderStep1()}
          {activeStep===2 && renderStep2()}
          {activeStep===3 && renderStep3()}
        </Box>

        <Box sx={{
          mt:3, pt:2.5, borderTop:`1px solid ${C.border}`,
          display:'flex', justifyContent:'space-between', alignItems:'center',
          flexWrap:'wrap', gap:1.5,
        }}>
          <Button disabled={activeStep===0} onClick={handleBack} variant="outlined"
            sx={{
              fontFamily:BODY, fontWeight:600, fontSize:'0.88rem',
              textTransform:'none', px:3, py:1, borderRadius:'4px',
              borderColor:C.border, color:C.textSub, borderWidth:2,
              '&:hover':{ borderColor:'#94a3b8', bgcolor:C.pageBg },
              '&:disabled':{ borderColor:C.border, color:C.textMuted },
            }}>
            ← Back
          </Button>

          {activeStep===STEPS.length-1 ? (
            <Button variant="contained" disabled={loading || !allDocsOk()} onClick={handleSubmit}
              startIcon={loading
                ? <CircularProgress size={15} sx={{ color:'rgba(255,255,255,0.5)' }} />
                : <SendIcon sx={{ fontSize:'15px !important' }} />}
              sx={{
                fontFamily:BODY, fontWeight:700, fontSize:'0.9rem',
                textTransform:'none', px:4, py:1.1, borderRadius:'4px',
                bgcolor: allDocsOk() ? C.navy : 'rgba(148,163,184,0.3)',
                color: allDocsOk() ? '#fff' : C.textMuted,
                boxShadow: allDocsOk() ? `0 4px 14px rgba(26,58,140,0.3)` : 'none',
                '&:hover':{ bgcolor: allDocsOk() ? C.navyDark : undefined },
                '&:disabled':{ bgcolor:'rgba(148,163,184,0.2)', color:'rgba(0,0,0,0.3)' },
              }}>
              {loading ? 'Submitting…' : !allDocsOk() ? 'Upload Documents First' : isEditMode ? 'Update Application' : 'Submit Application'}
            </Button>
          ) : (
            <Button variant="contained" onClick={handleNext}
              sx={{
                fontFamily:BODY, fontWeight:700, fontSize:'0.9rem',
                textTransform:'none', px:4, py:1.1, borderRadius:'4px',
                bgcolor:C.navy, color:'#fff',
                boxShadow:`0 4px 14px rgba(26,58,140,0.25)`,
                '&:hover':{ bgcolor:C.navyDark, boxShadow:`0 6px 20px rgba(26,58,140,0.35)` },
              }}>
              Next →
            </Button>
          )}
        </Box>

        <Typography sx={{ fontFamily:BODY, fontSize:'0.72rem', color:C.textMuted, textAlign:'center', mt:2 }}>
          Step {activeStep+1} of {STEPS.length}
        </Typography>
      </Box>
    </Box>
  );
};

export default ApplicationForm;




