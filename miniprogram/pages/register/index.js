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
      await authStore.register({ username, password });
      wx.showToast({ title: '注册成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack({
          delta: 1,
          fail: () => wx.reLaunch({ url: '/pages/login/index' }),
        });
      }, 600);
    } catch (e) {
      wx.showModal({
        title: '注册失败',
        content: e?.message || '服务器错误',
        showCancel: false,
      });
    } finally {
      this.setData({ loading: false });
    }
  },
});
