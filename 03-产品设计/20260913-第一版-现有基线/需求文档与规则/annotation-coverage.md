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
| leads | `REQ-LEAD-FORM-FIELDS-001` | ../线索_Demo_新增编辑页.md#3-表单卡片；../线索字段清单.md#一、基础信息字段 | /leads/new|/leads/:id/edit | `leads:leads-new:2` | 已挂载 |
| leads | `REQ-LEAD-FORM-DEDUP-001` | ../线索主PRD.md#r01-全局唯一去重规则；../线索主PRD.md#9.2-去重与幂等 | /leads/new|/leads/:id/edit | `leads:leads-new:2` | 已挂载 |
| leads | `REQ-LEAD-FORM-VALIDATION-001` | ../线索主PRD.md#r02-字段完整性规则；../线索_Demo_新增编辑页.md#5.2-提交 | /leads/new|/leads/:id/edit | `leads:leads-new:3` | 已挂载 |
| leads | `REQ-LEAD-FORM-MODE-001` | ../线索_Demo_新增编辑页.md#4-编辑模式差异 | /leads/new|/leads/:id/edit | `leads:leads-new:1` | 已挂载 |
| leads | `REQ-LEAD-FORM-DRAFT-001` | ../线索_Demo_新增编辑页.md#2-固定底部操作栏；../线索_Demo_新增编辑页.md#5.1-保存草稿；../线索主PRD.md#5.3-状态流转表 | /leads/new|/leads/:id/edit | `leads:leads-new:4` | 已挂载 |
| leads | `REQ-LEAD-FORM-SUBMIT-001` | ../线索_Demo_新增编辑页.md#2-固定底部操作栏；../线索_Demo_新增编辑页.md#5.2-提交 | /leads/new|/leads/:id/edit | `leads:leads-new:5` | 已挂载 |
| leads | `REQ-LEAD-FORM-AI-001` | ../线索主PRD.md#r08-ai-评分静态加权计算模型；../线索主PRD.md#r09-ai-评分分级流向规则；../线索主PRD.md#7-ai-串联规则 | /leads/new|/leads/:id/edit | `leads:leads-new:5` | 已挂载 |
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
| lead-pool | `REQ-POOL-PAGE-001` | ../公海_Demo_列表页.md#1-页面概述、../公海主PRD.md#4-业务场景 | /lead-pool | `lead-pool:lead-pool:1` | 已挂载 |
| lead-pool | `REQ-POOL-FILTER-001` | ../公海_Demo_列表页.md#3-查询区、../公海字段清单.md#一、公海视图列表列 | /lead-pool | `lead-pool:lead-pool:2` | 已挂载 |
| lead-pool | `REQ-POOL-TABLE-001` | ../公海_Demo_列表页.md#6-表格规格、../公海主PRD.md#6.1-入池与展示规则 | /lead-pool | `lead-pool:lead-pool:3` | 已挂载 |
| lead-pool | `REQ-POOL-AI-001` | ../公海主PRD.md#7-AI串联规则、../公海字段清单.md#一、公海视图列表列 | /lead-pool | `lead-pool:lead-pool:4` | 已挂载 |
| lead-pool | `REQ-POOL-ENTRY-001` | ../公海_Demo_列表页.md#5-入池类型Tag、../公海字段清单.md#二、入池类型标签 | /lead-pool | `lead-pool:lead-pool:5` | 已挂载 |
| lead-pool | `REQ-POOL-PROTECT-001` | ../公海_Demo_列表页.md#7-原负责人例外规则、../公海主PRD.md#6.3-保护期规则、../公海主PRD.md#9-边界与异常处理 | /lead-pool | `lead-pool:lead-pool:6` | 已挂载 |
| lead-pool | `REQ-POOL-CLAIM-001` | ../公海_Demo_列表页.md#8-认领交互、../公海主PRD.md#5-状态机、../公海主PRD.md#6.2-认领与归属规则 | /lead-pool | `lead-pool:lead-pool:7` | 已挂载 |
| opportunities | `REQ-OPP-LIST-PAGE-001` | ../商机_Demo_列表页.md#1-页面概述、../商机主PRD.md#2-功能范围、../商机主PRD.md#3-对象定位 | /opportunities | `opportunities:opportunities:1` | 已挂载 |
| opportunities | `REQ-OPP-VIEWS-001` | ../商机_Demo_列表页.md#4-工具条、../商机_Demo_列表页.md#5-看板视图、../商机_Demo_列表页.md#6-列表视图 | /opportunities | `opportunities:opportunities:2` | 已挂载 |
| opportunities | `REQ-OPP-CREATE-001` | ../商机_Demo_列表页.md#4-工具条、../商机_Demo_新增编辑页.md#1-页面概述、../商机主PRD.md#8.2-操作权限矩阵 | /opportunities | `opportunities:opportunities:3` | 已挂载 |
| opportunities | `REQ-OPP-FILTER-001` | ../商机_Demo_列表页.md#3-查询区、../商机字段清单.md#一、基础信息字段、../商机字段清单.md#二、系统字段 | /opportunities | `opportunities:opportunities:4` | 已挂载 |
| opportunities | `REQ-OPP-KANBAN-001` | ../商机_Demo_列表页.md#5-看板视图、../商机主PRD.md#5-状态机、../商机主PRD.md#6.2-阶段推进规则 | /opportunities | `opportunities:opportunities:5` | 已挂载 |
| opportunities | `REQ-OPP-TABS-001` | ../商机_Demo_列表页.md#2-状态Tab与后台计数、../商机_Demo_列表页.md#6-列表视图 | /opportunities | `opportunities:opportunities:6` | 已挂载 |
| opportunities | `REQ-OPP-LIST-001` | ../商机_Demo_列表页.md#6-列表视图、../商机字段清单.md#一、基础信息字段、../商机字段清单.md#二、系统字段、../商机字段清单.md#五、展示规则 | /opportunities | `opportunities:opportunities:7` | 已挂载 |
| opportunities | `REQ-OPP-ROW-001` | ../商机_Demo_列表页.md#6.3-行内操作动态矩阵、../商机主PRD.md#5.4-动作能力矩阵、../商机主PRD.md#8.2-操作权限矩阵 | /opportunities | `opportunities:opportunities:8` | 已挂载 |
| opportunities | `REQ-OPP-LOST-001` | ../商机_Demo_列表页.md#7.3-输单关闭、../商机字段清单.md#一、基础信息字段、../商机主PRD.md#6.3-关闭与下推规则 | /opportunities | `opportunities:opportunities:9` | 已挂载 |
| opportunities | `REQ-OPP-CONTRACT-001` | ../商机_Demo_列表页.md#7.2-发起合同、../商机主PRD.md#5.3-状态流转表、../商机主PRD.md#6.2-阶段推进规则 | /opportunities | `opportunities:opportunities:10` | 已挂载 |
| opportunities | `REQ-OPP-FORM-PAGE-001` | ../商机_Demo_新增编辑页.md#1-页面概述、../商机_Demo_新增编辑页.md#2-路由与初始化、../商机_Demo_新增编辑页.md#7-新增与编辑模式差异 | /opportunities/new|/opportunities/:id/edit | `opportunities:opportunities-new:1` | 已挂载 |
| opportunities | `REQ-OPP-FORM-VALIDATION-001` | ../商机_Demo_新增编辑页.md#9-保存交互规范、../商机_Demo_新增编辑页.md#10-加载、空态与异常、../商机主PRD.md#6-核心业务规则 | /opportunities/new|/opportunities/:id/edit | `opportunities:opportunities-new:2` | 已挂载 |
| opportunities | `REQ-OPP-FORM-TITLE-001` | ../商机_Demo_新增编辑页.md#4.1-商机名称、../商机字段清单.md#一、基础信息字段 | /opportunities/new|/opportunities/:id/edit | `opportunities:opportunities-new:3` | 已挂载 |
| opportunities | `REQ-OPP-FORM-CUSTOMER-001` | ../商机_Demo_新增编辑页.md#4.2-关联客户、../商机字段清单.md#一、基础信息字段、../商机主PRD.md#6.1-创建与引用规则 | /opportunities/new|/opportunities/:id/edit | `opportunities:opportunities-new:3` | 已挂载 |
| opportunities | `REQ-OPP-FORM-FORECAST-001` | ../商机_Demo_新增编辑页.md#4.3-预计金额、../商机_Demo_新增编辑页.md#4.4-预计成交日期、../商机字段清单.md#一、基础信息字段 | /opportunities/new|/opportunities/:id/edit | `opportunities:opportunities-new:3` | 已挂载 |
| opportunities | `REQ-OPP-FORM-PRODUCT-001` | ../商机_Demo_新增编辑页.md#5-商品明细工具区、../商机_Demo_新增编辑页.md#6-字段联动规则、../商机字段清单.md#三、商品明细对象 | /opportunities/new|/opportunities/:id/edit | `opportunities:opportunities-new:3` | 已挂载 |
| opportunities | `REQ-OPP-FORM-REQUIREMENT-001` | ../商机_Demo_新增编辑页.md#4.5-需求描述、../商机_Demo_新增编辑页.md#6-字段联动规则、../商机字段清单.md#一、基础信息字段 | /opportunities/new|/opportunities/:id/edit | `opportunities:opportunities-new:3` | 已挂载 |
| opportunities | `REQ-OPP-FORM-FOOTER-001` | ../商机_Demo_新增编辑页.md#8-底部操作栏、../商机_Demo_新增编辑页.md#9.3-保存成功、../商机_Demo_新增编辑页.md#9.4-保存失败 | /opportunities/new|/opportunities/:id/edit | `opportunities:opportunities-new:4` | 已挂载 |
| opportunities | `REQ-OPP-FORM-SAVE-001` | ../商机_Demo_新增编辑页.md#9-保存交互规范、../商机主PRD.md#6.1-创建与引用规则、../商机主PRD.md#7-AI串联规则 | /opportunities/new|/opportunities/:id/edit | `opportunities:opportunities-new:5` | 已挂载 |
| opportunities | `REQ-OPP-DETAIL-PAGE-001` | ../商机_Demo_详情页.md#1-页面概述、../商机_Demo_详情页.md#2-加载与权限、../商机主PRD.md#8-权限设计 | /opportunities/:id | `opportunities:opportunities-id:1` | 已挂载 |
| opportunities | `REQ-OPP-DETAIL-STATUS-001` | ../商机_Demo_详情页.md#3-页头状态区、../商机字段清单.md#一、基础信息字段、../商机主PRD.md#7-AI串联规则 | /opportunities/:id | `opportunities:opportunities-id:2` | 已挂载 |
| opportunities | `REQ-OPP-DETAIL-TIMELINE-001` | ../商机_Demo_详情页.md#4-6个业务节点+输单终态时间线、../商机主PRD.md#5-状态机 | /opportunities/:id | `opportunities:opportunities-id:3` | 已挂载 |
| opportunities | `REQ-OPP-DETAIL-BASIC-001` | ../商机_Demo_详情页.md#5-商机信息卡片、../商机字段清单.md#一、基础信息字段、../商机字段清单.md#二、系统字段 | /opportunities/:id | `opportunities:opportunities-id:4` | 已挂载 |
| opportunities | `REQ-OPP-DETAIL-PRODUCT-001` | ../商机_Demo_详情页.md#6-商品明细表格、../商机字段清单.md#三、商品明细对象、../商机主PRD.md#6.1-创建与引用规则 | /opportunities/:id | `opportunities:opportunities-id:5` | 已挂载 |
| opportunities | `REQ-OPP-DETAIL-FOLLOW-001` | ../商机_Demo_详情页.md#7-跟进记录组件、../商机_Demo_详情页.md#7.4-添加跟进抽屉、../商机主PRD.md#5.4-动作能力矩阵 | /opportunities/:id | `opportunities:opportunities-id:6` | 已挂载 |
| opportunities | `REQ-OPP-DETAIL-ACTIONS-001` | ../商机_Demo_详情页.md#9-底部操作矩阵、../商机_Demo_详情页.md#10-动作交互与弹窗、../商机主PRD.md#5.4-动作能力矩阵 | /opportunities/:id | `opportunities:opportunities-id:7` | 已挂载 |
| opportunities | `REQ-OPP-DETAIL-FOLLOW-MODAL-001` | ../商机_Demo_详情页.md#7.4-添加跟进抽屉、../商机_Demo_详情页.md#7.5-空态与异常 | /opportunities/:id | `opportunities:opportunities-id:8` | 已挂载 |
| opportunities | `REQ-OPP-DETAIL-LOST-001` | ../商机_Demo_详情页.md#10.3-输单、../商机字段清单.md#一、基础信息字段、../商机主PRD.md#6.3-关闭与下推规则 | /opportunities/:id | `opportunities:opportunities-id:9` | 已挂载 |
| opportunities | `REQ-OPP-DETAIL-CONTRACT-001` | ../商机_Demo_详情页.md#8-关联合同与ERP结果、../商机_Demo_详情页.md#10.1-推进、../商机_Demo_详情页.md#10.2-发起合同、../商机主PRD.md#6.2-阶段推进规则、../商机主PRD.md#6.3-关闭与下推规则 | /opportunities/:id | `opportunities:opportunities-id:10` | 已挂载 |
| customers | `REQ-CUSTOMER-LIST-PAGE-001` | ../客户_Demo_列表页.md#1-页面概述、../客户主PRD.md#1-业务背景 | /customers | `customers:customers:1` | 已挂载 |
| customers | `REQ-CUSTOMER-LIST-FILTER-001` | ../客户_Demo_列表页.md#3-查询区、../客户字段清单.md#六、展示规则 | /customers | `customers:customers:2` | 已挂载 |
| customers | `REQ-CUSTOMER-LIST-TABLE-001` | ../客户_Demo_列表页.md#6-表格规格、../客户字段清单.md#一、客户身份与生命周期字段、../客户字段清单.md#四、CRM 关联聚合字段 | /customers | `customers:customers:3` | 已挂载 |
| customers | `REQ-CUSTOMER-LIST-RISK-001` | ../客户_Demo_列表页.md#9-风险展示与筛选、../客户字段清单.md#六、展示规则 | /customers | `customers:customers:4` | 已挂载 |
| customers | `REQ-CUSTOMER-LIST-OPS-001` | ../客户_Demo_列表页.md#7-行内操作、../客户主PRD.md#8-权限设计 | /customers | `customers:customers:5` | 已挂载 |
| customers | `REQ-CUSTOMER-LIST-PAGING-001` | ../客户_Demo_列表页.md#10-分页、加载与空态、../客户_Demo_列表页.md#13-验收清单 | /customers | `customers:customers:6` | 已挂载 |
| customers | `REQ-CUSTOMER-DETAIL-PAGE-001` | ../客户_Demo_详情页.md#1-页面概述、../客户主PRD.md#4-业务场景 | /customers/:id | `customers:customers-id:1` | 已挂载 |
| customers | `REQ-CUSTOMER-DETAIL-RISK-001` | ../客户_Demo_详情页.md#4-AI 流失风险 Banner、../客户主PRD.md#7-AI 串联规则 | /customers/:id | `customers:customers-id:2` | 已挂载 |
| customers | `REQ-CUSTOMER-DETAIL-SNAPSHOT-001` | ../客户_Demo_详情页.md#5-ERP 客户快照卡片、../客户字段清单.md#二、快照字段(从 ERP 同步,只读) | /customers/:id | `customers:customers-id:3` | 已挂载 |
| customers | `REQ-CUSTOMER-DETAIL-SYNC-001` | ../客户_Demo_详情页.md#3-页头与同步状态、../客户_Demo_详情页.md#5.3-SSOT 提示、../客户字段清单.md#三、快照同步元数据 | /customers/:id | `customers:customers-id:4` | 已挂载 |
| customers | `REQ-CUSTOMER-DETAIL-OPPS-001` | ../客户_Demo_详情页.md#7-关联商机表格、../客户_Demo_详情页.md#6-CRM 关系概览 | /customers/:id | `customers:customers-id:5` | 已挂载 |
| customers | `REQ-CUSTOMER-DETAIL-ORDERS-001` | ../客户_Demo_详情页.md#8-ERP 关联订单表格、../客户字段清单.md#五、跨模块关联与展示规则 | /customers/:id | `customers:customers-id:6` | 已挂载 |
| customers | `REQ-CUSTOMER-DETAIL-ORDER-ACTIONS-001` | ../客户_Demo_详情页.md#8.3-订单交互、../客户_Demo_详情页.md#12.2-ERP 外链 | /customers/:id | `customers:customers-id:7` | 已挂载 |
| customers | `REQ-CUSTOMER-DETAIL-FOLLOW-001` | ../客户_Demo_详情页.md#9-跟进聚合组件、../客户主PRD.md#4-业务场景 | /customers/:id | `customers:customers-id:8` | 已挂载 |
| customers | `REQ-CUSTOMER-DETAIL-ACTIONS-001` | ../客户_Demo_详情页.md#11-底部操作栏、../客户_Demo_详情页.md#12-二次确认与反馈 | /customers/:id | `customers:customers-id:9` | 已挂载 |
| contracts | `REQ-CONTRACT-LIST-VIEWS-001` | ../合同_Demo_列表页.md#1-页面概述、../合同_Demo_列表页.md#2-状态 Tab 与后台计数 | /contracts | `contracts:contracts:1` | 已挂载 |
| contracts | `REQ-CONTRACT-LIST-FILTER-001` | ../合同_Demo_列表页.md#3-查询区、../合同字段清单.md#一、基础字段 | /contracts | `contracts:contracts:2` | 已挂载 |
| contracts | `REQ-CONTRACT-LIST-CREATE-001` | ../合同_Demo_列表页.md#4-工具条、../合同_Demo_新增编辑页.md#2-路由与初始化 | /contracts | `contracts:contracts:3` | 已挂载 |
| contracts | `REQ-CONTRACT-LIST-TABLE-001` | ../合同_Demo_列表页.md#5-表格规格、../合同字段清单.md#一、基础字段、../合同字段清单.md#四、联动与审计字段 | /contracts | `contracts:contracts:4` | 已挂载 |
| contracts | `REQ-CONTRACT-LIST-OPS-001` | ../合同_Demo_列表页.md#6-行内操作动态矩阵、../合同主PRD.md#5-状态机 | /contracts | `contracts:contracts:5` | 已挂载 |
| contracts | `REQ-CONTRACT-LIST-PAGING-001` | ../合同_Demo_列表页.md#9-分页、加载与空态 | /contracts | `contracts:contracts:6` | 已挂载 |
| contracts | `REQ-CONTRACT-LIST-VOID-001` | ../合同_Demo_列表页.md#7-二次确认弹窗、../合同主PRD.md#6-核心业务规则 | /contracts | `contracts:contracts:7` | 已挂载 |
| contracts | `REQ-CONTRACT-FORM-PAGE-001` | ../合同_Demo_新增编辑页.md#1-页面概述、../合同主PRD.md#3-对象定位 | /contracts/new|/contracts/:id/edit | `contracts:contracts-new:1` | 已挂载 |
| contracts | `REQ-CONTRACT-FORM-BASE-001` | ../合同_Demo_新增编辑页.md#3-页面布局、../合同_Demo_新增编辑页.md#4-字段控件规格、../合同字段清单.md#一、基础字段 | /contracts/new|/contracts/:id/edit | `contracts:contracts-new:2` | 已挂载 |
| contracts | `REQ-CONTRACT-FORM-OPPORTUNITY-001` | ../合同_Demo_新增编辑页.md#4.2-关联商机、../合同主PRD.md#6.1-创建与引用规则 | /contracts/new|/contracts/:id/edit | `contracts:contracts-new:2` | 已挂载 |
| contracts | `REQ-CONTRACT-FORM-CUSTOMER-001` | ../合同_Demo_新增编辑页.md#4.3-关联客户、../合同字段清单.md#三、关联字段 | /contracts/new|/contracts/:id/edit | `contracts:contracts-new:2` | 已挂载 |
| contracts | `REQ-CONTRACT-FORM-TITLE-001` | ../合同_Demo_新增编辑页.md#4.1-合同名称、../合同字段清单.md#一、基础字段 | /contracts/new|/contracts/:id/edit | `contracts:contracts-new:2` | 已挂载 |
| contracts | `REQ-CONTRACT-FORM-AMOUNT-001` | ../合同_Demo_新增编辑页.md#4.4-合同金额、../合同_Demo_新增编辑页.md#4.8-币种、含税标识与税率、../合同字段清单.md#一、基础字段 | /contracts/new|/contracts/:id/edit | `contracts:contracts-new:2` | 已挂载 |
| contracts | `REQ-CONTRACT-FORM-FOOTER-001` | ../合同_Demo_新增编辑页.md#8-底部操作栏、../合同_Demo_新增编辑页.md#10-未保存离开 | /contracts/new|/contracts/:id/edit | `contracts:contracts-new:3` | 已挂载 |
| contracts | `REQ-CONTRACT-FORM-DRAFT-001` | ../合同_Demo_新增编辑页.md#5-保存交互规范、../合同主PRD.md#5.3-状态流转表 | /contracts/new|/contracts/:id/edit | `contracts:contracts-new:4` | 已挂载 |
| contracts | `REQ-CONTRACT-FORM-SUBMIT-001` | ../合同_Demo_新增编辑页.md#5-提交、../合同主PRD.md#6.2-阶段推进规则 | /contracts/new|/contracts/:id/edit | `contracts:contracts-new:5` | 已挂载 |
| contracts | `REQ-CONTRACT-DETAIL-PAGE-001` | ../合同_Demo_详情页.md#1-页面概述、../合同_Demo_详情页.md#2-初始化与权限 | /contracts/:id | `contracts:contracts-id:1` | 已挂载 |
| contracts | `REQ-CONTRACT-DETAIL-VOID-001` | ../合同_Demo_详情页.md#3-页头状态区、../合同_Demo_详情页.md#8.4-作废回退摘要 | /contracts/:id | `contracts:contracts-id:2` | 已挂载 |
| contracts | `REQ-CONTRACT-DETAIL-BASIC-001` | ../合同_Demo_详情页.md#5-合同信息卡片、../合同字段清单.md#一、基础字段 | /contracts/:id | `contracts:contracts-id:3` | 已挂载 |
| contracts | `REQ-CONTRACT-DETAIL-OPPORTUNITY-001` | ../合同_Demo_详情页.md#6-关联客户与商机、../合同主PRD.md#6-阶段推进规则 | /contracts/:id | `contracts:contracts-id:4` | 已挂载 |
| contracts | `REQ-CONTRACT-DETAIL-CUSTOMER-001` | ../合同_Demo_详情页.md#6.1-客户摘要、../合同字段清单.md#三、关联字段 | /contracts/:id | `contracts:contracts-id:5` | 已挂载 |
| contracts | `REQ-CONTRACT-DETAIL-SIGNING-001` | ../合同_Demo_详情页.md#7-签署结果区块、../合同_Demo_详情页.md#4-五节点合同时间线 | /contracts/:id | `contracts:contracts-id:6` | 已挂载 |
| contracts | `REQ-CONTRACT-DETAIL-ACTIONS-001` | ../合同_Demo_详情页.md#10-底部操作矩阵、../合同主PRD.md#5.4-动作能力矩阵 | /contracts/:id | `contracts:contracts-id:7` | 已挂载 |
| contracts | `REQ-CONTRACT-DETAIL-DIALOG-001` | ../合同_Demo_详情页.md#11.3-作废、../合同主PRD.md#6-核心业务规则 | /contracts/:id | `contracts:contracts-id:8` | 已挂载 |
| visits | `REQ-VISIT-LIST-PAGE-001` | ../拜访计划Demo_列表页.md#1-页面布局、../拜访计划主PRD.md#10.1-列表页 | /visits | `visits:visits:1` | 已挂载 |
| visits | `REQ-VISIT-LIST-TABS-001` | ../拜访计划主PRD.md#4.2-主状态、执行结果和异常标识、../拜访计划Demo_列表页.md#5-状态、Tag 与空态 | /visits | `visits:visits:2` | 已挂载 |
| visits | `REQ-VISIT-LIST-FILTER-001` | ../拜访计划Demo_列表页.md#2-顶部操作、../拜访计划主PRD.md#10.1-列表页 | /visits | `visits:visits:3` | 已挂载 |
| visits | `REQ-VISIT-LIST-TABLE-001` | ../拜访计划Demo_列表页.md#3-列表字段与展示规则、../拜访计划字段清单.md#2.计划字段、../拜访计划字段清单.md#3.执行字段 | /visits | `visits:visits:4` | 已挂载 |
| visits | `REQ-VISIT-LIST-OPS-001` | ../拜访计划Demo_列表页.md#4-行操作矩阵、../拜访计划主PRD.md#9-状态动作权限与失败处理矩阵 | /visits | `visits:visits:5` | 已挂载 |
| visits | `REQ-VISIT-LIST-CHECKIN-001` | ../拜访计划Demo_列表页.md#4-行操作矩阵、../拜访计划主PRD.md#8-PC Web 签到与定位边界 | /visits | `visits:visits:6` | 已挂载 |
| visits | `REQ-VISIT-LIST-CANCEL-001` | ../拜访计划Demo_列表页.md#4-行操作矩阵、../拜访计划主PRD.md#5.1-状态规则、../拜访计划字段清单.md#6.异常与审计字段 | /visits | `visits:visits:7` | 已挂载 |
| visits | `REQ-VISIT-LIST-PAGING-001` | ../拜访计划主PRD.md#10.1-列表页、../拜访计划Demo_列表页.md#5-状态、Tag 与空态 | /visits | `visits:visits:8` | 已挂载 |
| visits | `REQ-VISIT-FORM-PAGE-001` | ../拜访计划Demo_新增编辑页.md#1-页面布局、../拜访计划主PRD.md#10.2-新增/编辑页 | /visits/new|/visits/:id/edit | `visits:visits-new:1` | 已挂载 |
| visits | `REQ-VISIT-FORM-BASE-001` | ../拜访计划Demo_新增编辑页.md#2-表单字段、../拜访计划字段清单.md#2.计划字段、../拜访计划字段清单.md#5.关联字段 | /visits/new|/visits/:id/edit | `visits:visits-new:2` | 已挂载 |
| visits | `REQ-VISIT-FORM-ASSOCIATION-001` | ../拜访计划Demo_新增编辑页.md#2-表单字段、../拜访计划主PRD.md#6-关联对象规则 | /visits/new|/visits/:id/edit | `visits:visits-new:2` | 已挂载 |
| visits | `REQ-VISIT-FORM-TITLE-001` | ../拜访计划Demo_新增编辑页.md#2-表单字段、../拜访计划字段清单.md#2.计划字段 | /visits/new|/visits/:id/edit | `visits:visits-new:2` | 已挂载 |
| visits | `REQ-VISIT-FORM-TIME-001` | ../拜访计划Demo_新增编辑页.md#2-表单字段、../拜访计划主PRD.md#4.4-时间和空值规则 | /visits/new|/visits/:id/edit | `visits:visits-new:2` | 已挂载 |
| visits | `REQ-VISIT-FORM-ADDRESS-001` | ../拜访计划Demo_新增编辑页.md#2-表单字段、../拜访计划字段清单.md#2.计划字段 | /visits/new|/visits/:id/edit | `visits:visits-new:2` | 已挂载 |
| visits | `REQ-VISIT-FORM-FOOTER-001` | ../拜访计划Demo_新增编辑页.md#1-页面布局、../拜访计划Demo_新增编辑页.md#3-新增流程 | /visits/new|/visits/:id/edit | `visits:visits-new:3` | 已挂载 |
| visits | `REQ-VISIT-FORM-SAVE-001` | ../拜访计划Demo_新增编辑页.md#3-新增流程、../拜访计划Demo_新增编辑页.md#5-校验与错误状态、../拜访计划主PRD.md#9-状态动作权限与失败处理矩阵 | /visits/new|/visits/:id/edit | `visits:visits-new:4` | 已挂载 |
| visits | `REQ-VISIT-DETAIL-PAGE-001` | ../拜访计划Demo_详情页.md#1-页面布局、../拜访计划主PRD.md#10.3-详情页 | /visits/:id | `visits:visits-id:1` | 已挂载 |
| visits | `REQ-VISIT-DETAIL-CANCEL-001` | ../拜访计划Demo_详情页.md#3-信息分区、../拜访计划主PRD.md#5.1-状态规则 | /visits/:id | `visits:visits-id:2` | 已挂载 |
| visits | `REQ-VISIT-DETAIL-SCHEDULE-001` | ../拜访计划Demo_详情页.md#5-计划信息卡片、../拜访计划字段清单.md#2.计划字段 | /visits/:id | `visits:visits-id:3` | 已挂载 |
| visits | `REQ-VISIT-DETAIL-ASSOCIATION-001` | ../拜访计划Demo_详情页.md#6-关联对象摘要、../拜访计划字段清单.md#5.关联字段 | /visits/:id | `visits:visits-id:4` | 已挂载 |
| visits | `REQ-VISIT-DETAIL-FEEDBACK-ENTRY-001` | ../拜访计划Demo_详情页.md#8-完成结果与自动跟进、../拜访计划字段清单.md#4.反馈字段 | /visits/:id | `visits:visits-id:5` | 已挂载 |
| visits | `REQ-VISIT-DETAIL-FEEDBACK-SUMMARY-001` | ../拜访计划Demo_详情页.md#8-完成结果与自动跟进、../拜访计划主PRD.md#5.5-反馈状态闭环 | /visits/:id | `visits:visits-id:6` | 已挂载 |
| visits | `REQ-VISIT-DETAIL-CHECKIN-SNAPSHOT-001` | ../拜访计划Demo_详情页.md#7-签到结果区块、../拜访计划字段清单.md#3.执行字段 | /visits/:id | `visits:visits-id:7` | 已挂载 |
| visits | `REQ-VISIT-DETAIL-CHECKIN-001` | ../拜访计划Demo_详情页.md#2-顶部摘要与动作、../拜访计划主PRD.md#8-PC Web 签到与定位边界 | /visits/:id | `visits:visits-id:8` | 已挂载 |
| visits | `REQ-VISIT-DETAIL-ACTIONS-001` | ../拜访计划Demo_详情页.md#2-顶部摘要与动作、../拜访计划Demo_详情页.md#5-弹窗、Toast 与失败态、../拜访计划主PRD.md#9-状态动作权限与失败处理矩阵 | /visits/:id | `visits:visits-id:9` | 已挂载 |
| targets | `REQ-TARGET-LIST-PAGE-001` | ../业绩目标_Demo_列表页.md#1-页面概述、../业绩目标主PRD.md#3-对象定位 | /targets | `targets:targets:1` | 已挂载 |
| targets | `REQ-TARGET-LIST-OVERVIEW-001` | ../业绩目标_Demo_列表页.md#6-表格规格、../业绩目标字段清单.md#三、实时进度字段 | /targets | `targets:targets:2` | 已挂载 |
| targets | `REQ-TARGET-LIST-TABLE-001` | ../业绩目标_Demo_列表页.md#6-表格规格、../业绩目标字段清单.md#一、基础字段、../业绩目标字段清单.md#二、销售归属字段 | /targets | `targets:targets:3` | 已挂载 |
| targets | `REQ-TARGET-LIST-PROGRESS-001` | ../业绩目标_Demo_列表页.md#10-防漂移展示、../业绩目标主PRD.md#6.2-进度与归属规则 | /targets | `targets:targets:4` | 已挂载 |
| targets | `REQ-TARGET-LIST-STATUS-001` | ../业绩目标_Demo_列表页.md#3-状态 Tab 与后台计数、../业绩目标主PRD.md#5-状态机与执行路径 | /targets | `targets:targets:5` | 已挂载 |
| targets | `REQ-TARGET-LIST-OPS-001` | ../业绩目标_Demo_列表页.md#5-工具条、../业绩目标主PRD.md#5.4-组合动作能力矩阵 | /targets | `targets:targets:6` | 已挂载 |
| targets | `REQ-TARGET-LIST-SETTLEMENT-001` | ../业绩目标_Demo_列表页.md#9-编辑/结算 dialogs、../业绩目标主PRD.md#6.3-结算与防漂移规则 | /targets | `targets:targets:7` | 已挂载 |
| targets | `REQ-TARGET-LIST-CREATE-001` | ../业绩目标_Demo_列表页.md#5-工具条、../业绩目标_Demo_新增编辑页.md#2-路由与初始化 | /targets | `targets:targets:8` | 已挂载 |
| targets | `REQ-TARGET-FORM-PAGE-001` | ../业绩目标_Demo_新增编辑页.md#1-页面概述、../业绩目标主PRD.md#10-页面与交互要求 | /targets/new | `targets:targets-new:1` | 已挂载 |
| targets | `REQ-TARGET-FORM-BASE-001` | ../业绩目标_Demo_新增编辑页.md#3-页面布局、../业绩目标_Demo_新增编辑页.md#4-字段控件规格、../业绩目标字段清单.md#一、基础字段 | /targets/new | `targets:targets-new:2` | 已挂载 |
| targets | `REQ-TARGET-FORM-SALES-001` | ../业绩目标_Demo_新增编辑页.md#4.1-销售、../业绩目标字段清单.md#二、销售归属字段 | /targets/new | `targets:targets-new:2` | 已挂载 |
| targets | `REQ-TARGET-FORM-MONTH-001` | ../业绩目标_Demo_新增编辑页.md#4.2-目标月份、../业绩目标主PRD.md#6.1-创建与唯一性规则 | /targets/new | `targets:targets-new:2` | 已挂载 |
| targets | `REQ-TARGET-FORM-LEAD-001` | ../业绩目标_Demo_新增编辑页.md#4.3-线索目标数、../业绩目标主PRD.md#6.1-创建与唯一性规则 | /targets/new | `targets:targets-new:2` | 已挂载 |
| targets | `REQ-TARGET-FORM-OPP-001` | ../业绩目标_Demo_新增编辑页.md#4.4-商机目标数、../业绩目标字段清单.md#一、基础字段 | /targets/new | `targets:targets-new:2` | 已挂载 |
| targets | `REQ-TARGET-FORM-AMOUNT-001` | ../业绩目标_Demo_新增编辑页.md#4.5-赢单目标金额、../业绩目标字段清单.md#三、实时进度字段 | /targets/new | `targets:targets-new:2` | 已挂载 |
| targets | `REQ-TARGET-FORM-FOOTER-001` | ../业绩目标_Demo_新增编辑页.md#10-底部操作、../业绩目标_Demo_新增编辑页.md#11-保存 | /targets/new | `targets:targets-new:3` | 已挂载 |
