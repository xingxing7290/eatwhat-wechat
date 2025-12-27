const { request } = require('../utils/request');
const { normalizeImageUrl } = require('../utils/url');
const { upload } = require('../utils/upload');

let mealsAll = [];
let byId = Object.create(null);
let allLoaded = false;

const STORAGE_KEY = 'mealsAll';
const STORAGE_TS_KEY = 'mealsAllTs';

const rebuildIndex = () => {
  byId = Object.create(null);
  if (!Array.isArray(mealsAll)) {
    mealsAll = [];
  }
  mealsAll.forEach((m) => {
    if (m && m._id) byId[m._id] = m;
  });
};

const loadFromStorage = () => {
  try {
    const cached = wx.getStorageSync(STORAGE_KEY);
    if (Array.isArray(cached)) {
      mealsAll = cached;
      rebuildIndex();
      allLoaded = mealsAll.length > 0;
    }
  } catch (e) {}
};

const saveToStorage = () => {
  try {
    wx.setStorageSync(STORAGE_KEY, mealsAll);
    wx.setStorageSync(STORAGE_TS_KEY, Date.now());
  } catch (e) {}
};

const normalizeMeal = (meal) => {
  if (!meal || typeof meal !== 'object') return meal;
  const out = { ...meal };
  if (out.imageUrl) out.imageUrl = normalizeImageUrl(out.imageUrl);
  if (out.avatarUrl) out.avatarUrl = normalizeImageUrl(out.avatarUrl);

  if (typeof out.tags === 'string') out.tags = [out.tags];
  if (!Array.isArray(out.tags)) out.tags = [];

  if (!Array.isArray(out.ingredients)) out.ingredients = [];
  if (typeof out.steps === 'string') {
    out.steps = out.steps
      .split('\n')
      .map((s) => String(s).trim())
      .filter(Boolean);
  }
  if (!Array.isArray(out.steps)) out.steps = [];

  return out;
};

const parseMealsResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
};

const fetchAll = async () => {
  const data = await request({ url: '/meals', method: 'GET' });
  const list = parseMealsResponse(data).map(normalizeMeal);
  mealsAll = list;
  rebuildIndex();
  allLoaded = true;
  saveToStorage();
  return mealsAll;
};

const fetchList = async ({ search, tag, category, subcategory, page, limit } = {}) => {
  const data = await request({
    url: '/meals',
    method: 'GET',
    data: {
      ...(search ? { search } : {}),
      ...(tag ? { tag } : {}),
      ...(category ? { category } : {}),
      ...(subcategory ? { subcategory } : {}),
      ...(page ? { page } : {}),
      ...(limit ? { limit } : {}),
    },
  });

  const list = parseMealsResponse(data).map(normalizeMeal);
  return { raw: data, list };
};

const fetchById = async (id) => {
  const data = await request({ url: `/meals/${id}`, method: 'GET' });
  const meal = normalizeMeal(data);

  if (meal && meal._id) {
    byId[meal._id] = meal;
    const existedIdx = mealsAll.findIndex((m) => m && m._id === meal._id);
    if (existedIdx >= 0) {
      mealsAll[existedIdx] = meal;
    }
    saveToStorage();
  }

  return meal;
};

const upsertCache = (meal) => {
  const m = normalizeMeal(meal);
  if (!m || !m._id) return;
  byId[m._id] = m;

  const idx = mealsAll.findIndex((x) => x && x._id === m._id);
  if (idx >= 0) {
    mealsAll[idx] = m;
  } else {
    mealsAll.unshift(m);
  }

  allLoaded = true;
  saveToStorage();
};

const removeFromCache = (id) => {
  if (!id) return;
  delete byId[id];
  mealsAll = mealsAll.filter((m) => m && m._id !== id);
  saveToStorage();
};

const createMeal = async ({ payload, imageFilePath } = {}) => {
  if (imageFilePath) {
    const formData = {
      ...(payload || {}),
    };

    if (Array.isArray(formData.tags)) formData.tags = JSON.stringify(formData.tags);
    if (Array.isArray(formData.ingredients)) formData.ingredients = JSON.stringify(formData.ingredients);
    if (Array.isArray(formData.steps)) formData.steps = formData.steps.join('\n');

    const meal = await upload({
      url: '/meals',
      filePath: imageFilePath,
      name: 'image',
      formData,
    });
    upsertCache(meal);
    return normalizeMeal(meal);
  }

  const meal = await request({
    url: '/meals',
    method: 'POST',
    data: payload || {},
  });
  upsertCache(meal);
  return normalizeMeal(meal);
};

const updateMeal = async ({ id, payload, imageFilePath } = {}) => {
  if (!id) throw new Error('缺少菜品ID');

  if (imageFilePath) {
    const formData = {
      ...(payload || {}),
    };

    if (Array.isArray(formData.tags)) formData.tags = JSON.stringify(formData.tags);
    if (Array.isArray(formData.ingredients)) formData.ingredients = JSON.stringify(formData.ingredients);
    if (Array.isArray(formData.steps)) formData.steps = formData.steps.join('\n');

    const meal = await upload({
      url: `/meals/${id}`,
      filePath: imageFilePath,
      name: 'image',
      formData,
    });
    upsertCache(meal);
    return normalizeMeal(meal);
  }

  const meal = await request({
    url: `/meals/${id}`,
    method: 'PUT',
    data: payload || {},
  });
  upsertCache(meal);
  return normalizeMeal(meal);
};

const deleteMeal = async (id) => {
  if (!id) throw new Error('缺少菜品ID');
  await request({ url: `/meals/${id}`, method: 'DELETE' });
  removeFromCache(id);
  return true;
};

const ensureAllLoaded = async () => {
  if (allLoaded && mealsAll.length > 0) return mealsAll;

  loadFromStorage();
  if (allLoaded && mealsAll.length > 0) return mealsAll;

  return fetchAll();
};

const getMealById = (id) => {
  if (!id) return null;
  return byId[id] || null;
};

const getMealNameById = (id) => {
  const m = getMealById(id);
  return m?.name || '';
};

const getAllMeals = () => mealsAll;
const isAllLoaded = () => allLoaded;

module.exports = {
  ensureAllLoaded,
  fetchAll,
  fetchList,
  fetchById,
  createMeal,
  updateMeal,
  deleteMeal,
  getMealById,
  getMealNameById,
  getAllMeals,
  isAllLoaded,
};
