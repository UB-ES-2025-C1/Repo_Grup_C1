const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = '8000';

const normalizeHost = (host) => host.replace(/\/+$/, '');

const buildBaseUrl = (host) => {
  const normalized = normalizeHost(host);
  
  // Si és una URL completa (http:// o https://), retornar-la directament
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  // Si comença amb "/" o és només "/", és una ruta relativa - retornar-la directament
  if (normalized === '' || normalized.startsWith('/')) {
    return normalized || '/';
  }

  // Si és un domini específic (cinemaub.llurbatech.com), afegir https://
  if (normalized === 'cinemaub.llurbatech.com') {
    return `https://${normalized}`;
  }

  // Per defecte, assumir que és un host i construir URL amb port
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

  // Si la base és una ruta relativa (comença amb /)
  if (base.startsWith('/')) {
    // Normalitzar: eliminar barres duplicades
    // Si base és només "/", eliminar-la per evitar "//"
    const normalizedBase = base === '/' ? '' : base;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
  }

  // Si la base és una URL absoluta, concatenar normalment
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};

