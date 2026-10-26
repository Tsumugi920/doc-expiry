// server/routes/renewals.js —— 续办记录的增删改查（REST）
const express = require('express');
const store = require('../store');

const router = express.Router();

// 附带关联证件的摘要信息，方便前端直接展示
function withDoc(renewal) {
  const doc = store.db.docs.find((d) => d.id === renewal.docId);
  return {
    ...renewal,
    docName: doc ? doc.name : '（证件已删除）',
    docType: doc ? doc.type : '',
    docExpiry: doc ? doc.expiryDate : '',
  };
}

function validate(payload) {
  const errors = [];
  const docId = Number(payload.docId);
  if (!Number.isInteger(docId) || !store.db.docs.some((d) => d.id === docId)) {
    errors.push('关联证件不存在');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(payload.date || ''))) {
    errors.push('续办日期格式应为 YYYY-MM-DD');
  }
  if (!store.RENEWAL_STATUS.includes(payload.status)) errors.push('续办状态不合法');
  return errors;
}

function parseFee(value) {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// GET /api/renewals —— 列表，支持 ?docId=（按证件过滤），最新日期在前
router.get('/', (req, res) => {
  let items = store.db.renewals.slice();
  if (req.query.docId) {
    const docId = Number(req.query.docId);
    if (Number.isInteger(docId)) items = items.filter((r) => r.docId === docId);
  }
  items.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  res.json({ total: items.length, items: items.map(withDoc) });
});

// POST /api/renewals —— 新增
router.post('/', (req, res) => {
  const body = req.body || {};
  const errors = validate(body);
  if (errors.length) return res.status(400).json({ error: errors.join('；') });
  const renewal = {
    id: store.nextId(store.db.renewals),
    docId: Number(body.docId),
    date: String(body.date).trim(),
    channel: String(body.channel || '').trim(),
    status: body.status,
    fee: parseFee(body.fee),
    note: String(body.note || '').trim(),
    createdAt: new Date().toISOString(),
  };
  store.db.renewals.push(renewal);
  store.save();
  res.status(201).json({ item: withDoc(renewal) });
});

// PUT /api/renewals/:id —— 更新
router.put('/:id', (req, res) => {
  const renewal = store.db.renewals.find((r) => r.id === Number(req.params.id));
  if (!renewal) return res.status(404).json({ error: '续办记录不存在' });
  const errors = validate({ ...renewal, ...(req.body || {}) });
  if (errors.length) return res.status(400).json({ error: errors.join('；') });
  const body = req.body || {};
  if (body.docId !== undefined) renewal.docId = Number(body.docId);
  if (body.date !== undefined) renewal.date = String(body.date).trim();
  if (body.channel !== undefined) renewal.channel = String(body.channel).trim();
  if (body.status !== undefined) renewal.status = body.status;
  if (body.fee !== undefined) renewal.fee = parseFee(body.fee);
  if (body.note !== undefined) renewal.note = String(body.note).trim();
  store.save();
  res.json({ item: withDoc(renewal) });
});

// DELETE /api/renewals/:id —— 删除
router.delete('/:id', (req, res) => {
  const idx = store.db.renewals.findIndex((r) => r.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: '续办记录不存在' });
  const [removed] = store.db.renewals.splice(idx, 1);
  store.save();
  res.json({ deleted: removed.id });
});

module.exports = router;
