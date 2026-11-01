// utils/auth.js
// Lightweight auth/session helpers built on local storage.
// A "user" is captured at login from the WeChat profile (nickname + avatar).
// Judge access is granted only if the user's name matches an authorized judge,
// and each judge is bound to a fixed seat (judge index) they alone may edit.

const USER_KEY = 'currentUser';

function getApp_() {
  // Safe getApp wrapper for modules required before App() runs.
  try {
    return getApp() || {};
  } catch (e) {
    return {};
  }
}

// Returns the raw authorizedJudges config. Supports both the current
// [{ name, seat }] shape and a legacy flat string array.
function authorizedJudges() {
  const g = getApp_().globalData || {};
  const list = g.authorizedJudges || [];
  return list.map((j, i) =>
    typeof j === 'string' ? { name: j, seat: i } : { name: j.name, seat: j.seat }
  );
}

function normalize(s) {
  return String(s == null ? '' : s).trim().toLowerCase();
}

// The currently logged-in user, or null.
function getCurrentUser() {
  return wx.getStorageSync(USER_KEY) || null;
}

// Persist the logged-in user. Expects { name, avatar }.
function setCurrentUser(user) {
  wx.setStorageSync(USER_KEY, user);
}

function logout() {
  wx.removeStorageSync(USER_KEY);
}

function isLoggedIn() {
  const u = getCurrentUser();
  return !!(u && u.name);
}

// Find the judge config entry for a name (or the current user).
function judgeEntryOf(name) {
  const target = typeof name === 'string' ? name : (getCurrentUser() || {}).name;
  if (!target) return null;
  const t = normalize(target);
  return authorizedJudges().find((j) => normalize(j.name) === t) || null;
}

// Is the given name (or current user) an authorized judge?
function isJudge(name) {
  return !!judgeEntryOf(name);
}

// The fixed seat (judge index) assigned to a name/current user, or -1.
function judgeSeatOf(name) {
  const entry = judgeEntryOf(name);
  return entry ? entry.seat : -1;
}

module.exports = {
  USER_KEY,
  authorizedJudges,
  getCurrentUser,
  setCurrentUser,
  logout,
  isLoggedIn,
  isJudge,
  judgeEntryOf,
  judgeSeatOf
};
