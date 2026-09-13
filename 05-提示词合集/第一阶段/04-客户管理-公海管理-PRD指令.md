# 04 — 客户管理 & 公海管理 PRD 指令

## 客户主PRD

```plaintext
Context: forge-crm 客户管理。SSOT在ERP,CRM持有快照+360°视图。

Request: 创建客户主PRD.md:
- In Scope:客户列表(ERP同步)/详情(快照+商机+订单+跟进聚合)/AI流失预警
- Out Scope:客户新增/编辑(归ERP)/合并去重
- 规则:SSOT在ERP/线索转客户时CRM创建快照并通知ERP建档/ERP变更增量同步
- AI:流失预警每日定时,高/中/低三级
```

## 客户字段清单

```plaintext
Request: 创建客户字段清单.md:
- 快照字段8个:编号/公司/联系人/手机/行业/地区/等级/信用额度(从ERP同步,只读)
- 关联聚合6个:商机数/最近阶段/最近跟进/流失风险/订单数/累计成交金额
- 流失风险:高红/中黄/低绿
```

## 客户 Demo PRD

```plaintext
Request: 创建客户_Demo_列表页/详情页.md:
- 列表:查询栏+表格(无"新增"按钮,SSOT在ERP)+Mock≥10条
- 详情:360°视图—流失Banner+快照+关联商机+关联订单+跟进时间线
```

## 公海主PRD

```plaintext
Context: 公海=线索的共享池,PENDING_ASSIGN+ABANDONED≥7天。

Request: 创建公海主PRD.md:
- 规则:认领→ASSIGNED/公海保护7天/仅展示可认领线索
```

## 公海字段清单 & Demo

```plaintext
Request: 创建公海字段清单+公海_Demo_列表页.md:
- 查询栏+表格8列+认领按钮
- 入池类型:NEW(蓝)/RELEASED(灰)
- 认领:无二次确认,Toast提示
- Mock≥10条:5NEW+5RELEASED
```
