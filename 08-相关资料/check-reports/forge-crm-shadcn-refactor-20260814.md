# AI 自检报告

## 1. 项目任务
- **任务目标**：将 Forge CRM 前端从“纯 Tailwind 手搓”重构为“React + Shadcn/UI（现代极简规范）”。
- **系统品牌**：Forge。
- **红线与系统边界约束**：
  1. 严格保留 `src/api/erpSync.ts` 与 `src/db.ts`（数据层与 Dexie 数据库 schema 完全不动）；
  2. 严格保持 18 个功能页面与 Dashboard 路由结构；
  3. 状态变更必须通过动作按钮触发（表单中不允许直接修改状态字段）；
  4. 主数据不提供删除操作（统一使用“停用/作废”替代）；
  5. 零 commit / 零 push。

## 2. 改动文件清单
- **基础配置与样式**：
  - `front-prototype/vite.config.ts`：添加 `@/*` 路径别名配置；
  - `front-prototype/tsconfig.app.json`：配置 `@/*` 路径映射与 TS 选项；
  - `front-prototype/src/index.css`：引入 Shadcn/UI 极简 CSS 变量系统与主题；
  - `front-prototype/src/lib/utils.ts`：新增 `cn` 类名合并工具函数；
- **Shadcn/UI 基础原子组件**（新建于 `front-prototype/src/components/ui/`）：
  - `button.tsx`、`badge.tsx`、`card.tsx`、`input.tsx`、`textarea.tsx`、`label.tsx`、`separator.tsx`、`skeleton.tsx`、`alert.tsx`、`table.tsx`、`dialog.tsx`、`tabs.tsx`、`select.tsx`、`dropdown-menu.tsx`
- **全业务模块重构页面**（位于 `front-prototype/src/pages/`）：
  - `Dashboard.tsx`：工作台与 KPI 看板
  - `LeadsList.tsx`、`LeadForm.tsx`、`LeadDetail.tsx`、`LeadPool.tsx`：线索管理与公海模块
  - `OpportunitiesList.tsx`、`OppForm.tsx`、`OppDetail.tsx`：商机推进与看板模块
  - `CustomersList.tsx`、`CustomerDetail.tsx`：ERP 客户快照与 360° 跟进模块
  - `ContractList.tsx`、`ContractForm.tsx`、`ContractDetail.tsx`：电子合同与赢单联动模块
  - `VisitList.tsx`、`VisitForm.tsx`、`VisitDetail.tsx`：拜访计划与 GPS 签到模块
  - `TargetList.tsx`、`TargetForm.tsx`：业绩目标与月终快照锁定模块

## 3. 改动点说明
1. **组件规范化**：全面替换旧版手搓样式代码为封装严谨、无障碍支持良好的 Radix UI + Shadcn UI 组件（Button、Card、Badge、Dialog、Table、Input 等）；
2. **现代极简设计语言**：
   - 统一采用 Slate 现代极简中性色阶与品牌主蓝（`#1677ff` / `bg-primary`）；
   - 状态 Badge 采用多色阶语义化定义（待处理-蓝色、已达成/赢单-绿色、预警/商机-黄色、作废/输单-红色、归档-紫色）；
   - 表格采用紧凑现代网格风格，卡片与弹窗带有微阴影及层次边界；
3. **业务逻辑完整继承**：
   - 线索 AI 评分与阶梯分配、线索自动转客户与 ERP 客户同步；
   - 商机阶段状态机七步流转（初步接触→需求确认→方案报价→商务谈判→合同签订→赢单/输单）及前置校验；
   - 合同签署完成自动回写商机赢单并下推 ERP 销售订单草稿；
   - 拜访签到自动回写至各业务对象 360° 跟进时间轴；
   - 业绩目标动态计算与月终锁定快照防漂移。

## 4. 自检结果
- **类型检查与构建**：`npm run build` (`tsc -b && vite build`) 零错误通过；
- **产物验证**：打包生成 `dist/` 与 `forge-crm.zip`；
- **部署验证**：已通过 `rsync` 成功同步至 VPS 接收目录 `/var/www/pmlophy.com/forge-crm-incoming/`；
- **系统规范校验**：未修改 `erpSync.ts` 与 `db.ts`，未产生 git commit/push 动作。

## 5. 遗留风险
- 无功能性遗留风险。当前 IndexedDB (Dexie) 本地数据持久化正常，ERP 同步与 CRM 状态流转均平稳运行。
