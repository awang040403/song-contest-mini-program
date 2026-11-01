// pages/judge/judge.js
const scoreUtil = require('../../utils/score.js');
const auth = require('../../utils/auth.js');
const db = require('../../utils/db.js');

Page({
  data: {
    contestant: null,
    judgeCount: 5,
    dimensions: [],
    mySeat: -1,           // the fixed judge seat (index) for the logged-in judge
    inputs: [],           // editable values for THIS judge's score
    currentTotal: 0,
    judgeStatus: [],      // per-seat submitted total or null (read-only overview)
    judgeNames: [],       // per-seat judge name for the overview
    finalResult: null,
    submitted: false,     // has THIS judge already submitted? -> locked
    access: 'checking',   // 'checking' | 'granted' | 'guest' | 'denied'
    user: null,
    pendingId: '',        // contestant id, kept so we can resume after login
    loading: false,
    error: ''
  },

  onLoad(options) {
    const id = options.id;
    this.setData({ pendingId: id });

    // ===== Access control gate =====
    if (!auth.isLoggedIn()) {
      this.setData({ access: 'guest', user: null });
      return;
    }
    const user = auth.getCurrentUser();
    const mySeat = auth.judgeSeatOf();
    if (mySeat < 0) {
      this.setData({ access: 'denied', user });
      return;
    }
    const { judgeCount, dimensions } = scoreUtil.getConfig();
    this.setData({ access: 'granted', user, mySeat, judgeCount, dimensions });

    this.loadAll(id);
  },

  // Fetch the contestant + its scores from the cloud.
  loadAll(id) {
    this.setData({ loading: true, error: '' });
    Promise.all([db.listContestants(), db.listScores(id)])
      .then(([cRes, sRes]) => {
        const contestant = cRes.data.find((c) => c._id === id) || null;
        this.setData({ contestant, loading: false }, () => {
          if (contestant) {
            wx.setNavigationBarTitle({ title: `打分 · ${contestant.name}` });
            this.applyScores(sRes.data);
          }
        });
      })
      .catch((err) => {
        this.setData({
          loading: false,
          error: '加载失败：' + (err.message || err)
        });
      });
  },

  // Build the overview + my-own form from the fetched score docs.
  applyScores(scoreDocs) {
    const { judgeCount, dimensions, mySeat } = this.data;
    const seatMap = {};
    (scoreDocs || []).forEach((s) => (seatMap[s.seat] = s));

    const judges = auth.authorizedJudges();
    const judgeStatus = [];
    const judgeNames = [];
    for (let i = 0; i < judgeCount; i++) {
      const entry = seatMap[i];
      judgeStatus.push(entry && typeof entry.total === 'number' ? entry.total : null);
      const j = judges.find((x) => x.seat === i);
      judgeNames.push(j ? j.name : `${i + 1}号`);
    }

    const mine = seatMap[mySeat] || null;
    const submitted = !!(mine && typeof mine.total === 'number');
    const dims = (mine && mine.dims) || {};
    const inputs = dimensions.map((d) => ({
      key: d.key,
      label: d.label,
      max: d.max,
      value: typeof dims[d.key] === 'number' ? String(dims[d.key]) : ''
    }));

    const finalResult = scoreUtil.computeFinal(seatMap, judgeCount);

    this.setData({ judgeStatus, judgeNames, inputs, submitted, finalResult }, () => {
      this.recalcTotal();
    });
  },

  onScoreInput(e) {
    if (this.data.submitted) return;
    const key = e.currentTarget.dataset.key;
    const inputs = this.data.inputs.map((it) =>
      it.key === key ? { ...it, value: e.detail.value } : it
    );
    this.setData({ inputs }, () => this.recalcTotal());
  },

  onScoreBlur(e) {
    if (this.data.submitted) return;
    const key = e.currentTarget.dataset.key;
    const inputs = this.data.inputs.map((it) => {
      if (it.key !== key) return it;
      if (it.value === '') return it;
      let n = Number(it.value);
      if (isNaN(n)) n = 0;
      n = Math.max(0, Math.min(it.max, Math.round(n)));
      return { ...it, value: String(n) };
    });
    this.setData({ inputs }, () => this.recalcTotal());
  },

  recalcTotal() {
    const total = this.data.inputs.reduce((sum, it) => {
      const n = Number(it.value);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
    this.setData({ currentTotal: scoreUtil.round2(total) });
  },

  submitScore() {
    if (this.data.submitted) {
      wx.showToast({ title: '已提交，不可修改', icon: 'none' });
      return;
    }
    const { inputs } = this.data;
    for (const it of inputs) {
      if (it.value === '' || isNaN(Number(it.value))) {
        wx.showToast({ title: `请填写「${it.label}」`, icon: 'none' });
        return;
      }
    }
    wx.showModal({
      title: '确认提交',
      content: '分数提交后将锁定，不能再修改。确定提交？',
      confirmColor: '#5b5bd6',
      success: (res) => {
        if (res.confirm) this.doSubmit();
      }
    });
  },

  doSubmit() {
    const { contestant, mySeat, inputs } = this.data;

    const dims = {};
    let total = 0;
    inputs.forEach((it) => {
      const n = Math.max(0, Math.min(it.max, Math.round(Number(it.value))));
      dims[it.key] = n;
      total += n;
    });
    total = scoreUtil.round2(total);
    const me = auth.getCurrentUser();

    wx.showLoading({ title: '提交中', mask: true });
    db.submitScore({
      contestantId: contestant._id,
      seat: mySeat,
      dims,
      total,
      by: me ? me.name : ''
    })
      .then(() => {
        wx.hideLoading();
        this.setData({ submitted: true });
        wx.showToast({ title: '提交成功', icon: 'success' });
        // Refresh overview so everyone's progress stays in sync.
        return db.listScores(contestant._id).then((r) => this.applyScores(r.data));
      })
      .catch((err) => {
        wx.hideLoading();
        if (err.message === 'already_submitted') {
          this.setData({ submitted: true });
          wx.showToast({ title: '已提交，不可修改', icon: 'none' });
          // Re-sync to show the locked value.
          db.listScores(contestant._id).then((r) => this.applyScores(r.data));
        } else {
          wx.showToast({ title: '提交失败', icon: 'none' });
        }
      });
  },

  goLogin() {
    const redirect = encodeURIComponent(`/pages/judge/judge?id=${this.data.pendingId}`);
    wx.navigateTo({ url: `/pages/login/login?redirect=${redirect}` });
  },

  goBack() {
    wx.navigateBack({
      delta: 1,
      fail: () => wx.switchTab({ url: '/pages/contestants/contestants' })
    });
  },

  viewResults() {
    wx.switchTab({ url: '/pages/results/results' });
  }
});
