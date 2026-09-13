# 01 · 系统级约束与 Token 基线

> **定位**：Forge-CRM 前端颜色、尺寸、圆角、断点、字体的**唯一来源**。页面不得散写随机 HEX，必须从这里取值。
> **权威来源**：`src/index.css` 的 CSS 变量 + `src/components/ui/button.tsx` 等既有实现（据此固化，不是新拟）。

## 一、设计方向

- B 端紧凑后台：信息密度优先，服务"查、录、审、看、流转"。
- 主强调色：**蓝色**（primary）；状态色：绿/橙/红只做细分状态；边框/中性层用 slate 灰阶。
- 小圆角（0.5rem）、浅阴影、白/浅灰分层；避免营销风大卡片、厚重投影、强渐变。

## 二、颜色基线（CSS 变量，取自 src/index.css）

| Token | 值 | 用途 |
| --- | --- | --- |
| `--primary` | `221.2 83.2% 53.3%` | 主操作/强调（≈#2563eb 蓝） |
| `--background` | `210 40% 98%` | 页面底 |
| `--card` | `0 0% 100%` | 卡片底 |
| `--foreground` | `222.2 84% 4.9%` | 主文字 |
| `--secondary/muted/accent` | `210 40% 96.1%` | 次级/弱化底 |
| `--muted-foreground` | `215.4 16.3% 46.9%` | 辅助文字 |
| `--destructive` | `0 84.2% 60.2%` | 危险（红） |
| `--border/input` | `214.3 31.8% 91.4%` | 边框/输入框边 |
| `--ring` | `221.2 83.2% 53.3%` | 焦点环（=primary） |
| `--radius` | `0.5rem` | 全局圆角 |

**语义色层级**（页面内高频使用，统一口径）：
- 主按钮：`bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white`
- 次级按钮：`bg-slate-100 text-slate-900 hover:bg-slate-200`
- 描边按钮：`border border-slate-200 bg-white text-slate-700 hover:bg-slate-100`
- 危险：`bg-red-500/600/700`
- 信息/批量工具条：`bg-blue-50 border-blue-200 text-blue-700`
- 表头/行：`border-slate-100` 分隔；正文文字 `text-slate-700`、弱化 `text-slate-400/500`

**禁止**：页面散写随机 HEX；`bg-brand-6/10` 这类 Tailwind 透明度修饰符（v4 对 CSS 变量做透明度易静默失效）——需要透明只能用既有语义渐变/显式色阶。

## 三、尺寸与间距

- 正文：`text-sm`（14px）；标题逐级放大；辅助说明 `text-xs`（12px）+ `text-slate-400/500`。
- 按钮：`default h-9 px-4 py-2`；`sm h-8 px-3 text-xs`；`lg h-10 px-8`。
- 间距基于 4px 网格（4/8/12/16/20/24）。
- 圆角：`rounded-md`（0.5rem）为主。

## 四、断点（Tailwind 默认）

- `sm ≥640` / `md ≥768` / `lg ≥1024` / `xl ≥1280`。
- 侧栏可折叠（`AppShell` 的 sidebarCollapsed）；窄屏侧栏转抽屉，表格/宽区允许横向滚动。

## 五、版式与内容

- 字体：`-apple-system, "PingFang SC", "Microsoft YaHei"` 等系统字体栈，14px。
- 面包屑：模块 → 页面的二级结构（如 `线索管理 / 线索列表`）。
- 空态/加载/错误/权限统一见 `04`。

## 六、后续若有偏差
若 Figma/设计稿有更高优先级节点，改动时同步更新本文件与 `src/index.css`，**不得只改代码不更新规范**（保持"代码与 UI 权威源一致"）。