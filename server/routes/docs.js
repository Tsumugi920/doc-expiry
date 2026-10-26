// server/routes/docs.js —— 证件的增删改查（REST）
const express = require('express');
const store = require('../store');

const router = express.Router();

function validate(payload) {
  const errors = [];
  if (!String(payload.name || '').trim()) errors.push('证件名称不能为空');
  if (!String(payload.holder || '').trim()) errors.push('持有人不能为空');
  if (!store.DOC_TYPES.includes(payload.type)) errors.push('证件类型不合法');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(payload.expiryDate || ''))) {
    errors.push('到期日期格式应为 YYYY-MM-DD');
  } else if (store.daysLeftOf(payload.expiryDate) === null) {
    errors.push('到期日期不合法');
  }
  if (payload.issueDate && !/^\d{4}-\d{2}-\d{2}$/.test(String(payload.issueDate))) {
    errors.push('签发日期格式应为 YYYY-MM-DD');
  }
  return errors;
}

// GET /api/docs —— 列表，支持 ?type= &status= &q=（服务端筛选）
router.get('/', (req, res) => {
  let items = store.db.docs.map(store.decorate);
  const { type, status, q } = req.query;
  if (type && type !== 'all') items = items.filter((d) => d.type === type);
  if (status && status !== 'all') items = items.filter((d) => d.status === status);
  if (q) {
    const kw = String(q).toLowerCase();
    items = items.filter((d) =>
      [d.name, d.holder, d.number].some((v) => String(v || '').toLowerCase().includes(kw))
    );
  }
  items.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  res.json({ total: items.length, items });
});

// GET /api/docs/:id —— 详情
router.get('/:id', (req, res) => {
  const doc = store.db.docs.find((d) => d.id === Number(req.params.id));
  if (!doc) return res.status(404).json({ error: '证件不存在' });
  res.json({ item: store.decorate(doc) });
});

// POST /api/docs —— 新增
router.post('/', (req, res) => {
  const body = req.body || {};
  const errors = validate(body);
  if (errors.length) return res.status(400).json({ error: errors.join('；') });
  const doc = {
    id: store.nextId(store.db.docs),
    type: body.type,
    name: String(body.name).trim(),
    holder: String(body.holder).trim(),
    number: String(body.number || '').trim(),
    issueDate: String(body.issueDate || '').trim(),
    expiryDate: String(body.expiryDate).trim(),
    notes: String(body.notes || '').trim(),
    createdAt: new Date().toISOString(),
  };
  store.db.docs.push(doc);
  store.save();
  res.status(201).json({ item: store.decorate(doc) });
});

// PUT /api/docs/:id —— 更新
router.put('/:id', (req, res) => {
  const doc = store.db.docs.find((d) => d.id === Number(req.params.id));
  if (!doc) return res.status(404).json({ error: '证件不存在' });
  const errors = validate({ ...doc, ...(req.body || {}) });
  if (errors.length) return res.status(400).json({ error: errors.join('；') });
  ['type', 'name', 'holder', 'number', 'issueDate', 'expiryDate', 'notes'].forEach((key) => {
    if (req.body && req.body[key] !== undefined) doc[key] = String(req.body[key]).trim();
  });
  store.save();
  res.json({ item: store.decorate(doc) });
});

// DELETE /api/docs/:id —— 删除（级联删除其续办记录）
router.delete('/:id', (req, res) => {
  const idx = store.db.docs.findIndex((d) => d.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: '证件不存在' });
  const [removed] = store.db.docs.splice(idx, 1);
  const before = store.db.renewals.length;
  store.db.renewals = store.db.renewals.filter((r) => r.docId !== removed.id);
  store.save();
  res.json({ deleted: removed.id, removedRenewals: before - store.db.renewals.length });
});

module.exports = router;
