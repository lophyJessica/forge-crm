# 03 — 商机管理 PRD & 审计修复指令

## 商机主PRD

```plaintext
Context: forge-crm 商机管理。六阶段:初步接触→需求确认→方案报价→商务谈判→合同签订→赢单/输单。

Request: 创建商机主PRD.md:
- 业务背景:销售pipeline可视化,六阶段从初步接触到赢单/输单
- 状态机:INTIAL_CONTACT→NEEDS_CONFIRM→PROPOSAL→NEGOTIATION→CONTRACT→WON/LOST
- 赢单→ERP销售订单草稿;输单必填原因;CONTRACT阶段可输单
- AI串联:商机预测(客户画像+跟进频率+商品匹配+阶段停留)
- 权限:销售/主管/管理员三级
```

## 商机字段清单

```plaintext
Request: 创建商机字段清单.md:
- 基础12字段:编号/名称/客户/商品/阶段/金额/成交日期/需求/AI概率/输单原因/合同编号
- 阶段Tag配色:灰/蓝/橙/黄/紫/绿/红
- AI概率配色:≥70绿/40-69黄/<40红
```

## 商机用例推演

```plaintext
Request: 创建商机_用例数据推演.md:
- 案例1:六阶段全流程→赢单下推ERP
- 案例2:谈判阶段输单(原因必填)
- 案例3:越级推进阻断
```

## 商机 Demo PRD

```plaintext
Request: 创建商机_Demo_列表页/新增编辑页/详情页.md:
- 看板:7列,拖拽仅相邻+任意→LOST(弹出原因Modal)
- 列表:Tab+表格11列
- Mock≥15条覆盖七阶段
```

## 商机审计指令

```plaintext
Request: 逐项审查商机管理:
- 3个P0:CONTRACT无法输单/进入CONTRACT前置死锁/看板拖拽阻断输单
- 2个P1:列表列不一致/需求描述必填冲突
```

## 商机修正指令

```plaintext
Request:
P0-1: CONTRACT行输单改为✅
P0-2: CONTRACT前置"确认启动在线合同流程",合同编号回写→WON前置
P0-3: 看板任意非终态可拖到LOST列
P1-4: 合同编号+创建人列表展示→否
P1-5: 需求描述→推进到需求确认时必填
```
