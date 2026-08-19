# 页面标注需求覆盖矩阵

| 模块 | 来源需求 | 来源位置 | 页面 | 标注Key | 状态 |
| --- | --- | --- | --- | --- | --- |
| leads | `REQ-LEADS-TABS-001` | ../线索_Demo_列表页.md#2-状态-tab-栏 | /leads | `leads:leads:2` | 已挂载 |
| leads | `REQ-LEADS-TABS-002` | ../线索_Demo_列表页.md#状态-tab-栏-tab-交互规则 | /leads | `leads:leads:2` | 已挂载 |
| leads | `REQ-LEADS-STATE-001` | ../线索主PRD.md#5-状态机 | /leads | `leads:leads:2`, `leads:leads:8` | 已挂载 |
| leads | `REQ-LEADS-R04-001` | ../线索主PRD.md#r04-48h超时回收计算机制 | /leads | `leads:leads:2`, `leads:leads:9` | 已挂载 |
| leads | `REQ-LEADS-R09-001` | ../线索主PRD.md#r09-ai-评分分级流向规则 | /leads | `leads:leads:2`, `leads:leads:7` | 已挂载 |
| leads | `REQ-LEADS-R10-001` | ../线索主PRD.md#r10-公海-7-天防撞墙保护规则 | /leads | `leads:leads:2` | 已挂载 |
| leads | `REQ-LEADS-FILTER-001` | ../线索_Demo_列表页.md#3-查询区 | /leads | `leads:leads:3` | 已挂载 |
| leads | `REQ-LEADS-FIELDS-001` | ../线索字段清单.md#一、基础信息字段；#二、分配与跟进字段；#四、展示规则 | /leads | `leads:leads:3`, `leads:leads:6`, `leads:leads:7` | 已挂载 |
| leads | `REQ-LEADS-TABLE-001` | ../线索_Demo_列表页.md#5-表格 | /leads | `leads:leads:1`, `leads:leads:4`, `leads:leads:5`, `leads:leads:6` | 已挂载 |
| leads | `REQ-LEADS-OPS-001` | ../线索_Demo_列表页.md#行内操作（按状态动态展示） | /leads | `leads:leads:8` | 已挂载 |
| leads | `REQ-LEADS-MODAL-001` | ../线索_Demo_列表页.md#6-二次确认弹窗规格 | /leads | `leads:leads:4`, `leads:leads:5`, `leads:leads:8` | 已挂载 |
| leads | `REQ-LEADS-R05-001` | ../线索主PRD.md#r05-转客户强一致性与-ssot-规则 | /leads | `leads:leads:8` | 已挂载 |
| leads | `REQ-LEADS-R07-001` | ../线索主PRD.md#r07-放弃原因必填约束 | /leads | `leads:leads:8` | 已挂载 |
| leads | `REQ-LEADS-PERMS-001` | ../线索主PRD.md#8-权限设计 | /leads | `leads:leads:5`, `leads:leads:9` | 已挂载 |
| leads | `REQ-LEADS-EXCEPTIONS-001` | ../线索主PRD.md#9-边界与异常处理 | /leads | `leads:leads:9` | 已挂载 |
| leads | `REQ-LEAD-FORM-PAGE-001` | ../线索_Demo_新增编辑页.md#1-页面概述 | /leads/new|/leads/:id/edit | `leads:leads-new:1` | 已挂载 |
| leads | `REQ-LEAD-FORM-FIELDS-001` | ../线索_Demo_新增编辑页.md#3-表单卡片；../线索字段清单.md#一、基础信息字段 | /leads/new|/leads/:id/edit | `leads:leads-new:2`, `leads:leads-new:3`, `leads:leads-new:4`, `leads:leads-new:5`, `leads:leads-new:6` | 已挂载 |
| leads | `REQ-LEAD-FORM-DEDUP-001` | ../线索主PRD.md#r01-全局唯一去重规则；../线索主PRD.md#9.2-去重与幂等 | /leads/new|/leads/:id/edit | `leads:leads-new:4`, `leads:leads-new:7` | 已挂载 |
| leads | `REQ-LEAD-FORM-VALIDATION-001` | ../线索主PRD.md#r02-字段完整性规则；../线索_Demo_新增编辑页.md#5.2-提交 | /leads/new|/leads/:id/edit | `leads:leads-new:3`, `leads:leads-new:4`, `leads:leads-new:7`, `leads:leads-new:9` | 已挂载 |
| leads | `REQ-LEAD-FORM-MODE-001` | ../线索_Demo_新增编辑页.md#4-编辑模式差异 | /leads/new|/leads/:id/edit | `leads:leads-new:1` | 已挂载 |
| leads | `REQ-LEAD-FORM-DRAFT-001` | ../线索_Demo_新增编辑页.md#2-固定底部操作栏；../线索_Demo_新增编辑页.md#5.1-保存草稿；../线索主PRD.md#5.3-状态流转表 | /leads/new|/leads/:id/edit | `leads:leads-new:8` | 已挂载 |
| leads | `REQ-LEAD-FORM-SUBMIT-001` | ../线索_Demo_新增编辑页.md#2-固定底部操作栏；../线索_Demo_新增编辑页.md#5.2-提交 | /leads/new|/leads/:id/edit | `leads:leads-new:9` | 已挂载 |
| leads | `REQ-LEAD-FORM-AI-001` | ../线索主PRD.md#r08-ai-评分静态加权计算模型；../线索主PRD.md#r09-ai-评分分级流向规则；../线索主PRD.md#7-ai-串联规则 | /leads/new|/leads/:id/edit | `leads:leads-new:9` | 已挂载 |
| leads | `REQ-LEAD-DETAIL-PAGE-001` | ../线索_Demo_详情页.md#1-页面概述 | /leads/:id | `leads:leads-id:1` | 已挂载 |
| leads | `REQ-LEAD-DETAIL-STATUS-001` | ../线索_Demo_详情页.md#2-状态区；../线索主PRD.md#5.1-对象状态；../线索主PRD.md#5.3-状态流转表 | /leads/:id | `leads:leads-id:2` | 已挂载 |
| leads | `REQ-LEAD-DETAIL-AI-001` | ../线索_Demo_详情页.md#3-ai-评分卡片；../线索主PRD.md#r08-ai-评分静态加权计算模型；../线索主PRD.md#r09-ai-评分分级流向规则 | /leads/:id | `leads:leads-id:3` | 已挂载 |
| leads | `REQ-LEAD-DETAIL-BASIC-001` | ../线索_Demo_详情页.md#4-基本信息卡片；../线索字段清单.md#一、基础信息字段；../线索字段清单.md#二、分配与跟进字段；../线索字段清单.md#三、系统字段 | /leads/:id | `leads:leads-id:4` | 已挂载 |
| leads | `REQ-LEAD-DETAIL-FOLLOW-001` | ../线索_Demo_详情页.md#5-跟进记录时间线；../线索_Demo_详情页.md#7.1-添加跟进；../线索主PRD.md#5.3-状态流转表 | /leads/:id | `leads:leads-id:5`, `leads:leads-id:7` | 已挂载 |
| leads | `REQ-LEAD-DETAIL-ACTIONS-001` | ../线索_Demo_详情页.md#6-底部操作栏（按状态动态展示）；../线索主PRD.md#5.4-动作能力矩阵；../线索主PRD.md#8.2-操作权限矩阵 | /leads/:id | `leads:leads-id:6` | 已挂载 |
| leads | `REQ-LEAD-DETAIL-CLAIM-001` | ../线索_Demo_详情页.md#7.4-认领；../线索主PRD.md#r10-公海认领与撤销放弃规则 | /leads/:id | `leads:leads-id:6` | 已挂载 |
| leads | `REQ-LEAD-DETAIL-ABANDON-001` | ../线索_Demo_详情页.md#7.3-放弃；../线索字段清单.md#二、分配与跟进字段；../线索主PRD.md#r07-放弃/作废原因约束；../线索主PRD.md#r10-公海认领与撤销放弃规则 | /leads/:id | `leads:leads-id:8` | 已挂载 |
| leads | `REQ-LEAD-DETAIL-CONVERT-001` | ../线索_Demo_详情页.md#7.2-转客户；../线索主PRD.md#r05-转客户强一致性与-ssot-规则；../线索主PRD.md#r06-终态只读保护规则 | /leads/:id | `leads:leads-id:9` | 已挂载 |
| leads | `REQ-LEAD-DETAIL-DRAFT-VOID-001` | ../线索主PRD.md#5.3-状态流转表；../线索主PRD.md#r07-放弃/作废原因约束；../线索主PRD.md#r11-回收与作废动作分离规则；../线索_Demo_详情页.md#6-底部操作栏（按状态动态展示） | /leads/:id | `leads:leads-id:10` | 已挂载 |
