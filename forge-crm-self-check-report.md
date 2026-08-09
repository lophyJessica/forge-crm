# AI 自检报告

## 项目任务

实现 Forge CRM 原型标注“待确认”评审问题记录系统，保留已有 click/drag、详情 tab 状态和滚动能力，并完成 annotation bundle 编译、生产构建、zip 打包与 VPS 上传。

## 改动文件清单

- `front-prototype/public/annotation-kit/runtime.js`
- `front-prototype/public/annotation-kit/runtime.css`
- `front-prototype/public/annotation-kit/annotation.bundle.json`（重新编译）
- `prd-docs/线索管理/annotations/coverage.md`（重新编译）
- `front-prototype/dist/`（本轮生产构建产物）
- `pending-issues-screenshot.png`（Chrome 验证截图）

## 改动点说明

- 根因：浮动容器对 pointerdown 使用 `setPointerCapture`，导致点击子按钮后的 click 目标被父容器接管；此前为恢复点击而跳过按钮拖拽，又取消了控件拖拽能力。
- 修复：移除 pointer capture，继续使用 window 级 move/up 监听追踪拖拽；未移动时保留原生 click，移动超过阈值时更新位置并抑制误触 click。
- 提高浮动工具栏层级，避免工具栏被已打开的标注面板遮挡。
- “原型标注”和“标注清单”两个按钮均可拖拽，且不改变其点击行为。

## 修复方案

1. **根因**：面板监听了捕获阶段的滚动事件（`window.addEventListener('scroll', scheduleMeasure, true)`）。滚动触发 `scheduleMeasure` 后，`renderAnnotationPanel()` 使用 `panel.innerHTML` 重建卡片；原详情 tab 所在的 `.vpa-card-details` 节点被销毁，`setTabbedMarkdownContent()` 从新节点读取不到原 tab，只能回退到默认 `all`。
2. **改动**：修改 `front-prototype/public/annotation-kit/runtime.js` 的 `VPA_STATE` 和 `setTabbedMarkdownContent()`。为每张标注卡增加 `detailTabByCard: Map`，以 `data-annotation-key` 作为 key，切换详情 tab 时保存状态，面板重渲染时恢复状态。
3. **修复模式**：核心逻辑是“状态放在重渲染之外，DOM 只负责呈现”：

   ```js
   const cardKey = container.closest('[data-annotation-key]')?.dataset.annotationKey;
   const savedTab = cardKey ? VPA_STATE.detailTabByCard.get(cardKey) : null;
   const requestedTab = savedTab || container.dataset.detailTab || initialTab;
   // 切换时保存，重建时读取
   if (cardKey) VPA_STATE.detailTabByCard.set(cardKey, currentTab);
   ```

4. **一句话总结**：面板 tab 状态必须存储在 `VPA_STATE` 等持久状态中，滚动或数据刷新重建 DOM 时只恢复状态，不能把 DOM 的默认值当成唯一状态源。

## 本轮滚动条修复方案

1. **根因**：外层 `.vpa-panel-list` 和内层 `.vpa-detail-tabs` 本身都具备可滚动尺寸，但滚动事件进入 `scheduleMeasure()` 后又调用 `renderAnnotationPanel()`，重建了两个滚动容器，导致新节点的 `scrollTop/scrollLeft` 每次回到 0，表现为内外滚动条无法滚动。
2. **改动**：修改 `front-prototype/public/annotation-kit/runtime.js` 的 `scheduleMeasure()`，滚动时只执行 `measureBadges()`，不再重建标注面板；面板仍由 tab 切换、展开/收起、数据刷新等明确动作触发重渲染。
3. **修复模式**：滚动事件只更新需要跟随业务页面滚动的徽章位置，不替换滚动容器 DOM；滚动容器的 `scrollTop/scrollLeft` 由浏览器原生滚动机制管理。

   ```js
   window.requestAnimationFrame(() => {
     VPA_STATE.measureScheduled = false;
     measureBadges();
     // 不在滚动期间调用 renderAnnotationPanel()
   });
   ```

