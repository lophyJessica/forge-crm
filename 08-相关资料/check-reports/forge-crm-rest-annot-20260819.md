# AI 自检报告

## 项目

- 项目：Forge CRM 前端
- 工作区：`/Users/liulongfei/个人文件/forge-crm`
- 标注范围：客户、合同、拜访、业绩目标 10 个页面
- 拜访规则来源核对：`prd-docs/拜访管理/` 为当前生效目录；`prd-docs/拜访计划/` 文档已明确标记为废弃，本轮未引用其作为生效规则源。

## 任务

- 按 `prototype-annotation/SKILL.md` 规范，为 10 个页面恢复/新增 `data-anno` 锚点。
- 编写 10 个 6-tab 标注 Markdown 文件。
- 建立 4 个模块配置，更新 coverage 和 workspace，编译全量标注 bundle。
- 完成 build、打包、部署和线上逐页验收。

## 页面锚点结果

| 模块 | 页面 | 路由 | 锚点/标注块 |
| --- | --- | --- | ---: |
| 客户 | 客户列表 | `#/customers` | 6 |
| 客户 | 客户详情 | `#/customers/:id` | 9 |
| 合同 | 合同列表 | `#/contracts` | 7 |
| 合同 | 合同新增/编辑 | `#/contracts/new` | 9 |
| 合同 | 合同详情 | `#/contracts/:id` | 8 |
| 拜访 | 拜访计划列表 | `#/visits` | 8 |
| 拜访 | 拜访计划新增/编辑 | `#/visits/new` | 8 |
| 拜访 | 拜访计划详情 | `#/visits/:id` | 9 |
| 业绩目标 | 业绩目标列表 | `#/targets` | 8 |
| 业绩目标 | 业绩目标新增/编辑 | `#/targets/new` | 8 |
| **合计** | 10 页 |  | **80** |

## 改动文件清单

### 业务组件（仅新增 `data-anno` 属性）

- `front-prototype/src/pages/CustomersList.tsx`
- `front-prototype/src/pages/CustomerDetail.tsx`
- `front-prototype/src/pages/ContractList.tsx`
- `front-prototype/src/pages/ContractForm.tsx`
- `front-prototype/src/pages/ContractDetail.tsx`
- `front-prototype/src/pages/VisitList.tsx`
- `front-prototype/src/pages/VisitForm.tsx`
- `front-prototype/src/pages/VisitDetail.tsx`
- `front-prototype/src/pages/TargetList.tsx`
- `front-prototype/src/pages/TargetForm.tsx`

### 标注源与配置

- `prd-docs/客户管理/annotations/pages/customers-list.md`
- `prd-docs/客户管理/annotations/pages/customer-detail.md`
- `prd-docs/客户管理/annotations/annotation.config.json`
- `prd-docs/客户管理/annotations/coverage.md`
- `prd-docs/合同管理/annotations/pages/contract-list.md`
- `prd-docs/合同管理/annotations/pages/contract-form.md`
- `prd-docs/合同管理/annotations/pages/contract-detail.md`
- `prd-docs/合同管理/annotations/annotation.config.json`
- `prd-docs/合同管理/annotations/coverage.md`
- `prd-docs/拜访管理/annotations/pages/visit-list.md`
- `prd-docs/拜访管理/annotations/pages/visit-form.md`
- `prd-docs/拜访管理/annotations/pages/visit-detail.md`
- `prd-docs/拜访管理/annotations/annotation.config.json`
- `prd-docs/拜访管理/annotations/coverage.md`
- `prd-docs/业绩目标/annotations/pages/target-list.md`
- `prd-docs/业绩目标/annotations/pages/target-form.md`
- `prd-docs/业绩目标/annotations/annotation.config.json`
- `prd-docs/业绩目标/annotations/coverage.md`
- `prd-docs/annotation.workspace.json`
- `prd-docs/annotation-coverage.md`

### 编译产物

- `front-prototype/public/annotation-kit/annotation.bundle.json`

## 自检结果

- 4 个模块配置 `--check`：全部通过。
- 新增模块来源需求：客户 15/15、合同 24/24、拜访 25/25、业绩目标 16/16，均已映射。
- 全量 bundle：144 个标注块，149/149 来源需求已挂载，0 条未映射。
- 页面编号：10 个页面均独立从 1 连续编号；跨页重复编号保留。
- 标注源结构：每块均包含页面内容、交互说明、业务规则、字段说明、待确认五个源章节，运行时生成“全部”页签。
- `npm run build`：通过；Vite 仅输出既有的大 chunk 体积提示。
- 最终一致性修正：移除 `TargetForm` 中未配置的多余 `data-anno`，使组件锚点与 8 个配置块一一对应。
- 最终打包：`/tmp/forge-crm-rest-20260819094436.zip`，解压第一层为 `index.html`，未嵌套 `dist/`。
- 部署：rsync 上传成功，部署脚本返回 `deployed: /var/www/pmlophy.com/project/forge-crm`。
- 线上入口：`https://pmlophy.com/project/forge-crm/` HTTP 200（最终包部署后复核）。
- 线上 bundle：144 个标注块，覆盖 149/149；10 个新页面的 ID 均从 1 连续。
- Chrome 验收：10 个新页面路由的标注面板均可打开，面板卡片数量与页面配置一致；当前数据状态下条件隐藏的 Banner/动作/弹窗锚点在对应状态页面可命中。

## 待确认项

- 客户：风险 Tab、ERP 同步状态筛选/重试、更多关联动作、拜访关联区块、列表完整字段和详情加载/权限/局部错误态尚未在当前原型完整实现。
- 合同：独立状态 Tab、完整查询字段、联动结果列、五节点时间线、签署异常/重试、权限化 More 菜单、币种/含税/税率字段和未保存/并发确认尚未完整实现。
- 拜访：负责人、计划结束时间、异常筛选、改期/未到访/代签、完整反馈字段、定位授权/精度、原因弹窗、版本幂等和审计时间线尚未完整实现。
- 业绩目标：月份导航、状态/结算处理状态、查询工具、编辑模式、编号预览、当前进度只读区、ERP 金额/金额差异、结算失败重试、调整原因/次数/并发确认尚未完整实现。
- 部分待确认项是 PRD 已定义但当前业务原型未实现的功能，本轮只建立标注说明和锚点，未修改业务逻辑。

## 遗留风险

- 现有原型仍使用本地 Mock/IndexedDB，不能替代真实后端权限、版本并发、幂等和 ERP 状态校验。
- 条件渲染页面在不同业务状态下只会显示对应状态的可见锚点，标注面板仍会显示该页面完整配置块。
- Vite 对主 JS chunk 体积超过 500 kB 给出提示，本轮未改变业务打包策略。

## 结论

本轮仅增加标注层锚点、标注源、配置、覆盖矩阵和编译产物，未修改 PRD 业务内容、未修改业务逻辑，未 commit、未 push。
