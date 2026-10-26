# doc-expiry 证件到期管理

前后端完整的证件到期管理项目：前端为原生 HTML/CSS/JS 多模块实现，后端为 Node.js + Express 的 REST API，数据持久化在 `server/data.json` 文件中。

## 功能

- **证件列表**：身份证 / 护照 / 驾照 / 会员卡 / 保险 五类证件的增删改查，支持按类型、状态筛选与关键字搜索，自动计算剩余天数与状态（已过期 / 7 天内到期 / 30 天内到期 / 正常）
- **到期提醒**：30 天 / 7 天 / 仅已过期三档提醒视图，顶栏与页签实时显示临期数量角标，可从提醒一键「去续办」
- **续办记录**：为任意证件记录一次续办（日期、渠道、状态、费用、备注），支持新增、编辑、删除
- **分类统计**：按证件类型统计数量、临期与过期情况，附数量条形图
- **内置数据**：12 本示例证件 + 4 条续办记录（见 `server/data.json`）

## 目录结构

```
doc-expiry/
├── package.json              # 启动脚本 npm start（后端端口 3018）
├── README.md
├── client/                   # 前端
│   ├── index.html            # 页面骨架与两个弹窗
│   ├── style.css             # 全部样式
│   ├── app.js                # 入口：标签页切换、续办记录模块、全局刷新
│   └── js/
│       ├── api.js            # REST API 请求封装 + 公共工具
│       ├── docs.js           # 证件列表模块
│       ├── reminders.js      # 到期提醒模块
│       └── stats.js          # 分类统计模块
└── server/                   # 后端（Node + Express）
    ├── index.js              # 入口：静态托管前端 + 挂载 API，端口 3018
    ├── store.js              # 数据持久化层（读写 data.json）与公共工具
    ├── data.json             # 数据文件（12 本示例证件 + 4 条续办记录）
    └── routes/
        ├── docs.js           # 证件增删改查
        ├── reminders.js      # 到期提醒查询
        └── renewals.js       # 续办记录增删改
```

## 安装与启动

环境要求：Node.js ≥ 16（仅需 `npm install` 一次，依赖只有 express）。

```bash
cd /data/home/zcode-projects/doc-expiry
npm install
npm start
```

启动后浏览器访问 **http://localhost:3018** 即可使用（前后端同源，由同一个服务托管）。

后端端口默认为 **3018**，如需更改可用环境变量覆盖：`PORT=4000 npm start`。

## REST API

Base URL：`http://localhost:3018/api`

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/docs` | 证件列表，支持 `?type=`、`?status=`（expired/critical/warning/ok）、`?q=` 关键字 |
| GET | `/docs/:id` | 证件详情 |
| POST | `/docs` | 新增证件（必填：`type`、`name`、`holder`、`expiryDate`） |
| PUT | `/docs/:id` | 更新证件 |
| DELETE | `/docs/:id` | 删除证件（级联删除其续办记录） |
| GET | `/reminders` | 到期提醒：`?days=30`（默认）/ `?days=7` / `?level=expired`，响应含全量 `summary` 统计 |
| GET | `/renewals` | 续办记录列表，支持 `?docId=` 按证件过滤 |
| POST | `/renewals` | 新增续办记录（必填：`docId`、`date`、`status`） |
| PUT | `/renewals/:id` | 更新续办记录 |
| DELETE | `/renewals/:id` | 删除续办记录 |
| GET | `/health` | 健康检查 |

列表接口会为每本证件计算好 `daysLeft`（距到期天数，负数为已过期）与 `status`（expired / critical / warning / ok）。

### curl 快速自测

```bash
curl -s http://localhost:3018/api/docs
curl -s -X POST http://localhost:3018/api/docs -H 'Content-Type: application/json' \
  -d '{"type":"保险","name":"测试保单","holder":"张三","expiryDate":"2026-11-20"}'
curl -s 'http://localhost:3018/api/reminders?days=30'
```

## 数据持久化

所有增删改都会立即写回 `server/data.json`，重启服务后数据仍在。若删除该文件后重启，服务会以空数据集启动（建议保留内置示例数据）。
