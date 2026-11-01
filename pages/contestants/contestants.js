// pages/contestants/contestants.js
const scoreUtil = require('../../utils/score.js');
const db = require('../../utils/db.js');

Page({
  data: {
    list: [],
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
    this.setData({ loading: true, error: '' });
    Promise.all([db.listContestants(), db.listScores()])
      .then(([cRes, sRes]) => {
        const { judgeCount } = scoreUtil.getConfig();
        const grouped = scoreUtil.groupScores(sRes.data);

        const list = cRes.data.map((c) => {
          const result = scoreUtil.computeFinal(grouped[c._id], judgeCount);
          return {
            id: c._id,
            name: c.name,
            song: c.song,
            language: c.language,
            artist: c.artist,
            number: c.number,
            canDelete: !!c.canDelete,
            final: result.final,
            submitted: result.submitted,
            judgeCount,
            statusText:
              result.submitted === 0
                ? '未打分'
                : result.submitted < judgeCount
                ? `打分中 ${result.submitted}/${judgeCount}`
                : '已完成'
          };
        });

        this.setData({ list, loading: false });
        if (done) done();
      })
      .catch((err) => {
        this.setData({
          loading: false,
          error: '加载失败：' + (err.message || err) + '（请确认已开通云开发并填入 Env ID）'
        });
        if (done) done();
      });
  },

  goJudge(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/judge/judge?id=${id}` });
  },

  // Delete is allowed ONLY for the entry's owner (verified server-side by openid).
  deleteOwn(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.list.find((c) => c.id === id);
    if (!item) return;

    wx.showModal({
      title: '删除报名',
      content: `确定删除你的报名「${item.name} - ${item.song}」？`,
      confirmColor: '#e5484d',
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '删除中', mask: true });
        db.deleteContestant(id)
          .then(() => {
            wx.hideLoading();
            wx.showToast({ title: '已删除', icon: 'success' });
            this.refresh();
          })
          .catch((err) => {
            wx.hideLoading();
            const msg = err.message === 'not_owner' ? '只有报名者本人可删除' : '删除失败';
            wx.showToast({ title: msg, icon: 'none' });
          });
      }
    });
  },

  goSignup() {
    wx.switchTab({ url: '/pages/signup/signup' });
  }
});
