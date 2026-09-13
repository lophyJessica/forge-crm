# AI 自检报告

## 项目

Forge CRM 前端（`front-prototype`）线索模块标注。

## 项目任务

恢复线索列表页 9 个 `data-anno` 锚点；为线索新增/编辑页、线索详情页新增标注块和页面锚点；编译标注包，完成构建、打包、部署及线上校验。

## 改动文件清单

- `front-prototype/src/pages/LeadsList.tsx`：保留本轮开始前工作区中已恢复的 9 个列表锚点。
- `front-prototype/src/pages/LeadForm.tsx`：仅增加 9 个 `data-anno` 锚点，未修改业务逻辑。
- `front-prototype/src/pages/LeadDetail.tsx`：仅增加 10 个 `data-anno` 锚点，未修改业务逻辑。
- `prd-docs/线索管理/annotations/pages/lead-form.md`：新增 9 个标注块。
- `prd-docs/线索管理/annotations/pages/lead-detail.md`：新增 10 个标注块。
- `prd-docs/线索管理/annotations/annotation.config.json`：补充线索表单和详情页的来源要求、标注映射及 Hash 路由匹配规则。
- `prd-docs/线索管理/annotations/coverage.md`：编译生成并更新覆盖矩阵。
- `front-prototype/public/annotation-kit/annotation.bundle.json`：编译生成标注包。
- `check-reports/forge-crm-lead-annotation-20260819.md`：本自检报告。

## 改动点说明

- 线索列表：`leads-page-header`、`leads-status-tabs`、`leads-filter-bar`、`leads-create-tools`、`leads-batch-tools`、`leads-table-fields`、`leads-ai-score`、`leads-row-operations`、`leads-permissions`，共 9 个锚点。
- 线索新增/编辑：页面入口、字段校验、来源、公司、联系方式、画像字段、备注、保存草稿、提交，共 9 个锚点和标注块。
- 线索详情：页面入口、状态与归属、AI 评分、基本信息、跟进时间线、操作栏、跟进弹窗、放弃弹窗、转客户弹窗、草稿作废动作，共 10 个锚点和标注块。
- 三个页面标注块全部包含页面内容、交互说明、业务规则、字段说明、待确认等规范章节，并带有 PRD 来源行。
- 通过 `routeMatcher` 覆盖 `/leads/new`、`/leads/:id/edit` 和 `/leads/:id` 的 Hash 路由形态。

## 自检结果

- 标注技能规范及其必读参考已阅读；标注内容使用业务中文，英文枚举仅作括注，未写路由或技术路径。
- 配置 JSON 解析通过；编译成功：28 个标注块，33 个来源要求，已映射 33 个，未映射 0 个。
- `python3 prototype-annotation/scripts/compile_annotations.py` 通过。
- `cd front-prototype && npm run build` 通过；仅有 Vite 大体积 chunk 提示，无构建失败。
- 打包文件：`/tmp/forge-crm-lead-annot-20260819-081550.zip`；`unzip -l` 确认压缩包第一层为 `index.html`。
- 已通过 VPS 部署门禁部署到 `/var/www/pmlophy.com/project/forge-crm`。
- 线上 `https://pmlophy.com/project/forge-crm/` HTTP 200；标注包 HTTP 200，线上标注块 28 个，覆盖率 33/33，页面分布为列表 9、新增/编辑 9、详情 10。
- 浏览器验证：列表页 9 个 DOM 锚点、表单新建页 9 个可见锚点、详情页基础状态下 6 个可见锚点；标注清单面板展示详情页 10 个标注块。隐藏弹窗锚点会在对应弹窗打开时显示。
- 本轮新增的 LeadForm、LeadDetail、标注配置、标注源文件和编译产物检查通过；完整工作区的 `git diff --check` 仍提示既有 `front-prototype/index.html` 以及 LeadsList 相关改动中的尾随空格，本轮未扩大范围清理这些既有格式问题。未执行 commit 或 push。

## 遗留风险

1. 当前原型的草稿动作仍显示并执行“删除”，而 PRD 要求“作废草稿”（保留记录、不做物理删除）。本轮按范围只增加标注，已在 `lead-detail-draft-void-modal` 的“待确认”中记录，未改业务逻辑。
2. 当前线上示例数据未提供可直接走通的已分配/跟进中样本，因此跟进、放弃、转客户弹窗完成了标注包映射和结构验证，未提交真实业务动作。
3. Vite 仍提示主 JS chunk 超过 500 kB；不影响本轮构建和标注功能。
