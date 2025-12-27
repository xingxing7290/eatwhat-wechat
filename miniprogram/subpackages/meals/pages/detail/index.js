const mealStore = require('../../../../stores/mealStore');

Page({
  data: {
    id: '',
    meal: null,
    tagsText: '',
    loading: false,
    deleting: false,
  },

  async onLoad(options) {
    const id = options?.id || '';
    this.setData({ id });
    await this.refresh();
  },

  async refresh() {
    if (!this.data.id) return;
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const meal = await mealStore.fetchById(this.data.id);
      const tagsText = Array.isArray(meal?.tags) ? meal.tags.join(' / ') : '';
      this.setData({ meal, tagsText });
    } catch (e) {
      wx.showModal({
        title: '加载失败',
        content: e?.message || '服务器错误',
        showCancel: false,
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  goEdit() {
    wx.navigateTo({ url: `/subpackages/meals/pages/edit/index?id=${this.data.id}` });
  },

  async onDelete() {
    if (this.data.deleting) return;

    const ok = await new Promise((resolve) => {
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这个菜品吗？',
        success: (res) => resolve(!!res.confirm),
        fail: () => resolve(false),
      });
    });

    if (!ok) return;

    this.setData({ deleting: true });
    try {
      await mealStore.deleteMeal(this.data.id);
      wx.showToast({ title: '已删除', icon: 'success' });
      setTimeout(() => wx.navigateBack({ delta: 1 }), 400);
    } catch (e) {
      wx.showModal({
        title: '删除失败',
        content: e?.message || '服务器错误',
        showCancel: false,
      });
    } finally {
      this.setData({ deleting: false });
    }
  },
});
