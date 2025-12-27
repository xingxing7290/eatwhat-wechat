const authStore = require('../../stores/authStore');

Page({
  data: {
    username: '',
    password: '',
    loading: false,
  },

  onInputUsername(e) {
    this.setData({ username: e.detail.value });
  },

  onInputPassword(e) {
    this.setData({ password: e.detail.value });
  },

  async onSubmit() {
    const { username, password } = this.data;
    if (!username || !password) {
      wx.showToast({ title: '请输入用户名和密码', icon: 'none' });
      return;
    }

    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const r = await authStore.login({ username, password });
      const app = getApp();
      app.globalData.isAuthenticated = true;
      app.globalData.currentUser = r?.user || authStore.getCurrentUser();

      wx.reLaunch({ url: '/pages/calendar/index' });
    } catch (e) {
      wx.showModal({
        title: '登录失败',
        content: e?.message || '服务器错误',
        showCancel: false,
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  goRegister() {
    wx.navigateTo({ url: '/pages/register/index' });
  },
});
