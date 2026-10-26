// server/store.js —— 数据持久化层：加载/写回 server/data.json，并提供公共工具函数
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    console.error('[store] 读取 data.json 失败，使用空数据集：', err.message);
    return { docs: [], renewals: [] };
  }
}

const db = load();

function save() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function nextId(list) {
  return list.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

// 以“今天 00:00”为基准，计算距到期日的天数（负数表示已过期）
function daysLeftOf(expiryDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate + 'T00:00:00');
  if (Number.isNaN(expiry.getTime())) return null;
  return Math.round((expiry - today) / 86400000);
}

// expired：已过期；critical：≤7 天；warning：≤30 天；ok：其余
function statusOf(daysLeft) {
  if (daysLeft === null || daysLeft < 0) return 'expired';
  if (daysLeft <= 7) return 'critical';
  if (daysLeft <= 30) return 'warning';
  return 'ok';
}

function decorate(doc) {
  const daysLeft = daysLeftOf(doc.expiryDate);
  return { ...doc, daysLeft, status: statusOf(daysLeft) };
}

const DOC_TYPES = ['身份证', '护照', '驾照', '会员卡', '保险'];
const RENEWAL_STATUS = ['计划中', '办理中', '已完成'];

module.exports = { db, save, nextId, daysLeftOf, statusOf, decorate, DOC_TYPES, RENEWAL_STATUS };
