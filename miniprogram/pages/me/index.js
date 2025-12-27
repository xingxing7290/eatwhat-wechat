const authStore = require('../../stores/authStore');

Page({
  data: {
    user: null,
  },

  onShow() {
    const app = getApp();
    this.setData({ user: app.globalData.currentUser || authStore.getCurrentUser() });
  },

  goSettings() {
    wx.navigateTo({ url: '/subpackages/user/pages/settings/index' });
  },

  goMeals() {
    wx.navigateTo({ url: '/subpackages/meals/pages/list/index' });
  },

  logout() {
    authStore.clear();
    const app = getApp();
    app.globalData.isAuthenticated = false;
    app.globalData.currentUser = null;
    wx.reLaunch({ url: '/pages/login/index' });
  },
});
