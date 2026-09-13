# 页面标注需求覆盖矩阵

| 模块 | 来源需求 | 来源位置 | 页面 | 标注Key | 状态 |
| --- | --- | --- | --- | --- | --- |
| contracts | `REQ-CONTRACT-LIST-VIEWS-001` | ../合同_Demo_列表页.md#1-页面概述、../合同_Demo_列表页.md#2-状态 Tab 与后台计数 | /contracts | `contracts:contracts:1` | 已挂载 |
| contracts | `REQ-CONTRACT-LIST-FILTER-001` | ../合同_Demo_列表页.md#3-查询区、../合同字段清单.md#一、基础字段 | /contracts | `contracts:contracts:2` | 已挂载 |
| contracts | `REQ-CONTRACT-LIST-CREATE-001` | ../合同_Demo_列表页.md#4-工具条、../合同_Demo_新增编辑页.md#2-路由与初始化 | /contracts | `contracts:contracts:3` | 已挂载 |
| contracts | `REQ-CONTRACT-LIST-TABLE-001` | ../合同_Demo_列表页.md#5-表格规格、../合同字段清单.md#一、基础字段、../合同字段清单.md#四、联动与审计字段 | /contracts | `contracts:contracts:4` | 已挂载 |
| contracts | `REQ-CONTRACT-LIST-OPS-001` | ../合同_Demo_列表页.md#6-行内操作动态矩阵、../合同主PRD.md#5-状态机 | /contracts | `contracts:contracts:5` | 已挂载 |
| contracts | `REQ-CONTRACT-LIST-PAGING-001` | ../合同_Demo_列表页.md#9-分页、加载与空态 | /contracts | `contracts:contracts:6` | 已挂载 |
| contracts | `REQ-CONTRACT-LIST-VOID-001` | ../合同_Demo_列表页.md#7-二次确认弹窗、../合同主PRD.md#6-核心业务规则 | /contracts | `contracts:contracts:7` | 已挂载 |
| contracts | `REQ-CONTRACT-FORM-PAGE-001` | ../合同_Demo_新增编辑页.md#1-页面概述、../合同主PRD.md#3-对象定位 | /contracts/new|/contracts/:id/edit | `contracts:contracts-new:1` | 已挂载 |
| contracts | `REQ-CONTRACT-FORM-BASE-001` | ../合同_Demo_新增编辑页.md#3-页面布局、../合同_Demo_新增编辑页.md#4-字段控件规格、../合同字段清单.md#一、基础字段 | /contracts/new|/contracts/:id/edit | `contracts:contracts-new:2` | 已挂载 |
| contracts | `REQ-CONTRACT-FORM-OPPORTUNITY-001` | ../合同_Demo_新增编辑页.md#4.2-关联商机、../合同主PRD.md#6.1-创建与引用规则 | /contracts/new|/contracts/:id/edit | `contracts:contracts-new:3` | 已挂载 |
| contracts | `REQ-CONTRACT-FORM-CUSTOMER-001` | ../合同_Demo_新增编辑页.md#4.3-关联客户、../合同字段清单.md#三、关联字段 | /contracts/new|/contracts/:id/edit | `contracts:contracts-new:4` | 已挂载 |
| contracts | `REQ-CONTRACT-FORM-TITLE-001` | ../合同_Demo_新增编辑页.md#4.1-合同名称、../合同字段清单.md#一、基础字段 | /contracts/new|/contracts/:id/edit | `contracts:contracts-new:5` | 已挂载 |
| contracts | `REQ-CONTRACT-FORM-AMOUNT-001` | ../合同_Demo_新增编辑页.md#4.4-合同金额、../合同_Demo_新增编辑页.md#4.8-币种、含税标识与税率、../合同字段清单.md#一、基础字段 | /contracts/new|/contracts/:id/edit | `contracts:contracts-new:6` | 已挂载 |
| contracts | `REQ-CONTRACT-FORM-FOOTER-001` | ../合同_Demo_新增编辑页.md#8-底部操作栏、../合同_Demo_新增编辑页.md#10-未保存离开 | /contracts/new|/contracts/:id/edit | `contracts:contracts-new:7` | 已挂载 |
| contracts | `REQ-CONTRACT-FORM-DRAFT-001` | ../合同_Demo_新增编辑页.md#5-保存交互规范、../合同主PRD.md#5.3-状态流转表 | /contracts/new|/contracts/:id/edit | `contracts:contracts-new:8` | 已挂载 |
| contracts | `REQ-CONTRACT-FORM-SUBMIT-001` | ../合同_Demo_新增编辑页.md#5-提交、../合同主PRD.md#6.2-阶段推进规则 | /contracts/new|/contracts/:id/edit | `contracts:contracts-new:9` | 已挂载 |
| contracts | `REQ-CONTRACT-DETAIL-PAGE-001` | ../合同_Demo_详情页.md#1-页面概述、../合同_Demo_详情页.md#2-初始化与权限 | /contracts/:id | `contracts:contracts-id:1` | 已挂载 |
| contracts | `REQ-CONTRACT-DETAIL-VOID-001` | ../合同_Demo_详情页.md#3-页头状态区、../合同_Demo_详情页.md#8.4-作废回退摘要 | /contracts/:id | `contracts:contracts-id:2` | 已挂载 |
| contracts | `REQ-CONTRACT-DETAIL-BASIC-001` | ../合同_Demo_详情页.md#5-合同信息卡片、../合同字段清单.md#一、基础字段 | /contracts/:id | `contracts:contracts-id:3` | 已挂载 |
| contracts | `REQ-CONTRACT-DETAIL-OPPORTUNITY-001` | ../合同_Demo_详情页.md#6-关联客户与商机、../合同主PRD.md#6-阶段推进规则 | /contracts/:id | `contracts:contracts-id:4` | 已挂载 |
| contracts | `REQ-CONTRACT-DETAIL-CUSTOMER-001` | ../合同_Demo_详情页.md#6.1-客户摘要、../合同字段清单.md#三、关联字段 | /contracts/:id | `contracts:contracts-id:5` | 已挂载 |
| contracts | `REQ-CONTRACT-DETAIL-SIGNING-001` | ../合同_Demo_详情页.md#7-签署结果区块、../合同_Demo_详情页.md#4-五节点合同时间线 | /contracts/:id | `contracts:contracts-id:6` | 已挂载 |
| contracts | `REQ-CONTRACT-DETAIL-ACTIONS-001` | ../合同_Demo_详情页.md#10-底部操作矩阵、../合同主PRD.md#5.4-动作能力矩阵 | /contracts/:id | `contracts:contracts-id:7` | 已挂载 |
| contracts | `REQ-CONTRACT-DETAIL-DIALOG-001` | ../合同_Demo_详情页.md#11.3-作废、../合同主PRD.md#6-核心业务规则 | /contracts/:id | `contracts:contracts-id:8` | 已挂载 |
