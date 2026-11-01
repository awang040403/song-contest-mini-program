// pages/profile/profile.js
const auth = require('../../utils/auth.js');

const DEFAULT_AVATAR =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="88" height="88"%3E%3Crect width="88" height="88" rx="44" fill="%23eef0fb"/%3E%3Ctext x="44" y="56" font-size="40" text-anchor="middle" fill="%235b5bd6"%3E%F0%9F%91%A4%3C/text%3E%3C/svg%3E';

Page({
  data: {
    user: null,
    isJudge: false,
    authorizedJudges: [],
    defaultAvatar: DEFAULT_AVATAR
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const user = auth.getCurrentUser();
    this.setData({
      user,
      isJudge: auth.isJudge(),
      authorizedJudges: auth.authorizedJudges()
    });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  editProfile() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定退出当前账号？',
      confirmColor: '#5b5bd6',
      success: (res) => {
        if (!res.confirm) return;
        auth.logout();
        this.refresh();
        wx.showToast({ title: '已退出', icon: 'none' });
      }
    });
  }
});
