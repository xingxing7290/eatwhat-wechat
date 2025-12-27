const mealStore = require('../../../../stores/mealStore');
const scheduleStore = require('../../../../stores/scheduleStore');

const MEAL_TYPE_LABEL = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
};

const toYearMonth = (dateStr) => {
  const parts = String(dateStr || '').split('-');
  const year = Number(parts[0] || 0);
  const month = Number(parts[1] || 0);
  return { year, month };
};

const extractMealId = (item) => {
  if (!item) return '';
  if (typeof item === 'object' && item.meal != null) {
    const m = item.meal;
    if (typeof m === 'string') return m;
    if (typeof m === 'object' && m._id) return m._id;
    return '';
  }
  if (typeof item === 'string') return item;
  if (typeof item === 'object' && item._id) return item._id;
  return '';
};

Page({
  data: {
    date: '',
    mealType: 'lunch',
    mealTypeLabel: '午餐',

    keyword: '',
    meals: [],
    filteredMeals: [],

    selectedMeals: [],
    isAllMode: false,

    checkedMealIds: [],
    saving: false,
  },

  applyChecked(meals, checkedMealIds) {
    const set = new Set(Array.isArray(checkedMealIds) ? checkedMealIds : []);
    return (Array.isArray(meals) ? meals : []).map((m) => ({
      ...m,
      _checked: !!(m && m._id && set.has(m._id)),
    }));
  },

  syncFilteredMeals() {
    if (!this.data.isAllMode) return;
    const keyword = (this.data.keyword || '').trim().toLowerCase();
    const base = Array.isArray(this.data.meals) ? this.data.meals : [];

    const filtered = !keyword
      ? base
      : base.filter((m) => {
          const name = String(m?.name || '').toLowerCase();
          const category = String(m?.category || '').toLowerCase();
          const subcategory = String(m?.subcategory || '').toLowerCase();
          return name.includes(keyword) || category.includes(keyword) || subcategory.includes(keyword);
        });

    this.setData({
      filteredMeals: this.applyChecked(filtered, this.data.checkedMealIds),
    });
  },

  syncSelectedMeals() {
    const idSet = new Set(Array.isArray(this.data.checkedMealIds) ? this.data.checkedMealIds : []);
    const base = Array.isArray(this.data.meals) ? this.data.meals : [];
    const selected = base.filter((m) => m && m._id && idSet.has(m._id));
    this.setData({ selectedMeals: this.applyChecked(selected, this.data.checkedMealIds) });
  },

  async onLoad(options) {
    const date = options?.date || '';
    const mealType = options?.mealType || 'lunch';
    const mealTypeLabel = MEAL_TYPE_LABEL[mealType] || mealType;

    this.setData({ date, mealType, mealTypeLabel });

    await mealStore.ensureAllLoaded();
    const meals = mealStore.getAllMeals();

    this.setData({ meals });

    const { year, month } = toYearMonth(date);
    const schedules = await scheduleStore.getMonthSchedules(year, month);
    const day = Array.isArray(schedules) ? schedules.find((s) => s?.date === date) : null;
    const existed = day?.meals?.[mealType] || [];

    const checkedMealIds = (Array.isArray(existed) ? existed : [])
      .map(extractMealId)
      .filter(Boolean);

    this.setData({ checkedMealIds, isAllMode: false, keyword: '' });
    this.syncSelectedMeals();
  },

  onInputKeyword(e) {
    const keyword = e.detail.value || '';
    this.setData({ keyword });
    this.syncFilteredMeals();
  },

  onChangeCheckbox(e) {
    this.setData({ checkedMealIds: e.detail.value || [] });
    this.syncSelectedMeals();
    this.syncFilteredMeals();
  },

  showAllMeals() {
    this.setData({ isAllMode: true });
    this.syncFilteredMeals();
  },

  showSelectedOnly() {
    this.setData({ isAllMode: false, keyword: '' });
    this.syncSelectedMeals();
  },

  async onSave() {
    if (this.data.saving) return;
    this.setData({ saving: true });

    try {
      await scheduleStore.updateSchedule(this.data.date, this.data.mealType, this.data.checkedMealIds);
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

  async onClear() {
    this.setData({ checkedMealIds: [] });
    await this.onSave();
  },
});
