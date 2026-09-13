# AI 自检报告

## 项目 / 任务

- 项目：Forge CRM 前端
- 任务：公海 + 商机四个页面新增标注锚点、标注源文件、页面独立编号、编译并部署
- 日期：2026-08-19
- 约束：未 commit、未 push；未修改业务规则、业务页面结构或 PRD 正文

## 改动文件

### 页面锚点

- `front-prototype/src/pages/LeadPool.tsx`：新增 7 个 `data-anno`
- `front-prototype/src/pages/OpportunitiesList.tsx`：新增 10 个 `data-anno`
- `front-prototype/src/pages/OppForm.tsx`：新增 9 个 `data-anno`
- `front-prototype/src/pages/OppDetail.tsx`：新增 10 个 `data-anno`

### 标注源与配置

- `prd-docs/公海管理/annotations/pages/lead-pool.md`
- `prd-docs/商机管理/annotations/pages/opportunities-list.md`
- `prd-docs/商机管理/annotations/pages/opportunity-form.md`
- `prd-docs/商机管理/annotations/pages/opportunity-detail.md`
- `prd-docs/公海管理/annotations/annotation.config.json`
- `prd-docs/商机管理/annotations/annotation.config.json`
- `prd-docs/annotation.workspace.json`
- 两个模块的 `annotations/coverage.md` 与 `prd-docs/annotation-coverage.md`
- `front-prototype/public/annotation-kit/annotation.bundle.json`

## 改动点说明

- 每个页面按功能点粒度铺设锚点，页面内 ID 均独立从 1 连续编号。
- Markdown 每个标注块包含页面内容、交互说明、业务规则、字段说明、待确认五个源分组；运行时生成“全部”页签。
- 标注内容使用业务中文，状态使用“初步接触、需求确认、方案报价、商务谈判、合同签订、赢单、输单”等中文口径，英文枚举只作为系统对照。
- 每个模块配置均提供来源需求与映射；workspace 合并保留既有线索模块标注。
- 修正商机详情 routeMatcher，排除新增页 `new` 与编辑页，避免商机新增页错误叠加详情标注。

## 自检结果

| 页面 | 标注块 | 编号校验 | Chrome 线上面板 | 可见徽章 |
|---|---:|---|---:|---|
| 公海线索 | 7 | 1..7 | 7 | 1..7 |
| 商机列表 | 10 | 1..10 | 10 | 1..5（看板视图可见区） |
| 商机新增/编辑 | 9 | 1..9 | 9 | 1..9 |
| 商机详情 | 10 | 1..10 | 10 | 1..7（弹窗锚点按需显示） |

- 编译：64 个全量标注，69 条来源需求，`mapped=69`、`unmapped=0`。
- 构建：`npm run build` 通过；仅有 Vite 大 chunk 提示，无构建失败。
- 打包：`/tmp/forge-crm-opp-annot-20260819091654.zip`，解压第一层为 `index.html`。
- 部署：VPS 部署脚本返回成功；本地与 VPS bundle SHA-256 一致。
- HTTP：`https://pmlophy.com/project/forge-crm/` 返回 200；线上 bundle 返回 200。
- Chrome：四页均可打开原型标注；标注清单打开后按钮具有 `vpa-panel-toggle is-active`，面板卡片数与页面标注块一致。

## 待确认项

- 公海 PRD 定义的分页、入池 Tab 计数、可认领性筛选、规则说明工具条、保护期锁定提示和认领二次确认，当前原型未全部实现。
- 商机列表 PRD 定义的后台 Tab 计数、分页、自动刷新、权限隐藏、More 菜单、看板金额汇总和独立分页，当前原型未全部实现。
- 商机表单的商品明细数量/价格快照、客户快照版本、完整阶段条件校验、未保存离开确认和并发/幂等反馈，当前原型未全部实现。
- 商机详情的预测版本与更新时间、阶段审计时间、合同/ERP 结果卡片、合同事件校验、人工重试和完整权限反馈，当前原型未全部实现。
- 线上入口若命中 CDN 旧 HTML，需要使用硬刷新或带版本参数重新加载；VPS 实际部署目录和 bundle 已核对为最新版本。

## 遗留风险

- 本轮仅增加标注锚点和标注资料，未补齐上述 PRD 功能缺口；待确认项不应被视为已实现业务能力。
- 看板/列表及详情弹窗属于条件渲染模块，徽章只在模块实际显示时出现；面板卡片仍可查看完整标注。
