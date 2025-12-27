const mealStore = require('../../../../stores/mealStore');

Page({
  data: {
    keyword: '',
    loading: false,
    meals: [],
    page: 1,
    limit: 50,
  },

  async onShow() {
    await this.refresh();
  },

  onInputKeyword(e) {
    this.setData({ keyword: e.detail.value || '' });
  },

  async onSearch() {
    this.setData({ page: 1 });
    await this.refresh();
  },

  async refresh() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const { keyword, page, limit } = this.data;
      const { list } = await mealStore.fetchList({
        search: keyword.trim() || undefined,
        page,
        limit,
      });
      this.setData({ meals: list });
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

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/subpackages/meals/pages/detail/index?id=${id}` });
  },

  goCreate() {
    wx.navigateTo({ url: '/subpackages/meals/pages/edit/index' });
  },
});
