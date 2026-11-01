// utils/db.js
// Client-side wrapper around the "contest" cloud function.
// All contest data (contestants + scores) lives in the cloud database so
// every device shares one synced dataset.

function callContest(data) {
  return new Promise((resolve, reject) => {
    if (!wx.cloud) {
      reject(new Error('CLOUD_UNAVAILABLE'));
      return;
    }
    wx.cloud.callFunction({
      name: 'contest',
      data,
      success: (res) => {
        const r = res && res.result;
        if (r && r.ok) resolve(r);
        else reject(new Error((r && r.error) || 'CALL_FAILED'));
      },
      fail: (err) => reject(err)
    });
  });
}

// ---- Contestants ----
function listContestants() {
  return callContest({ action: 'listContestants' });
}
function signup(payload) {
  return callContest({ action: 'signup', payload });
}
function deleteContestant(id) {
  return callContest({ action: 'deleteContestant', id });
}

// ---- Scores ----
function listScores(contestantId) {
  return callContest({ action: 'listScores', contestantId });
}
function submitScore(args) {
  return callContest({ action: 'submitScore', ...args });
}

// ---- Admin ----
function resetAll(pin) {
  return callContest({ action: 'resetAll', pin });
}

module.exports = {
  callContest,
  listContestants,
  signup,
  deleteContestant,
  listScores,
  submitScore,
  resetAll
};
