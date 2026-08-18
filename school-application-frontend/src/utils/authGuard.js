// Shared 401 handling for every authenticated portal (school admin, teacher,
// student, parent, system admin). Each portal previously duplicated its own
// "clear session + redirect to login" logic (or, on most pages, didn't have
// it at all) — an expired token just made API calls fail silently instead of
// sending the user back to log in.
const ROLE_CONFIG = {
  admin:   { clearKeys: ['adminToken', 'adminSchool', 'adminName'], loginPath: '/login' },
  teacher: { clearKeys: ['teacherToken', 'teacherFirstName', 'teacherLastName', 'teacherSchool'], loginPath: '/teacher-login' },
  student: { clearKeys: ['studentToken'], loginPath: '/student-login' },
  parent:  { clearKeys: ['parentToken', 'parentFirstName'], loginPath: '/parent-login' },
  system:  { clearKeys: ['systemToken', 'systemUsername'], loginPath: '/system/login' },
};

// Pass one Response, or an array of them (e.g. from Promise.all). If any is a
// 401, clears that role's session and sends the user back to its login page.
// Returns true when it redirected — callers should stop processing:
//   if (handleUnauthorized('student', res)) return;
export function handleUnauthorized(role, responses) {
  const list = Array.isArray(responses) ? responses : [responses];
  if (!list.some(r => r?.status === 401)) return false;
  const config = ROLE_CONFIG[role];
  config.clearKeys.forEach(k => sessionStorage.removeItem(k));
  window.location.href = config.loginPath;
  return true;
}
