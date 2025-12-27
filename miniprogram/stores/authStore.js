const { request } = require('../utils/request');
const { upload } = require('../utils/upload');

let token = '';
let currentUser = null;

const loadFromStorage = () => {
  try {
    token = wx.getStorageSync('token') || '';
    currentUser = wx.getStorageSync('currentUser') || null;
  } catch (e) {
    token = '';
    currentUser = null;
  }
};

const persist = () => {
  try {
    wx.setStorageSync('token', token || '');
    wx.setStorageSync('currentUser', currentUser || null);
  } catch (e) {}
};

const setToken = (nextToken) => {
  token = nextToken || '';
  persist();
};

const setCurrentUser = (user) => {
  currentUser = user || null;
  persist();
};

const clear = () => {
  token = '';
  currentUser = null;
  try {
    wx.removeStorageSync('token');
    wx.removeStorageSync('currentUser');
  } catch (e) {}
};

const login = async ({ username, password }) => {
  const data = await request({
    url: '/auth/login',
    method: 'POST',
    data: { username, password },
  });

  if (data?.token) {
    setToken(data.token);
  }

  if (data?.user) {
    setCurrentUser(data.user);
  }

  return data;
};

const updateProfile = async ({ displayName }) => {
  const data = await request({
    url: '/auth/profile',
    method: 'PUT',
    data: { displayName },
  });

  if (data?.user) {
    setCurrentUser(data.user);
  }

  return data;
};

const uploadAvatar = async ({ filePath }) => {
  const data = await upload({
    url: '/auth/avatar',
    filePath,
    name: 'avatar',
  });

  if (data?.user) {
    setCurrentUser(data.user);
  }

  return data;
};

const register = async ({ username, password }) => {
  return request({
    url: '/auth/register',
    method: 'POST',
    data: { username, password },
  });
};

const fetchMe = async () => {
  const data = await request({
    url: '/auth/me',
    method: 'GET',
  });

  if (data?.user) {
    setCurrentUser(data.user);
  }

  return data;
};

const init = async () => {
  loadFromStorage();

  if (!token) {
    return { isAuthenticated: false, user: null };
  }

  try {
    const data = await fetchMe();
    return { isAuthenticated: true, user: data?.user || currentUser };
  } catch (e) {
    clear();
    return { isAuthenticated: false, user: null };
  }
};

const getToken = () => token;
const getCurrentUser = () => currentUser;

module.exports = {
  init,
  login,
  register,
  fetchMe,
  updateProfile,
  uploadAvatar,
  setCurrentUser,
  setToken,
  clear,
  getToken,
  getCurrentUser,
};
