const { buildApiUrl } = require('./url');

const getStoredToken = () => {
  try {
    return wx.getStorageSync('token') || '';
  } catch (e) {
    return '';
  }
};

const extractErrorMessage = (data) => {
  if (!data) return '服务器错误';
  if (typeof data === 'string') return data;
  if (data.error) return data.error;
  if (Array.isArray(data.errors) && data.errors.length > 0 && data.errors[0]?.msg) {
    return data.errors[0].msg;
  }
  return '服务器错误';
};

const handleUnauthorized = () => {
  try {
    wx.removeStorageSync('token');
    wx.removeStorageSync('currentUser');
  } catch (e) {}

  wx.reLaunch({
    url: '/pages/login/index',
  });
};

const request = ({ url, method = 'GET', data, header = {} }) => {
  const finalUrl = buildApiUrl(url);
  const token = getStoredToken();

  const finalHeader = {
    'Content-Type': 'application/json',
    ...header,
  };

  if (token && !finalHeader.Authorization) {
    finalHeader.Authorization = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: finalUrl,
      method,
      data,
      header: finalHeader,
      success: (res) => {
        const { statusCode } = res;

        if (statusCode === 401) {
          handleUnauthorized();
          reject(new Error('未登录或登录已过期'));
          return;
        }

        if (statusCode >= 200 && statusCode < 300) {
          resolve(res.data);
          return;
        }

        const msg = extractErrorMessage(res.data);
        reject(new Error(msg));
      },
      fail: (err) => {
        reject(new Error(err?.errMsg || '网络错误'));
      },
    });
  });
};

module.exports = {
  request,
};
