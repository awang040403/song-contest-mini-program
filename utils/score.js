// utils/score.js
// Pure scoring helpers. These operate on data passed in (fetched from the
// cloud database), so there is no direct storage access here.

function getConfig() {
  let g = {};
  try {
    g = (getApp() && getApp().globalData) || {};
  } catch (e) {
    g = {};
  }
  return {
    judgeCount: g.judgeCount || 5,
    dimensions: g.dimensions || [
      { key: 'vocal', label: '音准/唱功', max: 40 },
      { key: 'emotion', label: '情感表达', max: 30 },
      { key: 'stage', label: '台风表现', max: 20 },
      { key: 'overall', label: '综合印象', max: 10 }
    ]
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Group a flat array of score docs by contestantId.
// Each score doc: { contestantId, seat, dims, total, by, at }
function groupScores(scoreDocs) {
  const map = {};
  (scoreDocs || []).forEach((s) => {
    if (!map[s.contestantId]) map[s.contestantId] = {};
    map[s.contestantId][s.seat] = s;
  });
  return map;
}

// Totals (0-100) submitted for one contestant, given that contestant's
// seat->doc map (e.g. grouped[contestantId]).
function judgeTotals(seatMap, judgeCount) {
  const totals = [];
  for (let j = 0; j < judgeCount; j++) {
    const entry = seatMap && seatMap[j];
    if (entry && typeof entry.total === 'number') {
      totals.push(entry.total);
    }
  }
  return totals;
}

// Standard contest rule: when all judges have scored, drop the highest and
// lowest, then average the rest. Otherwise average what we have.
function computeFinal(seatMap, judgeCount) {
  const totals = judgeTotals(seatMap, judgeCount);
  const submitted = totals.length;

  if (submitted === 0) {
    return { final: null, submitted: 0, judgeCount, used: [], dropped: [] };
  }

  const sorted = [...totals].sort((a, b) => a - b);
  let used = sorted;
  let dropped = [];

  if (submitted === judgeCount && submitted >= 3) {
    dropped = [sorted[0], sorted[sorted.length - 1]];
    used = sorted.slice(1, -1);
  }

  const sum = used.reduce((a, b) => a + b, 0);
  const final = round2(sum / used.length);

  return { final, submitted, judgeCount, used, dropped };
}

// Build a ranked leaderboard from contestants + flat score docs.
function leaderboard(contestants, scoreDocs) {
  const { judgeCount } = getConfig();
  const grouped = groupScores(scoreDocs);

  const rows = (contestants || []).map((c) => {
    const cid = c._id || c.id;
    const result = computeFinal(grouped[cid], judgeCount);
    return {
      id: cid,
      name: c.name,
      song: c.song,
      language: c.language,
      final: result.final,
      submitted: result.submitted,
      judgeCount: result.judgeCount,
      complete: result.submitted === result.judgeCount
    };
  });

  rows.sort((a, b) => {
    const fa = a.final === null ? -1 : a.final;
    const fb = b.final === null ? -1 : b.final;
    return fb - fa;
  });

  let lastScore = null;
  let lastRank = 0;
  rows.forEach((row, i) => {
    if (row.final === null) {
      row.rank = null;
      return;
    }
    if (row.final === lastScore) {
      row.rank = lastRank;
    } else {
      row.rank = i + 1;
      lastRank = row.rank;
      lastScore = row.final;
    }
  });

  return rows;
}

module.exports = {
  getConfig,
  round2,
  groupScores,
  judgeTotals,
  computeFinal,
  leaderboard
};
