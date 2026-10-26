// client/js/reminders.js —— 到期提醒模块：30 天 / 7 天 / 仅已过期
(function () {
  const TYPE_ICON = { '身份证': '🪪', '护照': '🛂', '驾照': '🚘', '会员卡': '💳', '保险': '🛡️' };

  const state = { mode: 'days', days: 30, summary: null, items: [] };
  const $ = (sel) => document.querySelector(sel);

  function daysDesc(d) {
    if (d.daysLeft < 0) return `已过期 ${-d.daysLeft} 天`;
    if (d.daysLeft === 0) return '今天到期！';
    return `还有 ${d.daysLeft} 天到期`;
  }

  function chipHTML(label, count, cls) {
    return `<span class="chip ${cls}">${label}<b>${count}</b></span>`;
  }

  function cardHTML(d) {
    const ur = d.status === 'expired' ? 'ur-expired' : d.status === 'critical' ? 'ur-critical' : 'ur-warning';
    return `<div class="reminder-card ${ur}">
      <div class="rc-icon">${TYPE_ICON[d.type] || '📄'}</div>
      <div class="rc-main">
        <div class="rc-title">${Util.escapeHTML(d.name)}<span class="type-chip">${d.type}</span></div>
        <div class="rc-sub">持有人 ${Util.escapeHTML(d.holder)} · 到期日 ${d.expiryDate} · 号码 ${Util.escapeHTML(d.number || '—')}</div>
      </div>
      <div class="rc-right">
        <div class="rc-days">${daysDesc(d)}</div>
        <button class="btn mini primary" data-renew="${d.id}">去续办</button>
      </div>
    </div>`;
  }

  function render() {
    const s = state.summary;
    $('#reminderSummary').innerHTML = s
      ? chipHTML('已过期', s.expired, 'chip-danger') +
        chipHTML('7 天内到期', s.d7, 'chip-orange') +
        chipHTML('30 天内到期', s.d30, 'chip-amber') +
        chipHTML('正常', s.ok, 'chip-green')
      : '';
    $('#reminderList').innerHTML =
      state.items.map(cardHTML).join('') ||
      '<div class="empty">当前范围内没有需要提醒的证件 🎉</div>';
  }

  async function load() {
    const params = state.mode === 'expired' ? { level: 'expired' } : { days: state.days };
    const res = await API.getReminders(params);
    state.summary = res.summary;
    state.items = res.items;
    render();
  }

  function bind() {
    $('#reminderSeg').addEventListener('click', (e) => {
      const btn = e.target.closest('.seg');
      if (!btn) return;
      document.querySelectorAll('#reminderSeg .seg').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      if (btn.dataset.level === 'expired') {
        state.mode = 'expired';
      } else {
        state.mode = 'days';
        state.days = Number(btn.dataset.days);
      }
      load().catch((err) => toast(err.message, 'error'));
    });
    $('#reminderList').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-renew]');
      if (btn && window.Renewals) window.Renewals.openModal({ docId: Number(btn.dataset.renew) });
    });
  }

  window.Reminders = { load, bind, state };
})();