4. **一句话总结**：可滚动容器不能在自身滚动事件中被重建，滚动只更新定位元素，面板结构更新必须由明确的数据或交互动作触发。

## 待确认评审问题方案

- 数据模型：`localStorage` 使用 `forge-crm-leads-pending-issues`，每条记录包含 `id`、`blockKey`、`description`、`status`、`resolution`。
- 块级待确认：每个标注块的“待确认”详情 tab 提供问题输入、添加按钮、解决勾选框和解决方法输入框。
- 全局待确认：面板顶部“待确认”tab 汇总全部标注块问题，按来源分组，支持全部/未解决/已解决筛选。
- 导出：点击“导出待办”同时复制 Markdown 到剪贴板并下载 `forge-crm-pending-todos.md`。
- 状态模式：问题数据存放在 runtime 外部的 `VPA_STATE.pendingIssues`，写入 localStorage；DOM 只负责呈现和交互，不作为持久状态源。

关键实现模式：

```js
const VPA_PENDING_ISSUES_STORAGE_KEY = 'forge-crm-leads-pending-issues';
const VPA_STATE = {
  pendingIssues: loadPendingIssues(),
  pendingFilter: 'all',
};
```

一句话总结：待确认必须作为按 `blockKey` 归属的评审 issue 数据管理，而不是继续从 PRD 静态 Markdown 推导空 tab。

## 本轮导出细化方案

1. **根因**：旧的 `pendingIssuesMarkdown()` 将所有问题平铺，并在每条问题后追加“来源”，没有复用标注块的序号和标题；块级待确认详情也没有自己的导出入口，因此无法直接导出单块待办。
2. **改动**：修改 `front-prototype/public/annotation-kit/runtime.js` 的 `renderPendingIssueTracker()`、`pendingIssuesMarkdown()` 和 `exportPendingIssues()`：新增块级导出按钮；导出函数支持传入 `issues + blockKey`，单块只导出当前块；全局使用 `sortedPendingIssueGroups()` 按标注块 `order` 分组。分组标题统一由 `pendingIssueGroupHeading()` 生成 `### 序号 X（标题）`。
3. **样式**：修改 `front-prototype/public/annotation-kit/runtime.css`，增加块级导出工具栏布局，并给 `.vpa-pending-issue-list` 增加 `max-height`、`overflow-y: auto` 和滚动条样式，单块和全局动态问题列表均可独立滚动。
4. **修复模式**：单块与全局共用一个分组 Markdown writer：单块传入指定 `blockKey`，全局传入全部问题；二者都先输出 `## 待办项`，再输出序号+标题分组，最后输出问题状态和解决方法，仍保持复制剪贴板+下载 md。
5. **一句话总结**：导出范围通过参数控制，导出格式通过同一套“标注块分组 → 待办列表”生成器统一，避免单块和全局格式分叉。

## 本轮“标注序号 → 待确认”弹窗滚动修复方案

1. **根因**：`.vpa-popup` 使用固定高度并设置 `overflow: hidden`，但没有建立纵向 flex 布局；`.vpa-popup-body` 只有 `max-height`，没有被约束在弹窗剩余高度内，因此内容变长时 body 跟随内容增长，超出部分被父级直接裁切，浏览器没有真正可滚动的 body。展开区 `.vpa-popup-details.is-open` 的固定 `max-height/overflow: hidden` 也会继续裁切长的待确认问题列表。
2. **改动**：修改 `front-prototype/public/annotation-kit/runtime.css` 的 `.vpa-popup`、`.vpa-popup-body`、`.vpa-popup-details.is-open`：弹窗改为纵向 flex 容器；body 设置 `flex: 1 1 auto`、`min-height: 0`、`max-height: none`、`overflow-y: auto` 和 `overscroll-behavior: contain`；展开详情取消固定最大高度并允许内容自然展开，由 body 统一滚动。
3. **修复模式**：固定弹窗只负责边界和 header，`.vpa-popup-body` 是唯一纵向滚动容器；详情内容和待确认卡片自然撑开 body 的 `scrollHeight`，滚轮事件由 body 原生处理，不在滚动期间重建 DOM 或重置 tab 状态。实测 body `scrollHeight/clientHeight = 782/497`，鼠标滚轮后 `scrollTop = 285`，待确认 tab 仍为 active。
4. **一句话总结**：固定高度浮层必须用 `flex + min-height:0` 把剩余空间交给唯一滚动 body，内容区不要再用固定 `max-height/overflow:hidden` 裁切长内容。

