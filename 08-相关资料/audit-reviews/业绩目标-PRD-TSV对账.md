# 业绩目标-PRD-TSV对账

> 对账日期：2026-09-27
> 对账范围：业绩目标详细稿 TSV、业绩目标主 PRD、Demo PRD、annotations 页面标注、CRM/ERP事件与结算规则。
> 权威关系：TSV负责字段事实；主PRD负责目标、聚合、结算、调整和差异规则；Demo/annotations负责页面交互；ERP订单事实仍以ERP为SSOT。

## 总评

- 业绩目标 TSV 共 75 个字段，表头严格 13 列；字段名称、英文名、字段类型均未改动。
- 已按现有 Demo/annotations 补齐新增页、编辑页、筛选、详情、取值说明和备注；当前原型未实现的筛选区、月份导航及部分结算技术区块均标为“未定义/待确认”，没有臆造为已上线能力。
- 主 PRD 已补入 75 个字段的完整 TSV 投影。计数、金额差异、版本、失败原因、事件是否计入等字段保持独立，未折叠。
- 目标新增/编辑实际只明确销售、目标月份、线索目标数、商机目标数、赢单目标金额；销售ID、编号、聚合进度和结算/审计字段由系统生成或只读。

## 对账依据与处理

- `业绩目标_Demo_列表页.md`、`业绩目标_Demo_新增编辑页.md`、`业绩目标_Demo_详情页.md`：目标表单、列表、详情口径。
- `annotations/pages/performance-target-list.md`、`performance-target-form.md`、`performance-target-detail.md`：实际原型；以实际未实现状态覆盖 Demo 预设能力。
- 业绩目标主 PRD：CRM事件聚合、ERP订单确认、结算锁、调整和差异审计规则。
- 未在原型落地的筛选、月份导航、结算区块使用 `未定义/待确认`，但字段仍保留。

## 空列和页面修正

- 原空列按字段语义补齐；新增/编辑只把有表单证据的 5 个核心目标字段设为控件，其余系统字段为不展示/只读。
- 当前原型没有完整筛选区，75 个字段的筛选列统一按实际页面设为否并在备注标待确认；这不表示未来业务规则禁止筛选。
- 详情按原型已实现的核心目标、进度和状态展示补齐；结算处理状态、锁状态、金额差异、实时聚合时间等区块未完整实现，标待确认。

## 逐字段核对

