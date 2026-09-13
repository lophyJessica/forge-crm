# Forge CRM 线索字段 TSV 收口自检报告

## 项目/任务

- 项目：Forge CRM
- 工作区：`/Users/liulongfei/个人文件/forge-crm/`
- 分支：`0913test`
- 任务：从隔离克隆导入线索字段初稿/详细稿 TSV，完成框架升级收口并推送
- 日期：2026-09-13（Asia/Shanghai）

## 改动文件清单

- `03-产品设计/第一版-现有基线/字段清单/线索模块/线索字段清单（初稿）.tsv`
- `03-产品设计/第一版-现有基线/字段清单/线索模块/线索字段清单（详细稿）.tsv`
- `08-相关资料/check-reports/forge-crm-框架合并-0913test-20260913.md`
- 本报告（commit 后生成，未纳入已推送 commit）

## 改动点说明

- 创建目标目录 `03-产品设计/第一版-现有基线/字段清单/线索模块/` 并复制两个 TSV。
- 初稿：24 行、5 列、1638 bytes；SHA-256：`14af37b238be499cc617a6ae9b0c5defcd1a0275aae688123e1b74704cf82133`。
- 详细稿：25 行、13 列、5277 bytes；SHA-256：`48819b80460cc5d9a053058a252feecf8502797c88bd63e3a4d0500e47d4b012`。
- 两个目标文件与隔离克隆源文件 SHA-256 完全一致，无覆盖冲突。
- 已按确认删除临时隔离目录 `/Users/liulongfei/forge-crm-rc-线索tsv`；删除前目录大小约 7.9M。

## Git 与构建自检

- `git checkout 0913test`：成功。
- `git pull --ff-only`：成功，已是最新。
- `git add -A`：暂存两个 TSV 与框架合并报告，共 3 个文件。
- 单条 commit：`8c3161311f841eb1c291adfb520f49939b15d809`。
- commit 信息：`0913test 框架升级收口：顶层收敛为 QS-JXC 分层骨架、导入通用模板库与产品方法论、线索字段清单转 TSV 体系`。
- `git push origin 0913test`：成功，`e5bd3eb..8c31613 0913test -> 0913test`。
- 推送后 `git status --short`：为空；当前仅本报告为新增未跟踪文件。
- `npm run build`（`99-产品原型prototype/`）：通过。

## 顶层结构核验

旧目录 `context/`、`prompt/`、`prd-docs/`、`front-prototype/`、`template/`、`drafts/`、`reference/`、`prototypes/`、`docs/` 均不存在；顶层保留 00~08、99、`AGENTS.md`、`CLAUDE.md`、`README.md` 及隐藏配置目录。

## 遗留风险

- npm audit 报告 4 个依赖漏洞（1 moderate、3 high），本次未执行自动升级。
- Vite 主 bundle 压缩后约 684 kB，仍有超过 500 kB 的性能提示。
- 本报告在 commit/push 后生成，未改写已推送历史；如需纳入 Git，需另行提交。
