# AI 自检报告

## 项目/任务

- 项目：Forge CRM 前端原型
- 任务：`context → PRD → code` 全量三向对齐审计
- 日期：2026-08-19
- 工作区：`/Users/liulongfei/个人文件/forge-crm`

## 审计范围

- `context/` 01-08 地基文件。
- `audit-reviews/` 既有六模块审计报告及汇总 README。
- `prd-docs/` 线索、公海、商机、客户、合同、拜访管理、业绩目标的主 PRD、字段清单和 Demo 规格。
- `front-prototype/src/pages/` 全部 18 个页面：Dashboard 1、线索 3、公海 1、商机 3、客户 2、合同 3、拜访 3、业绩目标 2。
- 公共实现：`front-prototype/src/App.tsx`、`front-prototype/src/db.ts`、`front-prototype/src/api/erpSync.ts`。

## 改动文件清单

- `audit-reviews/CRM对齐审计报告.md`：本轮审计主报告。
- `check-reports/forge-crm-CRM对齐审计-20260819.md`：本自检报告。

除以上两份任务要求的报告外，未修改业务代码、PRD、标注、配置或构建产物。

## 发现汇总

| 模块 | P0 | P1 | P2 | 合计 |
|---|---:|---:|---:|---:|
| 首页/全局 | 1 | 0 | 1 | 2 |
| 线索 | 3 | 4 | 1 | 8 |
| 公海 | 1 | 2 | 1 | 4 |
| 商机 | 2 | 4 | 1 | 7 |
| 客户 | 1 | 4 | 1 | 6 |
| 合同 | 2 | 3 | 1 | 6 |
| 拜访 | 1 | 4 | 1 | 6 |
| 业绩目标 | 1 | 5 | 1 | 7 |
| **总计** | **12** | **26** | **8** | **46** |

主要阻断集中在：线索物理删除/错误废弃、AI 高分错误入池、公海保护反向、商机手工赢单和幽灵合同、停用客户未阻断、合同按钮伪造签署及 ERP 结果、已签到拜访无权限取消、浏览器即时结算。

## 自检结果

- 已执行 `git pull --ff-only`，结果：`Already up to date.`
- 已按 `context > 主 PRD > 字段清单/Demo` 顺序裁决，并将同仓规格冲突单独列示。
- 已确认拜访唯一生效目录为 `prd-docs/拜访管理/`；`prd-docs/拜访计划/` 已标记废弃。
- 已核对 18 个页面路由：`front-prototype/src/App.tsx:141-163`。
- 已对报告发现项执行机器计数：P0=12、P1=26、P2=8、合计 46。
- 已执行 `git diff --check -- audit-reviews/CRM对齐审计报告.md`，无空白错误。
- 遵守纯审计约束：未 build、未启动 dev、未部署、未 commit、未 push。
- 工作区已有的标注相关改动均为审计前既存，本轮未触碰。

## 遗留风险

- 本轮按要求为静态审计，未执行浏览器运行时验证；用户本地 IndexedDB 既有数据可能改变展示样本，但不改变报告所列结构性路径。
- 业绩金额结算口径存在权威源冲突：`context/08` 使用 CRM WON 金额，现行主 PRD/字段清单使用 ERP 确认订单金额。需产品先定稿，避免修复时选错口径。
- 公海保护规则在 `context/公海主PRD` 与线索主 PRD/决策稿之间仍有反向描述；按本轮明确优先级以 context 为准。
