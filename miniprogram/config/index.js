const API_BASE_URL = 'http://207.148.30.96:8081/api';

const parseApiOrigin = (baseUrl) => {
  if (!baseUrl) return '';
  const m = String(baseUrl).match(/^(https?:\/\/[^\/]+)(?:\/|$)/i);
  return m ? m[1] : '';
};

const API_ORIGIN = parseApiOrigin(API_BASE_URL);

module.exports = {
  API_BASE_URL,
  API_ORIGIN,
};
