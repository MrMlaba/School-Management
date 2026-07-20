// Single source of truth for the color/type values already shared — by copy,
// not by import — across TeacherDashboard, ManagementDashboard, AdminPage,
// SchoolSetupPage, and TimetablePage. Change a value here and it now
// propagates through the MUI theme instead of needing to be hunted down in
// five separate `const C = {...}` blocks.
//
// StudentDashboard (its own `T` palette) and Navbar (gold/glass marketing
// overlay) are deliberately distinct sub-brands, not drift — they are not
// folded into `core` below.

export const core = {
  brand:      '#1A3557',
  brandDark:  '#122740',
  accent:     '#2E7D32',
  accentBg:   '#E8F5E9',
  danger:     '#C62828',
  dangerBg:   '#FFEBEE',
  warn:       '#D97706',
  warnBg:     '#FFFBEB',
  link:       '#1565C0',
  border:     '#B8C2CC',
  headerBg:   '#F8FAFC',
  bg:         '#F0F4F8',
  text:       '#000000',
  muted:      '#6B7C93',
  white:      '#FFFFFF',
};

export const fontFamily = {
  body: "'IBM Plex Sans', 'Roboto', 'Helvetica', 'Arial', sans-serif",
};
