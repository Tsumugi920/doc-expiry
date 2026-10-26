// client/js/api.js —— REST API 请求封装 + 公共工具函数
(function () {
  const BASE = '/api';

  async function request(path, options = {}) {
    const res = await fetch(BASE + path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    let body = null;
    try {
      body = await res.json();
    } catch (_) {
      /* 非 JSON 响应，保持 null */
    }
    if (!res.ok) {
      throw new Error((body && body.error) || `请求失败（HTTP ${res.status}）`);
    }
    return body;
  }

  function qs(params) {
    const entries = Object.entries(params || {}).filter(
      ([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all'
    );
    return entries.length ? '?' + new URLSearchParams(entries).toString() : '';
  }

  window.API = {
    // 证件
    getDocs: (params) => request('/docs' + qs(params)),
    createDoc: (data) => request('/docs', { method: 'POST', body: JSON.stringify(data) }),
    updateDoc: (id, data) => request(`/docs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteDoc: (id) => request(`/docs/${id}`, { method: 'DELETE' }),
    // 到期提醒
    getReminders: (params) => request('/reminders' + qs(params)),
    // 续办记录
    getRenewals: (params) => request('/renewals' + qs(params)),
    createRenewal: (data) => request('/renewals', { method: 'POST', body: JSON.stringify(data) }),
    updateRenewal: (id, data) => request(`/renewals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteRenewal: (id) => request(`/renewals/${id}`, { method: 'DELETE' }),
  };

  window.Util = {
    escapeHTML(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      }[c]));
    },
    todayStr() {
      const d = new Date();
      const p = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    },
    money(n) {
      return '¥' + Number(n || 0).toFixed(2);
    },
  };
})();
