const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = '8000';

const normalizeHost = (host) => host.replace(/\/+$/, '');

const buildBaseUrl = (host) => {
  const normalized = normalizeHost(host);
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  if (normalized.includes(':')) {
    return `http://${normalized}`;
  }

  return `http://${normalized}:${DEFAULT_PORT}`;
};

export const getApiBaseUrl = () => {
  const configuredHost = import.meta.env.VITE_API_BASE_URL;
  const host =
    configuredHost && configuredHost.trim() !== ''
      ? configuredHost.trim()
      : DEFAULT_HOST;

  return buildBaseUrl(host);
};

export const withApiBase = (path = '') => {
  const base = getApiBaseUrl();
  if (!path) {
    return base;
  }

  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};

