// server/index.js —— doc-expiry 后端入口：静态托管前端 + 挂载 REST API
const express = require('express');
const path = require('path');
const store = require('./store');
const docsRouter = require('./routes/docs');
const remindersRouter = require('./routes/reminders');
const renewalsRouter = require('./routes/renewals');

const app = express();
const PORT = Number(process.env.PORT) || 3018; // 按要求使用 3018，避开 3000~3017

app.use(express.json());

// 前端静态资源（client/ 目录），index.html 为首页
app.use(express.static(path.join(__dirname, '..', 'client')));

// REST API
app.use('/api/docs', docsRouter);
app.use('/api/reminders', remindersRouter);
app.use('/api/renewals', renewalsRouter);

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    name: 'doc-expiry',
    docs: store.db.docs.length,
    renewals: store.db.renewals.length,
    time: new Date().toISOString(),
  });
});

// 未知 API 路径返回 JSON 404（非 /api 路径交给前端）
app.use('/api', (req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 统一错误处理（含 JSON 解析失败等）
app.use((err, req, res, next) => {
  console.error('[server] 出错：', err.message);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`doc-expiry 证件到期管理已启动：http://localhost:${PORT}`);
  console.log(`当前数据：${store.db.docs.length} 本证件，${store.db.renewals.length} 条续办记录`);
});
