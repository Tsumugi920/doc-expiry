// app.js —— 页面入口：标签页切换、续办记录模块、全局刷新与轻提示
(function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // ---------- 轻提示 ----------
  let toastTimer = null;
  function toast(msg, type = 'ok') {
    const el = $('#toast');
    el.textContent = msg;
    el.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.className = 'toast hidden'), 2600);
  }
  window.toast = toast;

  // ---------- 全局刷新：任何增删改后重建四个模块的数据 ----------
  window.refreshAll = async function () {
    await Promise.all([Docs.load(), Reminders.load(), Stats.load(), Renewals.load()]);
    renderHeader();
  };

  function renderHeader() {
    const s = Reminders.state.summary;
    if (!s) return;
    const total = Docs.state.docs.length;
    $('#headerSummary').innerHTML =
      `<span>共 <b>${total}</b> 本证件</span>` +
      (s.expired ? `<span class="hs-danger">已过期 ${s.expired}</span>` : '') +
      (s.d7 ? `<span class="hs-orange">7 天内到期 ${s.d7}</span>` : '') +
      (s.d30 ? `<span class="hs-amber">30 天内到期 ${s.d30}</span>` : '');
    const urgent = s.expired + s.d7;
    const badge = $('#reminderBadge');
    badge.textContent = urgent > 99 ? '99+' : urgent;
    badge.classList.toggle('hidden', urgent === 0);
  }

  // ---------- 标签页切换 ----------
  function switchTab(name) {
    $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    $$('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${name}`));
  }

  function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
  }

  // ---------- 续办记录模块 ----------
  const RENEWAL_STATUS_CLS = { '计划中': 'rn-plan', '办理中': 'rn-doing', '已完成': 'rn-done' };

  const Renewals = {
    state: { items: [], docs: [] },

    async load() {
      const [ren, docs] = await Promise.all([API.getRenewals(), API.getDocs()]);
      this.state.items = ren.items;
      this.state.docs = docs.items;
      this.render();
    },

    render() {
      $('#renewalsTbody').innerHTML = this.state.items.map(rowHTML).join('');
      $('#renewalsEmpty').classList.toggle('hidden', this.state.items.length > 0);
    },

    openModal(prefill = {}) {
      const editing = prefill.renewal;
      $('#renewalModalTitle').textContent = editing ? '编辑续办记录' : '记一次续办';
      $('#renewalDoc').innerHTML =
        this.state.docs.map((d) =>
          `<option value="${d.id}">${d.type} · ${Util.escapeHTML(d.name)}（${Util.escapeHTML(d.holder)}）</option>`
        ).join('') || '<option value="">（暂无证件，请先新增）</option>';
      $('#renewalId').value = editing ? editing.id : '';
      $('#renewalDoc').value = editing ? editing.docId : (prefill.docId || this.state.docs[0]?.id || '');
      $('#renewalDate').value = editing ? editing.date : Util.todayStr();
      $('#renewalStatus').value = editing ? editing.status : '办理中';
      $('#renewalFee').value = editing ? editing.fee : '';
      $('#renewalChannel').value = editing ? editing.channel || '' : '';
      $('#renewalNote').value = editing ? editing.note || '' : '';
      $('#renewalModal').classList.remove('hidden');
    },

    async save(e) {
      e.preventDefault();
      const id = $('#renewalId').value;
      const payload = {
        docId: Number($('#renewalDoc').value),
        date: $('#renewalDate').value,
        status: $('#renewalStatus').value,
        fee: $('#renewalFee').value === '' ? 0 : Number($('#renewalFee').value),
        channel: $('#renewalChannel').value.trim(),
        note: $('#renewalNote').value.trim(),
      };
      if (!payload.docId) return toast('请先新增证件，再记录续办', 'error');
      try {
        if (id) {
          await API.updateRenewal(id, payload);
          toast('续办记录已更新');
        } else {
          await API.createRenewal(payload);
          toast('续办记录已保存');
        }
        closeModal('renewalModal');
        await window.refreshAll();
      } catch (err) {
        toast(err.message, 'error');
      }
    },

    async remove(id) {
      if (!confirm('确定删除这条续办记录吗？')) return;
      try {
        await API.deleteRenewal(id);
        toast('续办记录已删除');
        await window.refreshAll();
      } catch (err) {
        toast(err.message, 'error');
      }
    },
  };

  function rowHTML(r) {
    return `<tr>
      <td>${r.date}</td>
      <td><span class="type-chip">${Util.escapeHTML(r.docType || '—')}</span> ${Util.escapeHTML(r.docName || '（证件已删除）')}</td>
      <td>${Util.escapeHTML(r.channel || '—')}</td>
      <td><span class="status ${RENEWAL_STATUS_CLS[r.status] || ''}">${r.status}</span></td>
      <td class="mono">${r.fee ? Util.money(r.fee) : '—'}</td>
      <td class="td-note">${Util.escapeHTML(r.note || '—')}</td>
      <td class="td-actions">
        <button class="btn mini" data-ract="edit" data-id="${r.id}">编辑</button>
        <button class="btn mini danger" data-ract="del" data-id="${r.id}">删除</button>
      </td>
    </tr>`;
  }

  // ---------- 事件绑定 ----------
  function bindRenewals() {
    $('#btnAddRenewal').addEventListener('click', () => Renewals.openModal());
    $('#renewalForm').addEventListener('submit', (e) => Renewals.save(e));
    $('#renewalsTbody').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-ract]');
      if (!btn) return;
      const rec = Renewals.state.items.find((r) => r.id === Number(btn.dataset.id));
      if (!rec) return;
      if (btn.dataset.ract === 'edit') Renewals.openModal({ renewal: rec });
      if (btn.dataset.ract === 'del') Renewals.remove(rec.id);
    });
  }

  function bindModals() {
    $$('[data-close]').forEach((btn) =>
      btn.addEventListener('click', () => closeModal(btn.dataset.close))
    );
    $$('.modal').forEach((m) =>
      m.addEventListener('mousedown', (e) => { if (e.target === m) m.classList.add('hidden'); })
    );
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') $$('.modal').forEach((m) => m.classList.add('hidden'));
    });
  }

  function init() {
    $('#tabs').addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (tab) switchTab(tab.dataset.tab);
    });
    Docs.bind();
    Reminders.bind();
    bindRenewals();
    bindModals();
    window.Renewals = Renewals;
    refreshAll().catch((err) => toast('初始化失败：' + err.message, 'error'));
  }

  init();
})();
