# AI 自检报告

## 项目

Forge CRM 前端（`front-prototype`）线索模块标注 ID 页面内独立编号修复。

## 任务

将线索列表、新增/编辑、详情三个页面的标注块 ID 分别从 1 开始连续编号，重编译标注包，完成构建、打包、部署和线上徽章验证。

## 改动文件

- `prd-docs/线索管理/annotations/annotation.config.json`：列表保持 1..9；表单改为 1..9；详情改为 1..10，同时同步 `blockId`。
- `prd-docs/线索管理/annotations/pages/leads-list.md`：保留 1..9 块注释编号。
- `prd-docs/线索管理/annotations/pages/lead-form.md`：块注释 10..18 改为 1..9。
- `prd-docs/线索管理/annotations/pages/lead-detail.md`：块注释 19..28 改为 1..10。
- `prototype-annotation/scripts/compile_annotations.py`：按最新 Skill 规范修正编译器；ID 改为页面内校验，默认 runtime key 增加页面维度，避免跨页重复 ID 冲突。
- `front-prototype/public/annotation-kit/annotation.bundle.json`：重新编译产物。
- `prd-docs/线索管理/annotations/coverage.md`：重新生成覆盖矩阵。
- `check-reports/forge-crm-idfix-20260819.md`：本报告。

未修改业务页面组件、业务 PRD 内容、runtime.js 逻辑或 runtime.css。

## 改动点说明

此前编译器按整个 config 全局拒绝重复 ID，且默认 key 只有 `scope:id`；这与新增的页面内独立编号规范不兼容。本次最小修复为：同一页面内 ID 不得重复，跨页面允许重复；默认 key 使用 `scope:页面标识:id`，确保运行时定位仍唯一，而页面徽章继续显示 `annotation.id`。

## 自检结果

- 完整阅读最新 `prototype-annotation/SKILL.md`，包含 Annotation ID Numbering Standard。
- 编译成功：28 个标注块，33 个来源要求，已映射 33，未映射 0。
- bundle 编号校验：
  - `#/leads`：`1..9`，无重复。
  - `#/leads/new`：`1..9`，无重复。
  - `#/leads/:id`：`1..10`，无重复。
- 三份 Markdown 的 start/end 块注释与页面编号一致。
- 所有 runtime key 唯一，页面维度 key 示例：`leads:leads:1`、`leads:leads-new:1`、`leads:leads-id:1`。
- `npm run build` 通过；仅有既有 Vite 主 JS chunk 体积提示。
- 打包文件：`/tmp/forge-crm-idfix-20260819085022.zip`；`unzip -l` 第一层为 `index.html`。
- rsync 上传成功，VPS 部署门禁返回成功；线上首页 HTTP 200。
- Chrome 线上验证：
  - 列表页可见徽章为 `1,2,3,4,6,7,8,9`，5 对应无选中状态下隐藏的批量工具锚点；页面 bundle 编号为 1..9。
  - 新增页徽章为 `1..9`。
  - 详情页基础可见徽章为 `1..6`；标注清单完整展示 `1..10`，7..10 为隐藏弹窗锚点。
- 页面已恢复到线上列表页，标注清单关闭状态。
- 未执行 commit 或 push。

## 遗留风险

- Vite 仍提示主 JS chunk 超过 500 kB，不影响本次标注 ID 功能。
- 旧浏览器标签若未刷新仍可能保留旧 bundle；runtime 的 bundle 读取使用 no-cache，刷新页面即可加载新编号。
