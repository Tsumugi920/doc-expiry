// client/js/docs.js —— 证件列表模块：筛选、渲染、新增/编辑/删除
(function () {
  const TYPE_ICON = { '身份证': '🪪', '护照': '🛂', '驾照': '🚘', '会员卡': '💳', '保险': '🛡️' };
  const STATUS_META = {
    expired:  { label: '已过期', cls: 'st-expired' },
    critical: { label: '7 天内到期', cls: 'st-critical' },
    warning:  { label: '30 天内到期', cls: 'st-warning' },
    ok:       { label: '正常', cls: 'st-ok' },
  };

  const state = { docs: [], type: 'all', status: 'all', q: '' };
  const $ = (sel) => document.querySelector(sel);

  function maskNumber(num) {
    if (!num) return '—';
    return num.length <= 8 ? num : num.slice(0, 4) + '••••••' + num.slice(-4);
  }

  function daysText(d) {
    if (d.daysLeft < 0) return `已过期 ${-d.daysLeft} 天`;
    if (d.daysLeft === 0) return '今天到期';
    return `剩 ${d.daysLeft} 天`;
  }

  function filtered() {
    const q = state.q.trim().toLowerCase();
    return state.docs.filter(
      (d) =>
        (state.type === 'all' || d.type === state.type) &&
        (state.status === 'all' || d.status === state.status) &&
        (!q || [d.name, d.holder, d.number].some((v) => String(v || '').toLowerCase().includes(q)))
    );
  }

  function rowHTML(d) {
    const meta = STATUS_META[d.status] || STATUS_META.ok;
    return `<tr data-id="${d.id}">
      <td><span class="type-chip">${TYPE_ICON[d.type] || '📄'} ${d.type}</span>
          <div class="doc-name">${Util.escapeHTML(d.name)}</div></td>
      <td>${Util.escapeHTML(d.holder)}</td>
      <td class="mono">${Util.escapeHTML(maskNumber(d.number))}</td>
      <td>${d.issueDate || '—'}</td>
      <td>${d.expiryDate}<div class="days-sub">${daysText(d)}</div></td>
      <td><span class="status ${meta.cls}">${meta.label}</span></td>
      <td class="td-actions">
        <button class="btn mini" data-act="renew" data-id="${d.id}">续办</button>
        <button class="btn mini" data-act="edit" data-id="${d.id}">编辑</button>
        <button class="btn mini danger" data-act="del" data-id="${d.id}">删除</button>
      </td>
    </tr>`;
  }

  function render() {
    const list = filtered();
    $('#docsTbody').innerHTML = list.map(rowHTML).join('');
    $('#docsEmpty').classList.toggle('hidden', list.length > 0);
  }

  async function load() {
    const res = await API.getDocs();
    state.docs = res.items;
    render();
  }

  function openModal(doc) {
    $('#docModalTitle').textContent = doc ? '编辑证件' : '新增证件';
    $('#docId').value = doc ? doc.id : '';
    $('#docType').value = doc ? doc.type : '身份证';
    $('#docName').value = doc ? doc.name : '';
    $('#docHolder').value = doc ? doc.holder : '';
    $('#docNumber').value = doc ? doc.number || '' : '';
    $('#docIssueDate').value = doc ? doc.issueDate || '' : '';
    $('#docExpiryDate').value = doc ? doc.expiryDate : '';
    $('#docNotes').value = doc ? doc.notes || '' : '';
    $('#docModal').classList.remove('hidden');
    $('#docName').focus();
  }

  function closeModal() {
    $('#docModal').classList.add('hidden');
  }

  async function save(e) {
    e.preventDefault();
    const id = $('#docId').value;
    const payload = {
      type: $('#docType').value,
      name: $('#docName').value.trim(),
      holder: $('#docHolder').value.trim(),
      number: $('#docNumber').value.trim(),
      issueDate: $('#docIssueDate').value,
      expiryDate: $('#docExpiryDate').value,
      notes: $('#docNotes').value.trim(),
    };
    try {
      if (id) {
        await API.updateDoc(id, payload);
        toast('证件已更新');
      } else {
        await API.createDoc(payload);
        toast('证件已新增');
      }
      closeModal();
      await window.refreshAll();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function remove(id) {
    if (!confirm('确定删除该证件吗？其关联的续办记录也会一并删除。')) return;
    try {
      await API.deleteDoc(id);
      toast('证件已删除');
      await window.refreshAll();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function bind() {
    $('#btnAddDoc').addEventListener('click', () => openModal());
    $('#docForm').addEventListener('submit', save);
    $('#docsTbody').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const id = Number(btn.dataset.id);
      const doc = state.docs.find((d) => d.id === id);
      if (!doc) return;
      if (btn.dataset.act === 'edit') openModal(doc);
      if (btn.dataset.act === 'del') remove(id);
      if (btn.dataset.act === 'renew' && window.Renewals) window.Renewals.openModal({ docId: id });
    });
    $('#filterType').addEventListener('change', (e) => { state.type = e.target.value; render(); });
    $('#filterStatus').addEventListener('change', (e) => { state.status = e.target.value; render(); });
    $('#searchKeyword').addEventListener('input', (e) => { state.q = e.target.value; render(); });
  }

  window.Docs = { load, bind, openModal, state, TYPE_ICON, STATUS_META };
})();
