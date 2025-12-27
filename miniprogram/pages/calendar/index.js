const authStore = require('../../stores/authStore');
const mealStore = require('../../stores/mealStore');
const scheduleStore = require('../../stores/scheduleStore');
const { normalizeImageUrl } = require('../../utils/url');

const MAX_ITEMS_PER_GROUP = 2;

const WEEKDAY_CN = ['日', '一', '二', '三', '四', '五', '六'];

const pad2 = (n) => String(n).padStart(2, '0');

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const buildWeekdayText = (year, month, day) => {
  const d = new Date(year, month - 1, day);
  const idx = d.getDay();
  return `周${WEEKDAY_CN[idx] || ''}`;
};

const getYearMonth = (d = new Date()) => {
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
};

Page({
  data: {
    year: 0,
    month: 0,
    loading: false,
    schedules: [],
    days: [],
    mealTypes: [
      { key: 'breakfast', label: '早' },
      { key: 'lunch', label: '午' },
      { key: 'dinner', label: '晚' },
    ],
  },

  async onShow() {
    const app = getApp();

    if (!app.globalData.authInitDone) {
      wx.showLoading({ title: '加载中' });
      await new Promise((r) => setTimeout(r, 300));
      wx.hideLoading();
    }

    if (!app.globalData.isAuthenticated) {
      wx.reLaunch({ url: '/pages/login/index' });
      return;
    }

    if (this.data.year === 0) {
      const { year, month } = getYearMonth();
      this.setData({ year, month });
    }

    await this.refreshMonth();
  },

  async refreshMonth() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      await mealStore.ensureAllLoaded();
      const { year, month } = this.data;
      const schedules = await scheduleStore.getMonthSchedules(year, month);
      const todayStr = getTodayStr();
      const days = this.buildMonthDays(year, month, schedules, todayStr);
      this.setData({ schedules, days });

      const todayParts = todayStr.split('-');
      const todayYear = Number(todayParts[0] || 0);
      const todayMonth = Number(todayParts[1] || 0);
      if (todayYear === year && todayMonth === month) {
        setTimeout(() => this.scrollToDate(todayStr), 60);
      }
    } catch (e) {
      wx.showModal({
        title: '加载失败',
        content: e?.message || '服务器错误',
        showCancel: false,
      });

      if (!authStore.getToken()) {
        wx.reLaunch({ url: '/pages/login/index' });
      }
    } finally {
      this.setData({ loading: false });
    }
  },

  buildMonthDays(year, month, schedules, todayStr) {
    const scheduleByDate = Object.create(null);
    (Array.isArray(schedules) ? schedules : []).forEach((s) => {
      if (s && s.date) scheduleByDate[s.date] = s;
    });

    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${pad2(month)}-${pad2(day)}`;
      const displayDate = `${pad2(month)}-${pad2(day)}`;
      const weekdayText = buildWeekdayText(year, month, day);
      const displayDateText = `${displayDate} ${weekdayText}`;
      const isToday = !!(todayStr && date === todayStr);
      const schedule = scheduleByDate[date] || {
        date,
        meals: { breakfast: [], lunch: [], dinner: [] },
      };

      days.push({
        key: date,
        date,
        displayDate,
        displayDateText,
        day,
        todayClass: isToday ? 'today' : '',
        mealGroups: this.buildMealGroups(schedule),
      });
    }

    return days;
  },

  scrollToDate(date) {
    if (!date) return;
    const id = `#day-${date}`;
    const q = wx.createSelectorQuery().in(this);
    q.select(id).boundingClientRect();
    q.selectViewport().scrollOffset();
    q.exec((res) => {
      const rect = res && res[0];
      const viewport = res && res[1];
      if (!rect || !viewport) return;
      const top = rect.top + viewport.scrollTop - 120;
      wx.pageScrollTo({ scrollTop: top < 0 ? 0 : top, duration: 300 });
    });
  },

  buildMealGroups(schedule) {
    const safeMeals = schedule?.meals || {};
    const types = [
      { key: 'breakfast', label: '早' },
      { key: 'lunch', label: '午' },
      { key: 'dinner', label: '晚' },
    ];

    return types.map((t) => {
      const arr = Array.isArray(safeMeals[t.key]) ? safeMeals[t.key] : [];
      const allItems = arr.map((it, idx) => this.normalizeMealItem(it, idx)).filter(Boolean);

      const maxLen = allItems.reduce((m, it) => Math.max(m, String(it?.mealName || '').length), 0);
      let maxItems = MAX_ITEMS_PER_GROUP;
      if (maxLen > 10) maxItems = 1;
      else maxItems = 2;

      const items = allItems.slice(0, Math.min(maxItems, MAX_ITEMS_PER_GROUP));
      const moreCount = Math.max(0, allItems.length - items.length);
      return {
        key: t.key,
        label: t.label,
        items,
        moreCount,
      };
    });
  },

  normalizeMealItem(item, idx) {
    if (!item) return null;

    let meal = null;
    let addedBy = null;

    if (typeof item === 'object' && item.meal !== undefined) {
      meal = item.meal;
      addedBy = item.addedBy || null;
    } else {
      meal = item;
      addedBy = null;
    }

    let mealId = '';
    let mealName = '';
    if (typeof meal === 'string') {
      mealId = meal;
      mealName = mealStore.getMealNameById(mealId) || '未知菜品';
    } else if (typeof meal === 'object' && meal) {
      if (meal._id) mealId = meal._id;
      mealName = meal.name || (mealId ? mealStore.getMealNameById(mealId) : '') || '未知菜品';
    }

    const avatarUrlRaw = addedBy?.avatarUrl || '';
    const avatarUrl = avatarUrlRaw ? normalizeImageUrl(avatarUrlRaw) : '';
    const displayName = (addedBy?.displayName || addedBy?.username || '').trim();
    const avatarText = displayName ? displayName.slice(0, 1).toUpperCase() : '';

    return {
      key: `${mealId || mealName || 'item'}-${idx}`,
      mealId,
      mealName,
      avatarUrl,
      avatarText,
    };
  },

  onTapMealGroup(e) {
    const date = e.currentTarget.dataset.date;
    const mealType = e.currentTarget.dataset.mealType;
    if (!date || !mealType) return;
    wx.navigateTo({
      url: `/subpackages/schedule/pages/select/index?date=${date}&mealType=${mealType}`,
    });
  },

  async prevMonth() {
    let { year, month } = this.data;
    month -= 1;
    if (month <= 0) {
      year -= 1;
      month = 12;
    }
    this.setData({ year, month });
    await this.refreshMonth();
  },

  async nextMonth() {
    let { year, month } = this.data;
    month += 1;
    if (month > 12) {
      year += 1;
      month = 1;
    }
    this.setData({ year, month });
    await this.refreshMonth();
  },

  goMe() {
    wx.navigateTo({ url: '/pages/me/index' });
  },

  goMeals() {
    wx.navigateTo({ url: '/subpackages/meals/pages/list/index' });
  },
});
