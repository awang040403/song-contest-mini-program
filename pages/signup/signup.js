// pages/signup/signup.js
const auth = require('../../utils/auth.js');
const db = require('../../utils/db.js');

Page({
  data: {
    languages: ['英语', '粤语', '西语', '日语', '韩语', '其他'],
    languageIndex: null,
    loggedIn: false,
    form: {
      name: '',
      song: '',
      artist: '',
      customLanguage: '',
      contact: '',
      note: ''
    }
  },

  onShow() {
    // Auto-fill the name from the logged-in WeChat user.
    const user = auth.getCurrentUser();
    if (user && user.name) {
      this.setData({ loggedIn: true });
      // Only prefill if the user hasn't typed a different name yet.
      if (!this.data.form.name) {
        this.setData({ 'form.name': user.name });
      }
    } else {
      this.setData({ loggedIn: false });
    }
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  useMyName() {
    const user = auth.getCurrentUser();
    if (user && user.name) {
      this.setData({ 'form.name': user.name });
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  onLanguageChange(e) {
    this.setData({ languageIndex: Number(e.detail.value) });
  },

  resolveLanguage() {
    const { languageIndex, languages, form } = this.data;
    if (languageIndex === null) return '';
    const chosen = languages[languageIndex];
    if (chosen === '其他') {
      return (form.customLanguage || '').trim();
    }
    return chosen;
  },

  submit() {
    // Signup requires login so the entry has an owner (only the owner can delete it).
    const owner = auth.getCurrentUser();
    if (!owner || !owner.name) {
      wx.showModal({
        title: '请先登录',
        content: '报名需先使用微信登录，报名后仅本人可删除。',
        confirmText: '去登录',
        confirmColor: '#5b5bd6',
        success: (res) => {
          if (res.confirm) wx.navigateTo({ url: '/pages/login/login' });
        }
      });
      return;
    }

    const { form } = this.data;
    const name = form.name.trim();
    const song = form.song.trim();
    const language = this.resolveLanguage();

    if (!name) {
      wx.showToast({ title: '请填写姓名', icon: 'none' });
      return;
    }
    if (!song) {
      wx.showToast({ title: '请填写演唱曲目', icon: 'none' });
      return;
    }
    if (!language) {
      wx.showToast({ title: '请选择演唱语言', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '提交中', mask: true });
    db.signup({
      name,
      song,
      language,
      artist: form.artist.trim(),
      contact: form.contact.trim(),
      note: form.note.trim(),
      owner: owner.name // display name; server also records real openid
    })
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: '报名成功', icon: 'success' });

        this.setData({
          languageIndex: null,
          form: {
            name: '',
            song: '',
            artist: '',
            customLanguage: '',
            contact: '',
            note: ''
          }
        });

        setTimeout(() => {
          wx.switchTab({ url: '/pages/contestants/contestants' });
        }, 700);
      })
      .catch((err) => {
        wx.hideLoading();
        const msg =
          err.message === 'duplicate'
            ? '该选手曲目已报名'
            : '报名失败，请确认云开发已开通';
        wx.showToast({ title: msg, icon: 'none' });
      });
  }
});
