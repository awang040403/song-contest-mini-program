// pages/login/login.js
const auth = require('../../utils/auth.js');

// Transparent 1x1 placeholder avatar (data URI) so there is no missing-image flash.
const DEFAULT_AVATAR =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="88" height="88"%3E%3Crect width="88" height="88" rx="44" fill="%23eef0fb"/%3E%3Ctext x="44" y="56" font-size="40" text-anchor="middle" fill="%235b5bd6"%3E%F0%9F%91%A4%3C/text%3E%3C/svg%3E';

Page({
  data: {
    avatar: '',
    nickname: '',
    defaultAvatar: DEFAULT_AVATAR,
    redirect: '' // optional page to return to after login
  },

  onLoad(options) {
    // Pre-fill if already logged in (lets user update their info).
    const user = auth.getCurrentUser();
    if (user) {
      this.setData({ avatar: user.avatar || '', nickname: user.name || '' });
    }
    if (options && options.redirect) {
      this.setData({ redirect: decodeURIComponent(options.redirect) });
    }
  },

  // Fired when the user picks their WeChat avatar.
  onChooseAvatar(e) {
    const url = e.detail.avatarUrl;
    if (url) this.setData({ avatar: url });
  },

  onNickInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  confirmLogin() {
    const nickname = (this.data.nickname || '').trim();
    if (!nickname) {
      wx.showToast({ title: '请填写昵称', icon: 'none' });
      return;
    }

    auth.setCurrentUser({
      name: nickname,
      avatar: this.data.avatar || '',
      loginAt: Date.now()
    });

    wx.showToast({ title: '登录成功', icon: 'success' });

    const redirect = this.data.redirect;
    setTimeout(() => {
      if (redirect) {
        // redirect is a scoring page (navigateTo target).
        wx.redirectTo({
          url: redirect,
          fail: () => wx.switchTab({ url: '/pages/index/index' })
        });
      } else {
        wx.switchTab({ url: '/pages/index/index' });
      }
    }, 600);
  }
});