| # | TSV字段 | 结论 | 核对结论与依据 |
|---:|---|---|---|
| 1 | 目标编号（targetNo） | 补充+修正 | 系统生成编号；列表/详情只读，新增编辑不展示，来源主PRD与目标Demo。 |
| 2 | 销售（salespersonId） | 补充+修正 | 新增/编辑明确为销售选择控件；列表/详情按实际原型。 |
| 3 | 目标月份（targetMonth） | 补充+修正 | 新增/编辑明确月份输入；月份导航在当前原型未实现，标待确认。 |
| 4 | 线索目标数（leadTargetCount） | 补充+修正 | 新增/编辑数字输入；列表/详情目标值展示。 |
| 5 | 商机目标数（opportunityTargetCount） | 补充+修正 | 新增/编辑数字输入；列表/详情目标值展示。 |
| 6 | 赢单目标金额（wonAmountTarget） | 补充+修正 | 新增/编辑数字输入；列表/详情目标值展示，金额沿用ERP/CRM规则。 |
| 7 | 目标创建时间（createdTime） | 补充+修正 | 系统生成审计字段；详情保留，页面筛选未实现待确认。 |
| 8 | 创建人（createdBy） | 补充+修正 | 系统生成只读；详情/列表是否展示以实际原型为准。 |
| 9 | 目标状态（targetStatus） | 补充+修正 | 系统状态单选；列表Tag/详情状态展示。 |
| 10 | 销售ID（salesId） | 补充+修正 | 销售主数据稳定标识，系统映射/只读；不与销售名称混用。 |
| 11 | 销售姓名快照（salesNameSnapshot） | 补充+修正 | 创建/调整快照；详情只读，当前列表展示待确认。 |
| 12 | 团队快照（teamSnapshot） | 补充+修正 | 创建/结算快照；不在表单编辑，当前页面展示待确认。 |
| 13 | 区域快照（regionSnapshot） | 补充+修正 | 创建/结算快照；不把区域实时主数据替代历史快照。 |
| 14 | 当前销售姓名（currentSalesName） | 补充+修正 | 实时主数据展示字段；详情保留，当前原型展示范围待确认。 |
| 15 | 当前线索转化数（currentLeadConversionCount） | 补充+修正 | CRM事件聚合计数，详情进度展示；筛选未实现待确认。 |
| 16 | 当前商机数（currentOpportunityCount） | 补充+修正 | CRM商机事件聚合计数，详情进度展示。 |
| 17 | 当前 CRM WON 金额（currentCrmWonAmount） | 补充+修正 | CRM WON聚合金额；与ERP确认金额分开保留。 |
| 18 | 当前 ERP 确认订单金额（currentErpConfirmedOrderAmount） | 补充+修正 | ERP订单SSOT聚合金额；详情区块展示待确认。 |
| 19 | 金额差异（amountDifference） | 补充+修正 | 按CRM WON减ERP确认订单金额计算；原型未完整展示，标待确认。 |
| 20 | 实时聚合时间（realtimeAggregationTime） | 补充+修正 | 聚合任务完成时间；结算/详情展示未在当前原型完整实现。 |
| 21 | 实时值版本（realtimeValueVersion） | 补充+修正 | 聚合结果版本审计字段；不作为表单字段。 |
| 22 | 来源事件ID（sourceEventId） | 补充+修正 | 事件归集唯一标识；保留独立审计字段。 |
| 23 | 来源事件类型（sourceEventType） | 补充+修正 | CRM/ERP事件类型单选；枚举以主PRD事件规则为准。 |
| 24 | 事件时间（eventTime） | 补充+修正 | 来源系统事件发生时间；与到达时间、结算时间分离。 |
| 25 | 事件销售ID（eventSalesId） | 补充+修正 | 事件发生时责任销售；用于归集，不等同当前销售。 |
| 26 | 事件金额（eventAmount） | 补充+修正 | 金额事件条件必填；来源CRM WON/ERP订单规则。 |
| 27 | 事件币种（eventCurrency） | 补充+修正 | 来源系统币种独立保留；当前页面未确认展示。 |
| 28 | 事件是否计入（eventIncluded） | 补充+修正 | 归集规则计算的单选标识；不是用户表单布尔输入。 |
| 29 | 去重状态（deduplicationStatus） | 补充+修正 | 事件去重处理状态；详情/技术区块展示待确认。 |
| 30 | 去重键（deduplicationKey） | 补充+修正 | 事件或订单事实去重键；独立审计字段。 |
| 31 | 到达时间（arrivedTime） | 补充+修正 | 接入任务时间，与事件时间区分；页面未确认。 |
| 32 | 结算版本（settlementVersion） | 补充+修正 | 结算任务版本，成功后必填；结算区块待确认。 |
| 33 | 结算截止时间（settlementCutoffTime） | 补充+修正 | 按目标月末和Asia/Shanghai规则生成；非用户直接编辑。 |
| 34 | 结算时间（settledTime） | 补充+修正 | 结算成功时间；系统审计字段。 |
| 35 | 锁定时间（lockedTime） | 补充+修正 | 结算锁生效时间；系统生成，详情区块待确认。 |
| 36 | 锁状态（lockStatus） | 补充+修正 | 结算并发锁单选状态；与目标主状态分离。 |
| 37 | 结算快照目标值（settlementTargetValueSnapshot） | 补充+修正 | 结算时目标值快照，保持独立字段；复合目标结构待确认。 |
| 38 | 结算快照线索转化数（settlementLeadConversionCountSnapshot） | 补充+修正 | 截止前计数快照，类型和来源与TSV一致。 |
| 39 | 结算快照商机数（settlementOpportunityCountSnapshot） | 补充+修正 | 截止前商机计数快照；详情待确认。 |
| 40 | 结算快照 CRM WON 金额（settlementCrmWonAmountSnapshot） | 补充+修正 | 截止前CRM聚合快照；与ERP快照分离。 |
| 41 | 结算快照 ERP 确认订单金额（settlementErpConfirmedOrderAmountSnapshot） | 补充+修正 | 截止前ERP聚合快照；订单SSOT仍为ERP。 |
| 42 | 结算快照金额差异（settlementAmountDifferenceSnapshot） | 补充+修正 | 两个结算快照金额差；详情展示未实现待确认。 |
| 43 | 结算处理状态（settlementProcessingStatus） | 补充+修正 | 结算任务状态单选；当前原型未完整呈现处理区块。 |
| 44 | 失败原因（failureReason） | 补充+修正 | 失败时用户可读错误摘要，多行文本；没有臆造枚举。 |
| 45 | 结算任务编号（settlementTaskNo） | 补充+修正 | 调度任务编号，只读审计字段。 |
| 46 | 截止时间（deadline） | 补充+修正 | 结算任务截止时间；系统生成，不与目标月份输入混用。 |
| 47 | 最近结算时间（lastSettlementTime） | 补充+修正 | 最近尝试时间；与成功结算时间区分。 |
| 48 | 重试次数（retryCount） | 补充+修正 | 结算累计重试数字字段；不折叠进失败原因。 |
| 49 | 补偿状态（compensationStatus） | 补充+修正 | 结算任务补偿状态；与处理状态分离。 |
| 50 | 结算幂等键（settlementIdempotencyKey） | 补充+修正 | 目标编号+月份形成任务幂等键；页面不展示。 |
| 51 | 结算错误码（settlementErrorCode） | 补充+修正 | 失败技术错误码；详情/筛选未定义，标待确认。 |
| 52 | 调整原因（adjustmentReason） | 补充+修正 | 调整动作原因单选；调整页面控件以Demo/annotations为准。 |
| 53 | 调整人（adjustedBy） | 补充+修正 | 当前登录用户审计字段；只读。 |
| 54 | 调整时间（adjustedTime） | 补充+修正 | 系统生成调整时间；只读。 |
| 55 | 调整前目标值（targetValueBeforeAdjustment） | 补充+修正 | 调整前快照；复合目标值形态未在源中充分定义，保留待确认。 |
| 56 | 调整后目标值（targetValueAfterAdjustment） | 补充+修正 | 保存结果快照；不新造指标结构。 |
| 57 | 调整版本（adjustmentVersion） | 补充+修正 | 保存递增版本，数字类型按审计规则修正。 |
| 58 | 版本号（version） | 补充+修正 | 乐观锁/并发控制版本；只读技术字段。 |
| 59 | 差异审计编号（discrepancyAuditNo） | 补充+修正 | 差异检测生成的审计记录编号。 |
| 60 | 差异审计时间（discrepancyAuditTime） | 补充+修正 | 差异检测时间；与结算时间分开。 |
| 61 | 差异来源（discrepancySource） | 补充+修正 | 晚到、取消、修正、转组等单选来源；枚举以主PRD待确认。 |
| 62 | CRM商机ID（crmOpportunityId） | 补充+修正 | CRM WON事件关联ID；跨对象技术字段独立保留。 |
| 63 | CRM WON事件ID（crmWonEventId） | 补充+修正 | CRM WON事件唯一标识；不折叠进商机ID。 |
| 64 | CRM WON时间（crmWonTime） | 补充+修正 | 赢单事件发生时间；与事件到达/结算时间区分。 |
| 65 | CRM WON金额（crmWonAmount） | 补充+修正 | 赢单事件金额；与目标金额、ERP金额分开。 |
| 66 | ERP订单ID（erpOrderId） | 补充+修正 | ERP订单稳定标识；ERP为订单SSOT。 |
| 67 | ERP订单确认事件ID（erpOrderConfirmationEventId） | 补充+修正 | ERP确认事件标识；独立事件审计字段。 |
| 68 | ERP订单确认时间（erpOrderConfirmationTime） | 补充+修正 | ERP订单确认时间；不以CRM WON时间替代。 |
| 69 | ERP订单状态（erpOrderStatus） | 补充+修正 | ERP订单状态单选；来源及枚举由ERP事件规则约束。 |
| 70 | ERP确认订单金额（erpConfirmedOrderAmount） | 补充+修正 | ERP确认金额数字字段；是订单事实金额。 |
| 71 | ERP拆单/合单关联ID（erpSplitMergeRelationId） | 补充+修正 | 拆单/合单关联技术字段；条件存在时保留。 |
| 72 | ERP取消/退款金额（erpCancellationRefundAmount） | 补充+修正 | ERP修正金额数字字段；用于差异修正，非目标金额。 |
| 73 | ERP修正版本（erpCorrectionVersion） | 补充+修正 | ERP订单修正版本技术字段；独立保留。 |
| 74 | 币种（currency） | 补充+修正 | CRM/ERP金额币种来源；页面未定义筛选/详情时标待确认。 |
| 75 | 含税标识（taxIncludedFlag） | 补充+修正 | CRM/ERP金额含税标识；不把税制规则扩展为新字段。 |

## 未发现的新增字段

用例样例和接口事件中的嵌套请求参数未作为业绩目标对象字段新增；结算、CRM WON、ERP订单字段均以当前 TSV 为界。

## 修改结果

- TSV 修正/补全字段行：75；字段数据行仍为 75，严格 13 列。
- 主 PRD 补字段投影：75 个 TSV 字段。
- 待确认：当前原型未实现的筛选/月份导航/结算技术详情，以及复合目标值快照的数据结构；不影响字段存在和类型事实。
