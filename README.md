# 微信记账小程序

> 一款轻量、好用的微信记账小程序，支持共享账本，方便与家人、朋友共同记账。

## 功能特性

- 📝 快速记账：自定义数字键盘，3 秒完成一笔
- 📊 月度统计：按分类排行，支持切换月份查看历史
- 👥 共享账本：通过邀请码邀请好友加入，共同记账
- 🏷️ 分类管理：16 个默认分类，支持自定义
- 📱 纯微信生态：云开发，无需额外服务器

## 项目结构

```
wx-bookkeeping/
├── miniprogram/            小程序前端代码
│   ├── pages/              12 个页面
│   ├── services/           业务 API 封装
│   ├── store/              全局状态管理
│   └── utils/              工具函数
├── cloudfunctions/         云函数（19 个）
│   ├── _shared/            共享工具模块
│   ├── onUserLogin/        登录初始化
│   ├── createLedger/       创建账本
│   ├── updateLedger/       更新账本
│   ├── deleteLedger/       删除账本
│   ├── listLedgers/        账本列表
│   ├── getLedgerDetail/    账本详情
│   ├── createRecord/       创建账单
│   ├── updateRecord/       更新账单
│   ├── deleteRecord/       删除账单
│   ├── listRecords/        账单列表
│   ├── getRecord/          账单详情
│   ├── listCategories/     分类列表
│   ├── manageCategory/     分类管理
│   ├── createInvitation/   创建邀请码
│   ├── joinLedger/         加入账本
│   ├── leaveLedger/        退出账本
│   ├── manageMember/       成员管理
│   ├── statsAggregate/     统计聚合
│   └── migrateIcons/       图标迁移（管理员工具）
└── docs/                   设计文档
```

## 快速开始

1. 用微信开发者工具打开项目根目录
2. 在 `project.config.json` 中填入你的 `appid`
3. 开通云开发，记下环境 ID
4. 在 `miniprogram/utils/constants.js` 中填入云开发环境 ID
5. 在云开发控制台创建集合：`users`、`ledgers`、`ledger_members`、`categories`、`records`、`invitations`（权限选"仅创建者可读写"）
6. 上传部署所有云函数（右键各云函数文件夹 → "上传并部署：云端安装依赖"）
7. 编译预览即可

## 技术栈

| 层 | 选型 |
|----|------|
| 前端 | 原生微信小程序 |
| 后端 | 微信云开发（CloudBase） |
| 数据库 | 云数据库（MongoDB-like） |
| 计算 | 云函数（Node.js） |
| 鉴权 | 微信 openid |

## 设计文档

- [PRD - 产品需求](./docs/01-PRD-产品需求文档.md)
- [数据库设计](./docs/02-数据库设计.md)
- [页面与交互](./docs/03-页面与交互设计.md)
- [技术架构](./docs/04-技术架构.md)

## 开发约定

- 文件命名：kebab-case
- JS 变量：camelCase
- 数据库字段：snake_case
- 云函数共享模块：各云函数目录下的 `_shared.js`（从 `cloudfunctions/_shared/utils.js` 复制）

## 部署注意事项

- 云函数使用本地共享模块 `_shared.js`，部署时选择 **"上传并部署：云端安装依赖"**
- 修改 `_shared/utils.js` 后需要重新复制到各云函数目录（或运行项目根目录的同步脚本）
- 前端代码修改后需重新"预览"扫码才能在手机上看到更新；云函数部署后立即生效
