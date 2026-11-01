// cloudfunctions/contest/index.js
// Single aggregating cloud function for the song contest.
// Runs with admin DB privileges, so it can read/tally everyone's data and
// enforce ownership rules using the caller's real WeChat openid.
//
// Actions:
//   listContestants         -> all contestants (with each caller's canDelete flag)
//   signup {payload}        -> create a contestant owned by the caller
//   deleteContestant {id}   -> delete ONLY if caller is the owner
//   listScores {contestantId?} -> score docs (all, or for one contestant)
//   submitScore {contestantId, seat, dims, total} -> write caller's own seat; locked after submit
//   resetAll {pin}          -> wipe everything (admin; optional PIN)

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;
const CONTESTANTS = db.collection('contestants');
const SCORES = db.collection('scores');

// Optional admin PIN for the global reset. Change to your own, or set to ''
// to disable the PIN check.
const ADMIN_PIN = '1234';

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const action = event.action;

  try {
    switch (action) {
      case 'listContestants':
        return await listContestants(OPENID);
      case 'signup':
        return await signup(OPENID, event.payload || {});
      case 'deleteContestant':
        return await deleteContestant(OPENID, event.id);
      case 'listScores':
        return await listScores(event.contestantId);
      case 'submitScore':
        return await submitScore(OPENID, event);
      case 'resetAll':
        return await resetAll(event.pin);
      default:
        return { ok: false, error: 'unknown_action' };
    }
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
};

async function listContestants(openid) {
  // Fetch up to 100 contestants ordered by their number.
  const res = await CONTESTANTS.orderBy('number', 'asc').limit(100).get();
  const data = res.data.map((c) => ({
    ...c,
    canDelete: c._ownerOpenid === openid // only owner may delete
  }));
  return { ok: true, data };
}

async function signup(openid, payload) {
  const name = String(payload.name || '').trim();
  const song = String(payload.song || '').trim();
  const language = String(payload.language || '').trim();
  if (!name || !song || !language) {
    return { ok: false, error: 'missing_fields' };
  }

  // Prevent exact duplicate (same name + song).
  const dup = await CONTESTANTS.where({ name, song }).count();
  if (dup.total > 0) {
    return { ok: false, error: 'duplicate' };
  }

  const total = await CONTESTANTS.count();
  const doc = {
    number: total.total + 1,
    name,
    song,
    language,
    artist: String(payload.artist || '').trim(),
    contact: String(payload.contact || '').trim(),
    note: String(payload.note || '').trim(),
    owner: String(payload.owner || '').trim(), // display name of signer
    _ownerOpenid: openid, // real identity used to authorize deletion
    createdAt: Date.now()
  };
  const added = await CONTESTANTS.add({ data: doc });
  return { ok: true, id: added._id };
}

async function deleteContestant(openid, id) {
  if (!id) return { ok: false, error: 'missing_id' };
  const res = await CONTESTANTS.doc(id).get().catch(() => null);
  if (!res || !res.data) return { ok: false, error: 'not_found' };

  // Ownership check by real openid — only the signer can delete.
  if (res.data._ownerOpenid !== openid) {
    return { ok: false, error: 'not_owner' };
  }

  await CONTESTANTS.doc(id).remove();
  // Remove that contestant's score docs too.
  await SCORES.where({ contestantId: id }).remove();
  return { ok: true };
}

async function listScores(contestantId) {
  const query = contestantId ? SCORES.where({ contestantId }) : SCORES;
  const res = await query.limit(1000).get();
  return { ok: true, data: res.data };
}

async function submitScore(openid, event) {
  const { contestantId, seat, dims, total } = event;
  if (!contestantId || seat == null) {
    return { ok: false, error: 'missing_fields' };
  }

  // One score per (contestant, seat). If one already exists -> locked.
  const existing = await SCORES.where({ contestantId, seat }).get();
  if (existing.data.length > 0) {
    return { ok: false, error: 'already_submitted' };
  }

  await SCORES.add({
    data: {
      contestantId,
      seat,
      dims: dims || {},
      total: Number(total) || 0,
      byOpenid: openid,
      by: String(event.by || '').trim(),
      at: Date.now()
    }
  });
  return { ok: true };
}

async function resetAll(pin) {
  if (ADMIN_PIN && String(pin || '') !== ADMIN_PIN) {
    return { ok: false, error: 'bad_pin' };
  }
  // Remove all docs. where(_.exists) matches every document.
  await CONTESTANTS.where({ _id: _.exists(true) }).remove();
  await SCORES.where({ _id: _.exists(true) }).remove();
  return { ok: true };
}