## 自检结果

- `npm run build`：通过。
- `npm run lint`：通过，存在项目既有静态检查 warning，无 error。
- Chrome F12 控制台：本轮验证无红色报错。
- 点击“原型标注”：徽章状态与 toast 正常。
- 点击“标注清单”：面板正常打开和关闭。
- 拖拽“原型标注”：工具栏位置正常变化，未触发误切换。
- 拖拽“标注清单”：工具栏位置正常变化，面板状态保持稳定。
- 拖拽后再次点击：点击行为仍正常。
- 详情 tab 选择“页面内容”后滚动：仍保持“页面内容”。
- 详情 tab 选择“交互说明”后滚动：仍保持“交互说明”。
- 外层标注面板滚动：`scrollTop` 可从 0 正常变化到 520。
- 内层详情 tab 横向滚动：`scrollLeft` 可从 0 正常变化到 6。
- 点击标注序号后切换“待确认”：弹窗 body 形成真实滚动区域，`scrollHeight/clientHeight = 782/497`，鼠标滚轮后 `scrollTop = 285`，页签仍保持“待确认”。
- 块级待确认：成功添加问题并显示。
- 刷新页面：问题仍存在，证明 localStorage 持久化生效。
- 勾选解决并填写解决方法：刷新后仍显示“已解决”和解决方法。
- 全局待确认：按标注块分组显示，筛选未解决/已解决结果正确。
- 导出待办：生成并复制以下 PRD Markdown 块：

  ```md
  ## 待办项
  ### 序号 1（线索列表页面）
  - [x] 评审验证：状态页签切换后的空数据提示需要补充
    - 解决方法：补充空数据态说明，并明确当前筛选条件与页签范围。
  - [ ] 滚动回归验证：长内容应保持在弹窗内滚动
    - 解决方法：（待补充）
  ```

- 单块导出验证：仅包含 `### 序号 1（线索列表页面）`，不包含“来源：”行。
- 全局导出验证：包含 `### 序号 1（线索列表页面）` 和 `### 序号 7（AI评分与分流规则）` 两个分组。
- 单块问题列表：`scrollHeight/clientHeight = 497/360`，`overflow-y: auto`。
- 全局问题列表：`scrollHeight/clientHeight = 662/360`，`overflow-y: auto`。

- 验证截图：`/Users/liulongfei/个人文件/forge-crm/pending-issues-screenshot.png`
- 弹窗滚动验证截图：`/Users/liulongfei/个人文件/forge-crm/pending-popup-scroll-screenshot.png`
- 单块导出截图：`/Users/liulongfei/个人文件/forge-crm/pending-export-block-screenshot.png`
- 全局分组导出截图：`/Users/liulongfei/个人文件/forge-crm/pending-export-global-screenshot.png`
- 全局分组滚动截图：`/Users/liulongfei/个人文件/forge-crm/pending-export-global-grouped-screenshot.png`
- annotation bundle 编译：通过。
- zip 根目录校验：解压后直接包含 `index.html`、`assets/`、`annotation-kit/`。
- zip 上传：本轮已成功上传至 `/var/www/pmlophy.com/forge-crm-incoming/forge-crm.zip`。
- 本地 zip：已生成于 `/Users/liulongfei/个人文件/forge-crm/forge-crm.zip`。

## 遗留风险

- Vite 构建提示主 JS chunk 超过 500 kB，当前不影响发布；后续可通过路由级动态加载继续优化。
- 当前首页没有匹配标注数据时，标注清单显示 0 条，这是配置范围导致的正常结果。
- 待确认问题保存在当前浏览器 localStorage，不跨浏览器/设备同步；导出 Markdown 是 PRD 回写的交付边界。
