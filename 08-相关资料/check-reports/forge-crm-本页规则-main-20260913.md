# Forge CRM 本页规则（page-global）自检报告

## 项目与任务

- 项目：Forge CRM
- 工作区：`/Users/liulongfei/个人文件/forge-crm/`
- 分支：`main`
- 任务：为线索、商机、客户、合同、拜访、业绩目标的实际列表页、表单页、详情页补齐整页级 `page-global` 原型标注。
- 日期：2026-09-13（Asia/Shanghai）

## 1. 拉取基线

执行命令：

```text
git checkout main && git pull origin main
```

真实输出：

```text
Already on 'main'
Your branch is up to date with 'origin/main'.
From https://github.com/lophyJessica/forge-crm
 * branch            main       -> FETCH_HEAD
Already up to date.
```

## 2. 页面级规则变更

所有新增块均使用 `type=page-global`，config 条目均为无 CSS 锚点（`target.selector` 为空）；既有局部标注块、锚点和业务代码未改。仓库实际没有客户表单页和业绩目标详情页，因此未虚构这两个页面。

| 模块/页面 | Markdown 块 | 覆盖的整页规则 |
|---|---:|---|
| 线索列表 | `id=9`（既有样例同步 config） | 角色与数据权限、状态/动作显隐、并发处理、重复线索、48h 回收、ERP 失败和查询边界 |
| 线索新增编辑 | `id=6` | 新增/草稿编辑准入、保存草稿与正式提交边界、去重和条件必填、提交防重复、失败保留输入 |
| 线索详情 | `id=11` | 角色/负责人/状态准入、已转客户只读、转客户/放弃/跟进防重复、并发刷新、ERP 建档失败回退 |
| 商机列表 | `id=11` | 权限与状态动作、60 秒刷新及编辑期间暂停、防重复操作、查询上下文保持、空态/重试、版本冲突 |
| 商机新增编辑 | `id=6` | 新增/编辑准入、未保存离开、保存防重复、成功跳转/失败保留、403/404、局部失败、版本冲突 |
| 商机详情 | `id=11` | 查看权限和 403/404、整页/局部加载失败重试、状态动作权限、防重复、并发状态刷新 |
| 客户列表 | `id=7` | 数据权限、骨架/刷新、空结果与 ERP 同步异常、重试/导出动作防重复、ERP SSOT 只读边界 |
| 客户详情 | `id=10` | 查看准入和 403/404、主数据整页失败与区块局部重试、ERP 快照只读、关联动作权限与防重复 |
| 合同列表 | `id=8` | 权限与状态页签、加载/空态/刷新、状态只能由业务动作改变、并发失败和重试、防重复操作 |
| 合同新增编辑 | `id=6` | 新建/草稿编辑准入、未保存离开、保存防重复、成功/失败处理、骨架/404/403、并发冲突和有效合同唯一性 |
| 合同详情 | `id=9` | 查看权限和 403/404、主数据/联动区块失败处理、归档/作废只读、底部动作准入和并发防重复 |
| 拜访计划列表 | `id=9` | 负责人/主管/管理员权限、状态动作准入、签到/取消防重复、空态/失败重试、状态不直接编辑 |
| 拜访计划新增编辑 | `id=5` | 状态和角色编辑准入、终态只读、保存防重复、关联/时间校验、版本冲突、失败保留和重试 |
| 拜访计划详情 | `id=10` | 状态/执行人/角色动作准入、签到/完成/取消/改期等防重复、事实只读、失败重试和并发处理 |
| 业绩目标列表 | `id=9` | 角色数据范围、骨架/月份切换/空态、进行中刷新与终态快照、结算锁定、并发和不可用动作显隐 |
| 业绩目标新增编辑 | `id=4` | 新增/未锁定目标编辑准入、未保存离开、保存防重复、唯一性预检、结算锁/并发失败、销售空态/404 |

新增页级来源 requirement 共 15 个，全部通过 config `sourceRefs` 映射；线索列表沿用已有来源 requirement。

## 3. 编译与资源校验

执行命令：

```text
cd /Users/liulongfei/个人文件/forge-crm/99-产品原型prototype
python3 prototype-annotation/scripts/compile_annotations.py "../03-产品设计/20260913-第一版-现有基线/需求文档与规则/annotation.workspace.json" --output "public/annotation-kit/annotation.bundle.json"
```

真实输出：

```text
Compiled annotation bundle: /Users/liulongfei/个人文件/forge-crm/99-产品原型prototype/public/annotation-kit/annotation.bundle.json
Wrote coverage matrix: /Users/liulongfei/个人文件/forge-crm/03-产品设计/20260913-第一版-现有基线/需求文档与规则/annotation-coverage.md
```

执行命令：

```text
python3 prototype-annotation/scripts/check_annotation_assets.py ./public/annotation-kit
```

真实输出：

```text
Deployment assets valid: {"annotations": 138, "pages": 17, "version": 1, "coverage": {"total": 164, "mapped": 164, "unmapped": 0}}
```

Bundle 中 `page-global` 核对结果：16 个实际目标页面各 1 个，均为 `target.selector=""`；线索列表、线索新增编辑、线索详情、商机列表、商机新增编辑、商机详情、客户列表、客户详情、合同列表、合同新增编辑、合同详情、拜访列表、拜访新增编辑、拜访详情、业绩目标列表、业绩目标新增编辑均通过。

## 4. Git 提交与推送

提交命令：

```text
git commit -m "feat(标注): 各页面补齐本页规则(page-global)整页级标注（main）"
```

真实输出：

```text
[main baaf309] feat(标注): 各页面补齐本页规则(page-global)整页级标注（main）
 23 files changed, 782 insertions(+), 16 deletions(-)
```

推送命令：

```text
git push origin main
```

真实输出：

```text
To https://github.com/lophyJessica/forge-crm.git
   ace3324..baaf309  main -> main
```

## 5. 改动文件范围

- 6 个模块的 `annotations/annotation.config.json`。
- 15 个实际页面的 `annotations/pages/*.md`，另同步既有线索列表 `id=9` 的 page-global config 类型和空锚点。
- 编译产物：`99-产品原型prototype/public/annotation-kit/annotation.bundle.json`。
- 编译覆盖矩阵：`03-产品设计/20260913-第一版-现有基线/需求文档与规则/annotation-coverage.md`。
- 本报告未纳入上述 commit，在推送后单独上传 `ai-reports`。

