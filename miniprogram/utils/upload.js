const { buildApiUrl } = require('./url');

const getStoredToken = () => {
  try {
    return wx.getStorageSync('token') || '';
  } catch (e) {
    return '';
  }
};

const parseUploadData = (raw) => {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return raw;
  }
};

const upload = ({ url, filePath, name, formData = {}, header = {} }) => {
  const finalUrl = buildApiUrl(url);
  const token = getStoredToken();

  const finalHeader = {
    ...header,
  };

  if (token && !finalHeader.Authorization) {
    finalHeader.Authorization = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: finalUrl,
      filePath,
      name,
      formData,
      header: finalHeader,
      success: (res) => {
        if (res.statusCode === 401) {
          try {
            wx.removeStorageSync('token');
            wx.removeStorageSync('currentUser');
          } catch (e) {}

          wx.reLaunch({ url: '/pages/login/index' });
          reject(new Error('未登录或登录已过期'));
          return;
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(parseUploadData(res.data));
          return;
        }

        const data = parseUploadData(res.data);
        const msg = (data && (data.error || (Array.isArray(data.errors) && data.errors[0]?.msg))) || '上传失败';
        reject(new Error(msg));
      },
      fail: (err) => {
        reject(new Error(err?.errMsg || '网络错误'));
      },
    });
  });
};

module.exports = {
  upload,
};
