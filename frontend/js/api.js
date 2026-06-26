/* ═══════════════════════════════════════════════════════════
   API.JS — Centralized fetch wrapper
   ═══════════════════════════════════════════════════════════ */

const API = {
  baseURL: '',

  async request(method, path, body = null) {
    const opts = {
      method,
      credentials: 'include',
      headers: {},
    };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(this.baseURL + path, opts);
    if (res.status === 401) {
      sessionStorage.removeItem('lms_user');
      window.location.href = '/';
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  get(path)         { return this.request('GET', path); },
  post(path, body)  { return this.request('POST', path, body); },
  put(path, body)   { return this.request('PUT', path, body); },
  delete(path)      { return this.request('DELETE', path); },

  // Build query string helper
  buildQuery(params) {
    const q = Object.entries(params)
      .filter(([, v]) => v !== '' && v !== null && v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    return q ? `?${q}` : '';
  },

  // For file downloads
  downloadFile(path, filename) {
    const a = document.createElement('a');
    a.href = path;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },
};
