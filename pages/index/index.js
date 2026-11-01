// pages/index/index.js
const scoreUtil = require('../../utils/score.js');
const auth = require('../../utils/auth.js');
const db = require('../../utils/db.js');

Page({
  data: {
    contestantCount: 0,
    judgeCount: 5,
    scoredCount: 0,
    user: null
  },

  onShow() {
    this.setData({ user: auth.getCurrentUser() });
    this.refresh();
  },

  refresh() {
    const { judgeCount } = scoreUtil.getConfig();
    this.setData({ judgeCount });

    Promise.all([db.listContestants(), db.listScores()])
      .then(([cRes, sRes]) => {
        const grouped = scoreUtil.groupScores(sRes.data);
        const scoredCount = cRes.data.filter(
          (c) => scoreUtil.computeFinal(grouped[c._id], judgeCount).final !== null
        ).length;
        this.setData({
          contestantCount: cRes.data.length,
          scoredCount
        });
      })
      .catch(() => {
        // Cloud not ready yet — show zeros rather than crashing.
        this.setData({ contestantCount: 0, scoredCount: 0 });
      });
  },

  go(e) {
    const url = e.currentTarget.dataset.url;
    // Tab pages must use switchTab; others use navigateTo.
    const tabUrls = [
      '/pages/signup/signup',
      '/pages/contestants/contestants',
      '/pages/results/results',
      '/pages/profile/profile'
    ];
    if (tabUrls.indexOf(url) !== -1) {
      wx.switchTab({ url });
    } else {
      wx.navigateTo({ url });
    }
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  goProfile() {
    wx.switchTab({ url: '/pages/profile/profile' });
  }
});
