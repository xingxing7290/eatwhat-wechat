const { request } = require('../utils/request');

const mem = Object.create(null);

const toYearMonth = (dateStr) => {
  const parts = String(dateStr || '').split('-');
  const year = Number(parts[0] || 0);
  const month = Number(parts[1] || 0);
  return { year, month };
};

const getMonthKey = (year, month) => {
  const y = String(year);
  const m = String(month).padStart(2, '0');
  return `${y}-${m}`;
};

const storageKeyForMonth = (year, month) => `schedules:${getMonthKey(year, month)}`;

const buildByDate = (schedules) => {
  const out = Object.create(null);
  if (!Array.isArray(schedules)) return out;
  schedules.forEach((s) => {
    if (s && s.date) out[s.date] = s;
  });
  return out;
};

const loadMonthFromStorage = (year, month) => {
  try {
    const cached = wx.getStorageSync(storageKeyForMonth(year, month));
    if (cached && Array.isArray(cached.data)) {
      return cached.data;
    }
    if (Array.isArray(cached)) {
      return cached;
    }
  } catch (e) {}
  return null;
};

const saveMonthToStorage = (year, month, schedules) => {
  try {
    wx.setStorageSync(storageKeyForMonth(year, month), {
      ts: Date.now(),
      data: schedules,
    });
  } catch (e) {}
};

const fetchMonthSchedules = async (year, month) => {
  const schedules = await request({
    url: '/schedules',
    method: 'GET',
    data: { year, month },
  });

  const monthKey = getMonthKey(year, month);
  mem[monthKey] = {
    schedules: Array.isArray(schedules) ? schedules : [],
    byDate: buildByDate(schedules),
  };

  saveMonthToStorage(year, month, mem[monthKey].schedules);

  return mem[monthKey].schedules;
};

const getMonthSchedules = async (year, month, { forceRefresh = false } = {}) => {
  const monthKey = getMonthKey(year, month);

  if (!forceRefresh && mem[monthKey]?.schedules) {
    return mem[monthKey].schedules;
  }

  if (!forceRefresh) {
    const cached = loadMonthFromStorage(year, month);
    if (cached) {
      mem[monthKey] = {
        schedules: cached,
        byDate: buildByDate(cached),
      };
      return cached;
    }
  }

  return fetchMonthSchedules(year, month);
};

const getByDate = (year, month) => {
  const monthKey = getMonthKey(year, month);
  return mem[monthKey]?.byDate || Object.create(null);
};

const updateSchedule = async (date, mealType, mealIds) => {
  const data = await request({
    url: `/schedules/${date}/${mealType}`,
    method: 'PUT',
    data: { mealIds: Array.isArray(mealIds) ? mealIds : [] },
  });

  const { year, month } = toYearMonth(date);
  if (year && month) {
    const monthKey = getMonthKey(year, month);
    const prev = mem[monthKey]?.schedules;

    if (Array.isArray(prev)) {
      const next = prev.map((s) => (s?.date === date ? data : s));
      mem[monthKey] = {
        schedules: next,
        byDate: buildByDate(next),
      };
      saveMonthToStorage(year, month, next);
    }
  }

  return data;
};

module.exports = {
  getMonthSchedules,
  fetchMonthSchedules,
  getByDate,
  updateSchedule,
};
