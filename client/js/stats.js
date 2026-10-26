// client/js/stats.js —— 分类统计模块：按类型汇总数量、临期与过期情况
(function () {
  const TYPE_ICON = { '身份证': '🪪', '护照': '🛂', '驾照': '🚘', '会员卡': '💳', '保险': '🛡️' };
  const TYPE_ORDER = ['身份证', '护照', '驾照', '会员卡', '保险'];
  const $ = (sel) => document.querySelector(sel);

  async function load() {
    const res = await API.getDocs();
    const docs = res.items;

    const summary = { total: docs.length, expired: 0, d7: 0, d30: 0 };
    const byType = {};
    TYPE_ORDER.forEach((t) => (byType[t] = { type: t, total: 0, soon: 0, expired: 0 }));

    for (const d of docs) {
      const t = byType[d.type] || (byType[d.type] = { type: d.type, total: 0, soon: 0, expired: 0 });
      t.total += 1;
      if (d.status === 'expired') { summary.expired += 1; t.expired += 1; }
      else if (d.status === 'critical') { summary.d7 += 1; t.soon += 1; }
      else if (d.status === 'warning') { summary.d30 += 1; t.soon += 1; }
    }

    $('#statSummary').innerHTML = `
      <div class="stat-box"><div class="stat-num">${summary.total}</div><div class="stat-label">证件总数</div></div>
      <div class="stat-box danger"><div class="stat-num">${summary.expired}</div><div class="stat-label">已过期</div></div>
      <div class="stat-box orange"><div class="stat-num">${summary.d7}</div><div class="stat-label">7 天内到期</div></div>
      <div class="stat-box amber"><div class="stat-num">${summary.d30}</div><div class="stat-label">30 天内到期</div></div>`;

    const types = Object.values(byType).sort((a, b) => b.total - a.total);
    $('#statCards').innerHTML = types.map((t) => `
      <div class="type-card">
        <div class="tc-icon">${TYPE_ICON[t.type] || '📄'}</div>
        <div class="tc-name">${t.type}</div>
        <div class="tc-count">${t.total}<span>件</span></div>
        <div class="tc-sub">临期 ${t.soon} · 已过期 ${t.expired}</div>
      </div>`).join('');

    const max = Math.max(1, ...types.map((t) => t.total));
    $('#statChart').innerHTML = types.map((t) => `
      <div class="bar-row">
        <div class="bar-label">${TYPE_ICON[t.type] || ''} ${t.type}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round((t.total / max) * 100)}%"><span>${t.total}</span></div></div>
      </div>`).join('');
  }

  window.Stats = { load };
})();
