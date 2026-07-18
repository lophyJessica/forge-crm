# 05 — 合同/拜访/业绩目标 PRD & 审计指令

## 合同管理 PRD

```plaintext
Request: 创建合同主PRD+字段清单+用例推演:
- 状态机:DRAFT→PENDING_SIGN→SIGNED→ARCHIVED/VOIDED
- 由商机CONTRACT触发创建;签署完成→商机WON→ERP订单
- 合同作废→商机回退NEGOTIATION;已签署不可作废
- 合同金额→回写覆盖商机预计金额
```

## 合同管理审计 & 修正

```plaintext
Request: 审计合同管理:
P0-1:合同作废后商机卡死在CONTRACT→修正:联动回退至NEGOTIATION
P1:合同SIGNED时金额回写商机;PENDING_SIGN+商机只读不可回退
```

## 拜访计划 PRD

```plaintext
Request: 创建拜访计划主PRD+字段清单+用例推演:
- 状态机:PLANNED→CHECKED_IN→COMPLETED/CANCELLED
- 关联(线索/商机/客户);签到记录时间+位置
- 未签到不能完成;已完成不可取消
- COMPLETED→自动在关联实体跟进记录生成"拜访"记录
```

## 拜访计划审计 & 修正

```plaintext
Request: 审计拜访计划:
P0:COMPLETED联动写入关联实体跟进记录(核心断层)
P1:签到地址字段缺失;关联对象拆为type+id两字段
P2:支持route state快捷创建
```

## 业绩目标 PRD

```plaintext
Request: 创建业绩目标主PRD+字段清单+用例推演:
- 状态机:ACTIVE→ACHIEVED/UNACHIEVED
- 月度+销售粒度;三项指标(线索/商机/赢单)
- 月底24:00自动结算;锁定后快照防漂移
```

## 业绩目标审计 & 修正

```plaintext
Request: 审计业绩目标:
P1:线索/商机缺转化时间+赢单时间字段→新增
P1:锁定后快照防数据漂移→终态锁定不再动态计算
P2:销售ID映射(张三→S001)
```
