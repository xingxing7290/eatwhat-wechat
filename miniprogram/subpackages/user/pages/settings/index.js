const authStore = require('../../../../stores/authStore');

const chooseImageOnce = () =>
  new Promise((resolve, reject) => {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: resolve,
      fail: reject,
    });
  });

Page({
  data: {
    user: null,
    displayName: '',
    loading: false,
    uploading: false,
  },

  onShow() {
    const app = getApp();
    const user = app.globalData.currentUser || authStore.getCurrentUser();
    this.setData({
      user,
      displayName: user?.displayName || '',
    });
  },

  onInputDisplayName(e) {
    this.setData({ displayName: e.detail.value });
  },

  async saveDisplayName() {
    if (this.data.loading) return;

    const displayName = (this.data.displayName || '').trim();
    this.setData({ loading: true });

    try {
      const r = await authStore.updateProfile({ displayName });
      const app = getApp();
      app.globalData.currentUser = r?.user || authStore.getCurrentUser();
      this.setData({ user: app.globalData.currentUser });
      wx.showToast({ title: '已保存', icon: 'success' });
    } catch (e) {
      wx.showModal({
        title: '保存失败',
        content: e?.message || '服务器错误',
        showCancel: false,
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  async chooseAndUploadAvatar() {
    if (this.data.uploading) return;

    try {
      const pick = await chooseImageOnce();
      const filePath = pick?.tempFilePaths?.[0];
      if (!filePath) return;

      this.setData({ uploading: true });
      const r = await authStore.uploadAvatar({ filePath });
      const app = getApp();
      app.globalData.currentUser = r?.user || authStore.getCurrentUser();
      this.setData({ user: app.globalData.currentUser });
      wx.showToast({ title: '头像已更新', icon: 'success' });
    } catch (e) {
      wx.showModal({
        title: '上传失败',
        content: e?.message || '服务器错误',
        showCancel: false,
      });
    } finally {
      this.setData({ uploading: false });
    }
  },
});
