// pages/results/results.js
const scoreUtil = require('../../utils/score.js');
const db = require('../../utils/db.js');

Page({
  data: {
    rows: [],
    champion: null,
    judgeCount: 5,
    loading: true,
    error: ''
  },

  onShow() {
    this.refresh();
  },

  onPullDownRefresh() {
    this.refresh(() => wx.stopPullDownRefresh());
  },

  refresh(done) {
    const { judgeCount } = scoreUtil.getConfig();
    this.setData({ loading: true, error: '' });

    Promise.all([db.listContestants(), db.listScores()])
      .then(([cRes, sRes]) => {
        const rows = scoreUtil.leaderboard(cRes.data, sRes.data);

        let champion = null;
        const topComplete = rows.filter((r) => r.complete && r.final !== null);
        if (topComplete.length > 0) champion = topComplete[0];

        this.setData({ rows, champion, judgeCount, loading: false });
        if (done) done();
      })
      .catch((err) => {
        this.setData({
          loading: false,
          error: '加载失败：' + (err.message || err)
        });
        if (done) done();
      });
  },

  resetAll() {
    // Global reset is admin-only and protected by a PIN on the server.
    wx.showModal({
      title: '清空所有数据',
      content: '将删除全部选手与打分记录，且不可恢复。需要管理员 PIN。',
      editable: true,
      placeholderText: '请输入管理员 PIN',
      confirmColor: '#e5484d',
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '清空中', mask: true });
        db.resetAll(res.content || '')
          .then(() => {
            wx.hideLoading();
            wx.showToast({ title: '已清空', icon: 'success' });
            this.refresh();
          })
          .catch((err) => {
            wx.hideLoading();
            const msg = err.message === 'bad_pin' ? 'PIN 不正确' : '清空失败';
            wx.showToast({ title: msg, icon: 'none' });
          });
      }
    });
  }
});
