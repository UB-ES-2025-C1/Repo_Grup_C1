import axios from 'axios';
import { withApiBase } from './api';

// This module augments the default axios instance with:
// - request interceptor that attaches access token from localStorage
// - response interceptor that attempts refresh on 401 and retries the original request

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

// Attach access token to outgoing requests
axios.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('access');
    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore storage errors
  }
  return config;
}, (err) => Promise.reject(err));

// Response interceptor to handle 401s by attempting refresh
axios.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) return Promise.reject(error);

    const status = error.response ? error.response.status : null;
    // Only try refresh for 401 responses and when we haven't retried already
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      let refreshToken;
      try {
        refreshToken = localStorage.getItem('refresh');
      } catch (e) {
        refreshToken = null;
      }

      if (!refreshToken) {
        // No refresh token -> clear storage and redirect to login
        try { localStorage.removeItem('access'); localStorage.removeItem('refresh'); } catch (e) {}
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // queue the request until token is refreshed
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            resolve(axios(originalRequest));
          });
        });
      }

      isRefreshing = true;
      try {
        // Call token refresh endpoint
        const resp = await axios.post(withApiBase('/movies/token/refresh/'), { refresh: refreshToken });
        const newAccess = resp.data.access;
        try { localStorage.setItem('access', newAccess); } catch (e) {}
        onRefreshed(newAccess);
        isRefreshing = false;
        originalRequest.headers['Authorization'] = 'Bearer ' + newAccess;
        return axios(originalRequest);
      } catch (refreshErr) {
        isRefreshing = false;
        // Refresh failed -> clear storage and redirect to login
        try { localStorage.removeItem('access'); localStorage.removeItem('refresh'); } catch (e) {}
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default axios;
