const mealStore = require('../../../../stores/mealStore');

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
    id: '',
    isEdit: false,
    loading: false,
    saving: false,

    name: '',
    category: '',
    subcategory: '',
    description: '',
    tagsText: '',
    stepsText: '',
    ingredientsText: '[]',

    imageUrl: '',
    imageFilePath: '',
  },

  async onLoad(options) {
    const id = options?.id || '';
    const isEdit = !!id;
    this.setData({ id, isEdit });

    if (isEdit) {
      await this.loadDetail();
    }
  },

  async loadDetail() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const meal = await mealStore.fetchById(this.data.id);
      this.setData({
        name: meal?.name || '',
        category: meal?.category || '',
        subcategory: meal?.subcategory || '',
        description: meal?.description || '',
        tagsText: Array.isArray(meal?.tags) ? meal.tags.join(',') : '',
        stepsText: Array.isArray(meal?.steps) ? meal.steps.join('\n') : '',
        ingredientsText: JSON.stringify(Array.isArray(meal?.ingredients) ? meal.ingredients : [], null, 2),
        imageUrl: meal?.imageUrl || '',
      });
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

  onInput(e) {
    const key = e.currentTarget.dataset.key;
    const value = e.detail.value;
    if (!key) return;
    this.setData({ [key]: value });
  },

  async chooseImage() {
    try {
      const pick = await chooseImageOnce();
      const filePath = pick?.tempFilePaths?.[0];
      if (!filePath) return;
      this.setData({ imageFilePath: filePath });
    } catch (e) {}
  },

  buildPayload() {
    const name = (this.data.name || '').trim();
    if (!name) throw new Error('菜品名称不能为空');

    const tags = (this.data.tagsText || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const steps = (this.data.stepsText || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    let ingredients = [];
    const ingredientsText = (this.data.ingredientsText || '').trim();
    if (ingredientsText) {
      try {
        const parsed = JSON.parse(ingredientsText);
        ingredients = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        throw new Error('食材字段必须是有效 JSON 数组');
      }
    }

    return {
      name,
      category: (this.data.category || '').trim(),
      subcategory: (this.data.subcategory || '').trim(),
      description: (this.data.description || '').trim(),
      tags,
      steps,
      ingredients,
    };
  },

  async onSave() {
    if (this.data.saving) return;
    this.setData({ saving: true });

    try {
      const payload = this.buildPayload();

      if (this.data.isEdit) {
        await mealStore.updateMeal({
          id: this.data.id,
          payload,
          imageFilePath: this.data.imageFilePath || undefined,
        });
      } else {
        const created = await mealStore.createMeal({
          payload,
          imageFilePath: this.data.imageFilePath || undefined,
        });
        this.setData({ id: created?._id || this.data.id, isEdit: true });
      }

      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack({ delta: 1 }), 400);
    } catch (e) {
      wx.showModal({
        title: '保存失败',
        content: e?.message || '服务器错误',
        showCancel: false,
      });
    } finally {
      this.setData({ saving: false });
    }
  },
});
