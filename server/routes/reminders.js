// server/routes/reminders.js —— 到期提醒查询
const express = require('express');
const store = require('../store');

const router = express.Router();

// GET /api/reminders
//   ?days=30（默认）→ 已过期 + 30 天内到期
//   ?days=7         → 已过期 + 7 天内到期
//   ?level=expired  → 仅已过期
// 响应中的 summary 始终为全量统计。
router.get('/', (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
  const all = store.db.docs.map(store.decorate).filter((d) => d.daysLeft !== null);

  const summary = {
    expired: all.filter((d) => d.status === 'expired').length,
    d7: all.filter((d) => d.status === 'critical').length,
    d30: all.filter((d) => d.status === 'warning').length,
    ok: all.filter((d) => d.status === 'ok').length,
  };

  let items;
  if (req.query.level === 'expired') {
    items = all.filter((d) => d.status === 'expired');
  } else {
    items = all.filter((d) => d.status !== 'ok' && d.daysLeft <= days);
  }
  items.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate) || a.id - b.id);

  res.json({ days: req.query.level === 'expired' ? 0 : days, summary, total: items.length, items });
});

module.exports = router;
