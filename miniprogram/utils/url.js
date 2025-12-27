const { API_BASE_URL, API_ORIGIN } = require('../config/index');

const isAbsoluteUrl = (url) => {
  if (!url) return false;
  return /^https?:\/\//i.test(url);
};

const ensureLeadingSlash = (path) => {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
};

const joinBaseAndPath = (base, path) => {
  if (!base) return path;
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const cleanPath = ensureLeadingSlash(path);
  return `${cleanBase}${cleanPath}`;
};

const buildApiUrl = (pathOrUrl) => {
  if (!pathOrUrl) return API_BASE_URL;
  if (isAbsoluteUrl(pathOrUrl)) return pathOrUrl;

  const p = ensureLeadingSlash(pathOrUrl);

  if (p.startsWith('/api/')) {
    return joinBaseAndPath(API_ORIGIN, p);
  }

  return joinBaseAndPath(API_BASE_URL, p);
};

const normalizeImageUrl = (url) => {
  if (!url) return '';
  if (isAbsoluteUrl(url)) return url;

  const p = ensureLeadingSlash(url);

  if (p.startsWith('/api/uploads/') || p.startsWith('/uploads/')) {
    return joinBaseAndPath(API_ORIGIN, p);
  }

  if (p.startsWith('/api/')) {
    return joinBaseAndPath(API_ORIGIN, p);
  }

  return joinBaseAndPath(API_ORIGIN, p);
};

module.exports = {
  buildApiUrl,
  normalizeImageUrl,
};
