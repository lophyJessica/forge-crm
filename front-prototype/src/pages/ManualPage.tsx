import React, { useEffect, useState } from 'react';
import mermaid from 'mermaid';
import { BookOpen, Boxes, FileText, ListChecks, MapPinned } from 'lucide-react';

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'loose',
  theme: 'base',
  themeVariables: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    primaryColor: '#e0f2fe',
    primaryTextColor: '#0f172a',
    primaryBorderColor: '#38bdf8',
    lineColor: '#64748b',
    secondaryColor: '#f8fafc',
    tertiaryColor: '#f1f5f9',
  },
});

type ManualSection = {
  id: string;
  title: string;
  purpose: string;
  source: string;
  diagram?: string;
  steps: string[];
  fields: string[];
};

type ManualModule = {
  id: string;
  title: string;
  description: string;
  sections: ManualSection[];
};

function MermaidDiagram({ chart, chartId }: { chart: string; chartId: string }) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setSvg('');
    setError('');

    mermaid
      .render(`manual-${chartId}`, chart)
      .then(({ svg: renderedSvg }) => {
        if (!cancelled) {
          setSvg(renderedSvg);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('流程图渲染失败，请检查 Mermaid 源码。');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chart, chartId]);

  if (error) {
    return <div className="rounded-md border border-red-100 bg-red-50 p-3 text-red-700">{error}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-4">
      {svg ? (
        <div
          className="min-w-[720px] [&_svg]:mx-auto [&_svg]:!max-w-none [&_svg]:!w-auto"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="h-40 animate-pulse rounded-md bg-slate-100" />
      )}
    </div>
  );
}

const manualModules: ManualModule[] = [
  {
    id: 'inbound',
    title: '入库作业',
    description: '收货、质检、上架这一段的现场操作。',
    sections: [
      {
        id: 'receive-order',
        title: '收货单',
        source: 'prd-docs/入库管理/收货单/收货单_业务流程推演.md',
        purpose: '收货单用于把 ERP/采购系统下发的 PO 变成 WMS 现场收货任务，适合收货员到货清点、登记实收和质检结果时使用。',
        diagram: `flowchart LR
    A["ERP 审核通过 PO<br/>PO20260705-0008"] --> B["WMS 接收 PO<br/>下推生成 RCV 待收货"]
    B --> C["仓管打开收货单<br/>选择仓库/库区"]
    C --> D["录入本次实收数量"]
    D --> E{"本次实收 ≤ PO未收?"}
    E -->|否| F["阻断确认<br/>数量标红提示"]
    F --> D
    E -->|是| G["点击确认收货"]
    G --> H["RCV 状态：待收货/收货中 → 待质检<br/>锁定实收数量，库存记入冻结"]
    H --> I["生成收货标签条码<br/>打印标签"]
    I --> J["进行质检登记<br/>录入合格与不合格数量及原因"]
    J --> K{"合格数量 > 0?"}
    K -->|是| L["系统生成上架单 PUT<br/>RCV 状态 → 待上架"]
    K -->|否| M["RCV 状态 → 异常<br/>不允许上架，等待退货处理"]`,
        steps: [
          '看到 PO 下推生成的 RCV 后，先确认单号、供应商和商品明细是不是本次到货，不需要手工改状态。',
          '打开收货单后选择实际收货仓库和库区，再逐行录入本次实收数量；数量不能超过 PO 未收数量，超过时按提示改回正确数量。',
          '确认数量无误后点击“确认收货”，系统会把 RCV 推到待质检，并把实收数量先记入冻结库存。',
          '确认收货后打印收货标签，把标签贴到实物或周转箱上，后续质检和上架都靠这张标签追溯。',
          '质检时录入合格数量、不合格数量和原因；有合格数量时系统生成上架单 PUT，没有合格数量时 RCV 进入异常，不能继续上架。',
        ],
        fields: [
          '仓库/库区：按实际到货地点选择，只能选系统里可用的仓库、库区。',
          '本次实收数量：按现场清点数量填，不能大于 PO 未收数量。',
          '合格数量/不合格数量：质检后再填；有不合格数量时必须补不合格原因。',
          '状态 status：只读，靠“确认收货”和质检动作自动变化，不要手工改。',
        ],
      },
      {
        id: 'putaway-order',
        title: '上架单',
        source: 'prd-docs/入库管理/上架单/上架单_业务流程推演.md',
        purpose: '上架单用于把已经收货且质检合格的商品放到实际货位，适合上架员使用 PDA 扫货位、扫商品并确认上架数量时使用。',
        diagram: `flowchart LR
    A["收货单 RCV 完成收货确认"] --> B["在 RCV 中登记质检结果"]
    B --> C{"合格数量 > 0?"}
    C -->|否| C1["RCV 状态转为异常<br/>不生成 PUT，不允许上架"]
    C -->|是| D["系统生成 PUT 待上架<br/>RCV 状态转为待上架"]
    D --> E["系统推荐货位<br/>空闲货位优先"]
    E --> F["PDA 领取上架任务"]
    F --> G["扫描实际货位"]
    G --> H{"货位有效?"}
    H -->|否| H1["阻断确认<br/>提示货位无效"]
    H1 --> G
    H -->|是| I["录入本次上架数量"]
    I --> J{"本次上架 + 累计已上架 ≤ 合格数量?"}
    J -->|否| J1["阻断确认<br/>提示超出合格数量"]
    J1 --> I
    J -->|是| K["分批即时过账：扣减冻结库存<br/>增加对应货位可用库存，生成 FL"]
    K --> L{"累计上架数量 = 合格总数?"}
    L -->|否| L1["PUT 状态：上架中"] --> G
    L -->|是| M["PUT 状态：已完成<br/>RCV 状态：已完成"]
    M --> N["回传 ERP / 触发财务应付"]`,
        steps: [
          '只有 RCV 质检后有合格数量，系统才会生成 PUT；如果 RCV 异常，就不要找上架任务。',
          '在 PDA 领取上架任务后，先看系统推荐货位，再到现场扫描实际货位条码。',
          '扫错、扫到停用或无效货位时系统会阻断，按提示重新扫描正确货位。',
          '录入本次上架数量时，可以分批上架，但本次加累计已上架不能超过合格数量。',
          '确认一批上架后系统立即扣减冻结库存、增加该货位可用库存并生成 FL；全部合格数量上完后 PUT 和 RCV 才算完成。',
        ],
        fields: [
          '实际货位：以现场扫描为准，必须是有效货位。',
          '本次上架数量：按本次实际放入货位的数量填，不能超过剩余待上架合格数量。',
          '累计已上架数量：系统计算，用来判断是否已全部上架。',
          '状态 status：只读，分批时可能是上架中，全部完成后变为已完成。',
        ],
      },
    ],
  },
  {
    id: 'outbound',
    title: '出库作业',
    description: '波次、拣货、复核、包装和交运的出库链路。',
    sections: [
      {
        id: 'wave-order',
        title: '波次',
        source: 'prd-docs/出库管理/波次/波次_业务流程推演.md',
        purpose: '波次用于把已审核出库需求按仓库、承运商、线路和优先级聚合成可执行任务，适合仓管安排拣货任务时使用。',
        diagram: `flowchart LR
    A["ERP/销售系统下发已审核 SO"] --> B["WMS 形成待波次出库需求<br/>SO 审核已触发库存占用"]
    B --> C{"触发波次生成"}
    C -->|系统定时| D["按仓库+承运商+线路+优先级聚合"]
    C -->|手动圈选| E["仓管选择待波次需求"]
    D --> F{"单组订单数 > 50?"}
    E --> F
    F -->|是| G["自动拆波<br/>每波最多 50 单"]
    F -->|否| H["生成 WAVE 草稿"]
    G --> H
    H --> I["分配人员并下推拣货"]
    I --> J["下推拣货单 PICK<br/>WAVE 状态：草稿 → 拣货中"]
    J --> K["下游拣货/复核/包装/交运"]
    K --> L["包装完成扣减现存、释放占用<br/>现存-N、释放占用-N，并生成 FL"]
    K --> M["交运确认回传进销存"]
    K --> N["关联下游已交运<br/>WAVE 状态：已交运"]
    H --> O["作废/关闭波次<br/>状态：已作废"]`,
        steps: [
          '待波次需求来自已审核 SO，库存占用已经在上游触发，仓管不用在波次里手工扣库存。',
          '系统定时生成时按仓库、承运商、线路和优先级聚合；手动生成时由仓管圈选待波次需求。',
          '如果一组订单超过 50 单，系统会自动拆成多波，操作员按拆出的 WAVE 逐个处理。',
          'WAVE 草稿生成后分配人员并点击下推拣货，系统生成 PICK，WAVE 进入拣货中。',
          '后续拣货、复核、包装、交运都完成后，WAVE 才会跟随下游结果进入已交运；草稿阶段可以作废/关闭。',
        ],
        fields: [
          '仓库、承运商、线路、优先级：决定订单怎么聚合成波次。',
          '订单数：单波最多 50 单，超过会自动拆波。',
          '拣货人员：下推拣货前要分配清楚，避免任务无人领取。',
          '状态 status：草稿、拣货中、已交运、已作废都由动作和下游结果触发。',
        ],
      },
      {
        id: 'picking-order',
        title: '拣货单',
        source: 'prd-docs/出库管理/拣货单/拣货单_业务流程推演.md',
        purpose: '拣货单用于指导拣货员按货位路径取货，适合 PDA 领取任务、扫描货位、扫描商品并确认实拣数量时使用。',
        diagram: `flowchart LR
    A["WAVE 下推生成 PICK<br/>PICK20260705-0001"] --> B["PDA 展示待领取任务"]
    B --> C["拣货员领取任务<br/>状态：待拣 → 拣货中"]
    B -->|上游波次关闭| X["任务作废/终止<br/>状态：已作废"]
    C -->|上游波次关闭| X
    C --> D["按货位路径展示当前明细"]
    D -->|上游波次关闭| X
    D --> E["扫描货位条码"]
    E --> F{"货位匹配?"}
    F -->|否| F1["阻断<br/>语音+震动提示扫错货位"]
    F1 --> E
    F -->|是| G["扫描商品条码"]
    G --> H{"商品匹配?"}
    H -->|否| H1["阻断<br/>提示商品不匹配"]
    H1 --> G
    H -->|是| I["输入/确认实拣数量"]
    I --> J{"实拣 ≤ 应拣?"}
    J -->|否| J1["超拣阻断"]
    J1 --> I
    J -->|是且实拣=应拣| K["明细已拣"]
    J -->|是且实拣<应拣| L["登记缺货原因<br/>明细缺货完成"]
    K --> M{"是否还有待拣明细?"}
    L --> M
    M -->|是| D
    M -->|否| N["完成拣货<br/>状态：已拣完"]
    N --> O["流转复核 CHECK"]
    X --> Y["作业终止"]`,
        steps: [
          'PICK 由 WAVE 下推生成，拣货员在 PDA 待领取任务里领取，领取后状态从待拣变为拣货中。',
          '按 PDA 展示的货位路径走，不要跳着扫；上游波次关闭时任务会终止。',
          '先扫货位条码，扫错会语音和震动提示，必须回到正确货位重新扫。',
          '货位正确后扫商品条码，商品不匹配会阻断，不能把其他商品当成本行商品拣走。',
          '输入或确认实拣数量；实拣不能超过应拣，少拣时要登记缺货原因，所有明细完成后点击完成拣货并流转复核。',
        ],
        fields: [
          '货位条码：必须匹配当前推荐货位。',
          '商品条码：必须匹配当前明细商品。',
          '应拣数量 shouldPickQty：系统给出，只能作为参照，不手工改。',
          '实拣数量 actualPickQty：现场实际拣到多少填多少，不能超拣。',
          '缺货原因 shortageReason：实拣少于应拣时必填；原因是其他时补充备注。',
        ],
      },
      {
        id: 'check-order',
        title: '复核单',
        source: 'prd-docs/出库管理/复核单/复核单_业务流程推演.md',
        purpose: '复核单用于检查拣货结果是否和订单一致，适合复核员扫描箱码、逐件扫商品并决定通过或退回拣货时使用。',
        diagram: `flowchart LR
    A["PICK 已拣完<br/>PICK20260705-0001"] --> B["系统生成 CHECK<br/>CHECK20260705-0001<br/>状态：待复核"]
    B --> C["复核员领取/开始复核<br/>状态：待复核 → 复核中"]
    B -->|上游波次/拣货异常关闭| X["任务作废<br/>状态：已作废"]
    C -->|上游波次/拣货异常关闭| X
    C --> D["扫描发货箱/包厢"]
    D --> E{"箱码属于当前 CHECK?"}
    E -->|否| E1["阻断<br/>提示箱码不属于当前复核单"]
    E1 --> D
    E -->|是| F["逐件扫描商品"]
    F --> G{"商品属于当前箱/订单?"}
    G -->|否| G1["记录错品/串箱异常<br/>不能复核通过"]
    G1 --> K
    G -->|是| H["累计实复核数"]
    H --> I{"实复核数 = 应复核数?"}
    I -->|否| I1["记录数量差异<br/>少件/多件"]
    I1 --> K{"确认复核不通过?"}
    I -->|是| J{"是否所有明细均匹配?"}
    J -->|否| F
    J -->|是| L["确认复核通过<br/>状态：已复核"]
    L --> M["流转包裹 PKG<br/>进入包装作业"]
    K -->|是| N["填写退回原因<br/>状态：已退回拣货"]
    N --> O["回退 PICK<br/>重拣/补拣"]
    K -->|否| F
    X --> Y["作业终止<br/>不流转包装"]`,
        steps: [
          'PICK 已拣完后系统生成 CHECK，复核员领取或开始复核后进入复核中。',
          '先扫描发货箱或包厢，箱码不属于当前 CHECK 时会阻断，不能混箱复核。',
          '逐件扫描商品，扫到错品或串箱时系统记录异常，这种情况不能直接复核通过。',
          '系统累计实复核数；数量不等于应复核数时记录少件或多件差异。',
          '所有明细匹配后点击确认复核通过，流转到 PKG 包装；确认不通过时要填写退回原因并回退 PICK 重拣或补拣。',
        ],
        fields: [
          '箱码/包厢码：必须属于当前 CHECK。',
          '商品条码：逐件扫描，不能跳过异常商品。',
          '应复核数/实复核数：实复核数由扫描累计，用来判断少件或多件。',
          '退回原因：复核不通过时必填，方便拣货员重拣。',
          '状态 status：待复核、复核中、已复核、已退回拣货、已作废均由动作触发。',
        ],
      },
      {
        id: 'package-order',
        title: '包裹',
        source: 'prd-docs/出库管理/包裹/包裹_业务流程推演.md',
        purpose: '包裹用于把已复核通过的货品完成包装、称重、贴面单并触发库存实扣，适合包装员在包装台操作时使用。',
        diagram: `flowchart LR
    A["CHECK 已复核<br/>CHECK20260705-0001"] --> B["系统生成 PKG<br/>PKG20260705-000001<br/>状态：待包装"]
    B --> C["包装员开始包装<br/>状态：待包装 → 包装中"]
    B -->|上游异常关闭| X["任务作废<br/>状态：已作废"]
    C --> D["包裹称重<br/>packageWeightKg > 0"]
    D --> E["确认承运商<br/>SF 顺丰"]
    E --> F["生成/录入面单号<br/>SF202607050001"]
    F --> G["打印面单并确认贴单"]
    G --> H{"包装完成校验通过?"}
    H -->|否| H1["阻断完成<br/>提示缺失项"]
    H1 --> D
    H -->|是| I{"库存校验通过?"}
    I -->|否| I1["过账失败<br/>PKG 保持包装中<br/>不生成 FL"]
    I1 --> D
    I -->|是| J["确认包装完成<br/>状态：已包装"]
    J --> K["库存过账<br/>现存-N<br/>占用-N<br/>可用不变"]
    K --> L["生成库存流水 FL<br/>FL20260705-00000001"]
    L --> M["流转交运 DSH<br/>等待承运商交接"]
    X --> Y["作业终止<br/>不触发库存过账"]`,
        steps: [
          'CHECK 已复核后系统生成 PKG，包装员点击开始包装，状态进入包装中。',
          '先称重，包裹重量 packageWeightKg 必须大于 0。',
          '确认承运商后生成或录入面单号，再打印面单并确认已贴到对应包裹上。',
          '点击完成包装时系统检查重量、承运商、面单等是否齐全；缺项会阻断完成。',
          '包装校验和库存校验都通过后才能确认包装完成，系统扣现存、释放占用、生成 FL，并流转到交运 DSH。',
        ],
        fields: [
          'packageWeightKg：包裹重量，必须大于 0。',
          '承运商 carrier：要和发货安排一致，后续交运会按承运商聚合。',
          '面单号 trackingNo：生成或录入后必须贴单确认。',
          '库存过账状态 stockPostStatus：过账失败时 PKG 保持包装中，不生成 FL。',
          '状态 status：待包装、包装中、已包装、已作废由动作触发。',
        ],
      },
      {
        id: 'shipping-order',
        title: '交运单',
        source: 'prd-docs/出库管理/交运单/交运单_业务流程推演.md',
        purpose: '交运单用于把已包装包裹交给承运商并记录交接结果，适合发货员现场扫描包裹、核对数量和确认交运时使用。',
        diagram: `flowchart LR
    A["PKG 已包装<br/>包裹已完成库存实扣"] --> B["按承运商/线路聚合生成 DSH<br/>DSH20260705-0001<br/>状态：待交运"]
    B --> C["发货员开始交运<br/>状态：待交运 → 交运中"]
    B -->|上游包裹异常关闭| X["任务作废<br/>状态：已作废"]
    C --> D["扫描包裹号/面单号"]
    D --> E{"包裹属于当前 DSH 且已包装?"}
    E -->|否| E1["阻断<br/>提示包裹不属于本单或未包装"]
    E1 --> D
    E -->|是| F["记录已扫描/已交接"]
    F --> G{"是否全部包裹已交接?"}
    G -->|否| D
    G -->|是| H["填写承运商交接人/时间/地点"]
    H --> I{"交接信息完整?"}
    I -->|否| I1["阻断确认交运"]
    I1 --> H
    I -->|是| J["确认交运<br/>状态：已交运<br/>订单状态完结"]
    J --> K["回传 TMS 交运结果"]
    J --> L["回传 ERP 发货完成回执"]
    J --> M["生成/回传财务出库凭证"]
    J --> N["库存不变<br/>不扣现存/不释放占用/不生成 FL"]
    X --> Y["作业终止"]`,
        steps: [
          'DSH 由已包装包裹按承运商或线路聚合生成，发货员点击开始交运后进入交运中。',
          '逐个扫描包裹号或面单号，系统校验包裹是否属于当前 DSH 且已经包装。',
          '扫错单或扫到未包装包裹会阻断，按提示拿回正确包裹再扫。',
          '全部包裹都扫描交接后，填写承运商交接人、交接时间和交接地点。',
          '交接信息完整后点击确认交运，系统完结订单并回传 TMS、ERP、财务；交运环节库存不再变化，也不生成 FL。',
        ],
        fields: [
          '包裹号/面单号：扫描时必须属于当前 DSH，且包裹状态为已包装。',
          'carrierContactName：承运商交接人，确认交运前必填。',
          'actualHandoverAt：实际交接时间，确认交运前必填，不能晚于当前时间。',
          '交接地点：确认交运前补齐，避免事后追溯不清。',
          '回传状态：TMS/ERP/财务回传失败不撤销已交运，只保留重试入口和失败记录。',
        ],
      },
    ],
  },
  {
    id: 'inventory',
    title: '库存管理',
    description: '库存余额、库存流水和库存预警的查询口径。',
    sections: [
      {
        id: 'stock-query',
        title: '库存查询',
        source: 'prd-docs/库存管理/库存查询/库存查询_业务流程推演.md',
        purpose: '库存查询用于查看当前库存的现存、占用、冻结、在途和可用数量，适合仓管找货、盘点前核对或异常追溯时使用。',
        diagram: `flowchart LR
    A["用户打开库存查询页"] --> B["系统读取账号权限范围"]
    B --> C["用户输入筛选条件<br/>仓库/库区/货位/商品/批次"]
    C --> D{"是否 PDA 扫码?"}
    D -->|是| D1["解析货位条码或商品条码"]
    D -->|否| D2["读取 PC 筛选表单"]
    D1 --> E["组装查询参数"]
    D2 --> E
    E --> F["后端先应用 permissionScope"]
    F --> G["按仓库/库区/货位/SKU/批次聚合库存余额"]
    G --> H["计算可用 = 现存 - 占用 - 冻结"]
    H --> I{"hideZeroStock = true?"}
    I -->|是| J["过滤 qtyOnHand <= 0"]
    I -->|否| K["保留全部匹配行"]
    J --> L{"是否有结果?"}
    K --> L
    L -->|有| M["返回列表、分页、数量字段"]
    L -->|无| N["展示空状态"]`,
        steps: [
          '打开页面后系统先按账号权限圈定可见仓库范围，操作员只能看到授权范围内库存。',
          '在 PC 上输入仓库、库区、货位、商品或批次筛选条件；在 PDA 上可以通过扫码解析货位或商品。',
          '点击查询后系统先套权限，再按仓库、库区、货位、SKU 和批次聚合库存余额。',
          '列表里的可用量由系统按“现存 - 占用 - 冻结”计算，操作员只看结果，不在本页改库存。',
          '勾选 hideZeroStock 后会隐藏现存量小于等于 0 的行；没有结果时页面展示空状态。',
        ],
        fields: [
          'warehouseCode、zoneCode、locationCode：用于定位库存所在位置。',
          '商品/批次：按商品编码、名称或 batchNo 查找指定库存。',
          'hideZeroStock：为 true 时隐藏零库存或负库存行。',
          'qtyOnHand、qtyAllocated、qtyFrozen、qtyAvailable：都是只读结果，不能在查询页直接修改。',
        ],
      },
      {
        id: 'inventory-flow',
        title: '库存流水',
        source: 'prd-docs/库存管理/库存流水/库存流水_业务流程推演.md',
        purpose: '库存流水用于追溯每一次库存变动和变动后快照，适合查清某个商品为什么多了、少了、冻结或释放时使用。',
        diagram: `flowchart LR
    Start["库存动作生效"] --> Type{"变动类型"}

    Type -->|"入库+ / 调拨+ / 盘盈+"| Inc["写入正向变动数量 +N"]
    Type -->|"出库- / 调拨- / 盘亏-"| Dec["写入负向变动数量 -N"]
    Type -->|"冻结 / 解冻 / 占用 / 释放"| State["写入口径状态变动数量<br/>现存可不变"]

    Inc --> Snapshot["保存变动后快照<br/>现存/占用/冻结/可用"]
    Dec --> Snapshot
    State --> Snapshot

    Snapshot --> CreateFL["生成 FL<br/>FL{YYYYMMDD}-{8位序号}"]
    CreateFL --> ReadOnly["库存流水只读落库"]

    User["PC/PDA 用户"] --> Query["进入库存流水列表页"]
    Query --> Filter["输入仓库/货位/商品/时间段/变动类型等条件"]
    Filter --> Validate{"条件是否合法?"}
    Validate -->|"否"| Error["展示校验提示<br/>不发起查询"]
    Validate -->|"是"| Auth["叠加用户仓库权限"]
    Auth --> Search["查询 FL 列表"]
    Search --> HasData{"是否有结果?"}
    HasData -->|"是"| List["按发生时间倒序展示"]
    HasData -->|"否"| Empty["展示暂无数据<br/>无新增入口"]`,
        steps: [
          '库存流水不是人工新建的，只有入库、出库、调拨、盘点、报损等库存动作生效后，系统才会写 FL。',
          '系统按变动类型写正向数量、负向数量，或写冻结、解冻、占用、释放这类状态变动。',
          '每条 FL 都保存变动后快照，方便追溯当时的现存、占用、冻结和可用数量。',
          '操作员进入流水列表后输入仓库、货位、商品、时间段、变动类型或来源单号查询。',
          '查询条件不合法时系统提示且不发起查询；有结果时按发生时间倒序展示，没有结果时只展示暂无数据，不提供新增入口。',
        ],
        fields: [
          'flowType：变动类型，如入库、出库、调拨、盘盈、盘亏、报损等。',
          'flowDirection：出入方向，查正向、负向或全部方向。',
          'sourceOrderId：来源业务单号，用来从 RCV、WAVE、TR、BL 等单据追到 FL。',
          'dateStart/dateEnd：变动时间范围，填错时会被校验拦住。',
          '变动后快照：只读，用来复盘库存变化，不允许编辑。',
        ],
      },
      {
        id: 'inventory-warning',
        title: '库存预警',
        source: 'prd-docs/库存管理/库存预警/库存预警_业务流程推演.md',
        purpose: '库存预警用于把当前现存和商品档案阈值做只读比对，适合仓管查看哪些商品低于安全库存或最低库存时使用。',
        diagram: `flowchart LR
    A["用户进入库存预警页(PC/PDA)"] --> B["系统加载查询条件<br/>仓库/商品/预警等级"]
    B --> C["用户设置筛选条件"]
    C --> D["点击查询"]
    D --> E["读取库存聚合结果<br/>按仓库+商品汇总当前现存"]
    E --> F["读取商品档案阈值<br/>安全库存/最低库存"]
    F --> G{"阈值是否可计算"}
    G -->|"最低库存命中<br/>currentStock < minimumStock"| H["生成 MINIMUM_LOW<br/>列表标红"]
    G -->|"安全库存命中<br/>currentStock < safetyStock"| I["生成 SAFETY_LOW<br/>列表标黄"]
    G -->|"未命中或阈值缺失"| J["不进入预警清单<br/>缺失阈值标注待治理"]
    H --> K["按预警等级/现存/仓库/商品排序"]
    I --> K
    K --> L["展示只读预警列表"]
    J --> M["无匹配时展示空状态"]`,
        steps: [
          '进入库存预警页后，系统加载仓库、商品和预警等级筛选条件。',
          '操作员设置筛选条件并点击查询，系统按仓库和商品汇总当前现存。',
          '系统读取商品档案里的安全库存 safetyStock 和最低库存 minimumStock，并判断阈值是否可计算。',
          '低于最低库存时生成 MINIMUM_LOW 并标红；低于安全库存时生成 SAFETY_LOW 并标黄。',
          '没有命中预警或阈值缺失时不生成处理任务，也不自动补货，只展示只读结果或空状态。',
        ],
        fields: [
          'warehouseCode：按仓库过滤预警。',
          'productKeyword：按商品编码或名称过滤。',
          'warningLevel：全部预警、低于安全库存或低于最低库存。',
          'currentStock：当前现存，来自库存聚合结果。',
          'safetyStock/minimumStock：来自商品档案；缺失时展示待治理，不自动补默认值。',
        ],
      },
    ],
  },
  {
    id: 'check',
    title: '盘点管理',
    description: '盘点单从建单、冻结、实盘到差异调整的闭环。',
    sections: [
      {
        id: 'inventory-check',
        title: '盘点单',
        source: 'prd-docs/盘点管理/盘点单/盘点单_业务流程推演.md',
        purpose: '盘点单用于锁定指定范围并核对账实差异，适合仓管创建盘点任务、盘点员 PDA 实盘、主管审核差异时使用。',
        diagram: `flowchart LR
    A["PC 创建盘点单 CK<br/>状态：草稿"] --> B["选择盘点类型、范围、盘点人、审核人"]
    B --> C["开始盘点<br/>锁定范围"]
    C --> D["货位进入冻结态<br/>禁止出入库"]
    D --> E["PDA 扫描货位"]
    E --> F{"货位在范围内?"}
    F -->|"否"| F1["阻断<br/>提示货位不在范围"]
    F1 --> E
    F -->|"是"| G["PDA 扫描商品"]
    G --> H{"商品匹配?"}
    H -->|"否"| H1["阻断<br/>提示商品不匹配"]
    H1 --> G
    H -->|"是"| I["录入实盘数"]
    I --> J["系统计算差异数/差异率"]
    J --> K{"全部明细已盘?"}
    K -->|"否"| E
    K -->|"是"| L["提交差异报告<br/>状态：待审核"]
    L --> M{"任一差异率 >5%?"}
    M -->|"是"| N["主管要求重盘<br/>状态：盘点中"]
    N --> E
    M -->|"否"| O{"主管审核差异"}
    O -->|"驳回"| O1["填写驳回原因<br/>状态：草稿<br/>不调整库存/不生成 FL"]
    O1 --> B
    O -->|"审核通过"| P["确认调整<br/>盘盈现存+ / 盘亏现存-"]
    P --> Q["生成库存流水 FL"]
    Q --> R["解除盘点冻结<br/>状态：已调整"]`,
        steps: [
          '仓管在 PC 创建 CK 草稿，选择盘点类型、盘点范围、盘点人和审核人。',
          '点击开始盘点后，系统锁定范围，相关货位进入冻结态，盘点范围内禁止出入库。',
          '盘点员用 PDA 扫描货位，货位不在盘点范围内时会被阻断，必须扫描范围内货位。',
          '货位正确后扫描商品并录入实盘数，系统计算差异数和差异率。',
          '全部明细盘完后提交差异报告，CK 进入待审核；待审核期间表单只读，等待主管处理。',
          '任一差异率大于 5% 时主管要求重盘；差异进入审核后，主管可以审核通过或驳回。',
          '审核驳回时必须填写驳回原因，状态回到草稿且不调整库存、不生成 FL，仓管可重新编辑后再提交。',
          '审核通过后才确认调整，系统按盘盈/盘亏更新现存、生成 FL，并解除盘点冻结。',
        ],
        fields: [
          '盘点类型 checkType：全盘、动盘等类型会影响锁定范围和盘点方式。',
          '盘点范围：可按仓库、库区、货位、商品组合定义，开始盘点后不能随意扩大或缩小。',
          '盘点人/审核人：建单时要选清楚，后续实盘和审核按人员分工执行。',
          '实盘数 actualQty：按现场数量录入，系统据此算差异。',
          '状态 status：草稿、盘点中、待审核、已驳回、已调整由按钮和系统结果触发；驳回后回到草稿可编辑。',
          'rejectedReason：主管审核驳回时必填，用于说明差异退回原因。',
        ],
      },
    ],
  },
  {
    id: 'transfer',
    title: '调拨管理',
    description: '仓库之间调出、在途、调入和差异待核销。',
    sections: [
      {
        id: 'transfer-order',
        title: '调拨单',
        source: 'prd-docs/调拨管理/调拨单/调拨单_业务流程推演.md',
        purpose: '调拨单用于把库存从一个仓库调到另一个仓库，适合仓管创建调拨、调出确认、调入清点和处理短收差异时使用。',
        diagram: `flowchart LR
    A["WMS手动创建或ERP下发TR<br/>状态：草稿"] --> B["保存草稿<br/>校验调出仓/调入仓/商品/数量"]
    B --> C["确认调出"]
    C --> D{"调出仓可用库存足够?"}
    D -->|否| D1["阻断<br/>提示可用库存不足"]
    D1 --> B
    D -->|是| E["调出过账<br/>调出仓现存-N<br/>调拨在途+N<br/>状态：已调出(在途)"]
    E --> F["调入库收货清点<br/>登记实收数量<br/>仅校验非负整数"]
    F --> G["确认调入"]
    G --> H{"实收数量是否大于调出数量?"}
    H -->|是| H1["阻断<br/>超收规则待补"]
    H1 --> F
    H -->|否| I{"实收=调出?"}
    I -->|是| J["调入仓现存+N<br/>调拨在途-N"]
    I -->|否| K["差异入库<br/>调入仓现存+R<br/>在途-R<br/>差异D转差异待核销"]
    K --> L["生成报损单BL<br/>状态：待审核核销<br/>原因：调拨损耗"]
    L --> L1{"BL审核结论"}
    L1 -->|"审核通过"| L2["核销差异待核销<br/>生成 BL 对应 FL"]
    L1 -->|"驳回"| L3["填写驳回原因<br/>差异待核销继续挂账<br/>不生成 FL"]
    J --> M["TR状态：已调入(完成)"]
    L2 --> M
    L3 --> M`,
        steps: [
          'TR 可以由 WMS 手动创建，也可以由 ERP 下发；草稿阶段先填调出仓、调入仓、商品和调拨数量并保存。',
          '点击确认调出时系统检查调出仓可用库存，不足会阻断，需要改数量或换货源。',
          '调出成功后，调出仓现存减少，调拨在途增加，TR 进入已调出在途。',
          '调入库到货后先登记实收数量；登记时只校验非负整数，最终上限在确认调入时校验。',
          '确认调入时，实收大于调出会阻断；实收等于调出则全部入库并完成调入。',
          '实收小于调出时，只按实收数量入库，短少差异转为差异待核销，并自动生成 BL 进入待审核核销。',
          'BL 审核通过后才核销差异待核销并生成对应 FL；BL 驳回时填写驳回原因，不生成 FL，差异待核销继续挂账追踪。',
        ],
        fields: [
          'outWarehouseCode/inWarehouseCode：调出仓和调入仓，不能混填。',
          'transferQty：调拨数量，确认调出时会校验调出仓可用库存。',
          'lineActualReceiveQty：实收数量，确认调入前每行都要登记，且不能大于调出数量。',
          'sourceErpOrderNo：ERP 下发调拨时的来源单号，手工单可为空。',
          'writeOffFlowNos：短收差异后续由 BL 审核通过并核销时回写追溯。',
          'blReviewStatus/rejectedReason：短收自动 BL 的审核状态和驳回原因，用于区分已核销与继续挂账差异。',
        ],
      },
    ],
  },
  {
    id: 'damage',
    title: '报损管理',
    description: '手动报损和调拨差异核销。',
    sections: [
      {
        id: 'damage-order',
        title: '报损单',
        source: 'prd-docs/报损管理/报损单/报损单_业务流程推演.md',
        purpose: '报损单用于处理现场手动报损或调拨短收差异，适合仓管提交报损、主管或财务审核核销时使用。',
        diagram: `flowchart LR
    A["来源判断"] --> B{"报损来源?"}
    B -->|"手动"| C["PC 新建 BL<br/>状态：草稿"]
    C --> D["录入货位、商品、报损数量<br/>选择报损原因"]
    D --> E["提交审核<br/>状态：待审核"]
    B -->|"调拨差异"| F["TR 到货差异<br/>实收小于调出"]
    F --> G["系统自动生成 BL<br/>原因：调拨损耗<br/>状态：待审核"]
    E --> H["冻结报损数量<br/>现存不变"]
    G --> H
    H --> I{"主管/财务审核"}
    I -->|"驳回"| J["填写驳回原因<br/>MANUAL: 解除本单冻结并可回草稿修改<br/>TRANSFER_DIFF: 差异待核销持续挂账<br/>现存不变/不生成 FL"]
    I -->|"审核通过"| K["审核通过并确认核销"]
    K --> L["MANUAL: 现存-N<br/>TRANSFER_DIFF: 差异待核销-N"]
    L --> M["生成来源 BL 的 FL<br/>MANUAL=STOCK_LOSS<br/>TRANSFER_DIFF=DAMAGE_LOSS"]
    M --> N["状态：已核销<br/>详情可追溯 FL"]`,
        steps: [
          '先看报损来源：手动报损由 PC 新建 BL，调拨差异由 TR 短收后系统自动生成 BL。',
          '手动报损草稿里录入货位、商品、报损数量和报损原因；来源为调拨差异时关键来源信息由 TR 带入。',
          '手动报损点击提交审核后冻结报损数量并进入待审核，现存暂不变；调拨差异 BL 也进入待审核核销。',
          '主管或财务在待审核状态选择审核通过或驳回；驳回时必须填写原因，手动报损释放本单冻结并可回草稿修改，调拨差异不回补现存且差异待核销继续挂账。',
          '审核通过并确认核销后，手动报损才扣现存，调拨差异才扣差异待核销，并生成来源 BL 的 FL 供详情追溯。',
        ],
        fields: [
          'sourceType：MANUAL 表示手动报损，TRANSFER_DIFF 表示调拨差异。',
          'sourceTransferNo：调拨差异必填 TR 单号，手动报损不需要。',
          'warehouseCode/locationCode：手动报损要填实际仓库和货位；调拨差异按 TR 带入调出/调入仓口径。',
          'damageQty：报损数量，提交审核时校验数量上限和可冻结数量。',
          'damageReason/reasonDesc：原因为 OTHER 时必须补充原因说明。',
          '状态 status：草稿、待审核、已驳回、已核销由提交审核、审核通过和驳回动作触发。',
          'rejectedReason：审核驳回时必填。',
        ],
      },
    ],
  },
  {
    id: 'base-data',
    title: '基础数据',
    description: '仓库、库区、货位三类当前原型已接入页面的主数据维护。',
    sections: [
      {
        id: 'warehouse-master',
        title: '仓库档案',
        source: 'prd-docs/基础数据管理/仓库档案/仓库档案主PRD.md、仓库档案字段清单.md',
        purpose: '仓库档案用于维护 WMS 可引用的仓库主数据，适合管理员新增仓库、编辑基础信息、启用或停用仓库时使用。',
        steps: [
          '在仓库列表页按仓库编码、名称、负责人、类型或状态查询目标仓库。',
          '新增仓库时填写仓库编码、名称、类型、负责人和地址，保存后默认启用。',
          '编辑已有仓库时可以改名称、类型、负责人、地址和备注，但仓库编码只读。',
          '需要停止新业务引用时点击停用并二次确认；需要恢复候选时点击启用并确认。',
          '停用不会删除历史单据、库区、货位或库存，历史数据仍可查询。',
        ],
        fields: [
          'code：仓库编码，字母+数字，全局唯一，保存时转大写，编辑态只读。',
          'name：仓库名称，必填，建议 1-50 字符。',
          'type：仓库类型，枚举为 MAIN、BRANCH、STORE。',
          'manager/address：负责人和仓库地址都必填。',
          'status：ENABLED 或 DISABLED，只能通过启用/停用按钮变更。',
        ],
      },
      {
        id: 'zone-master',
        title: '库区管理',
        source: 'prd-docs/基础数据管理/库区管理/库区主PRD.md、库区字段清单.md',
        purpose: '库区管理用于维护仓库下面的收货区、存储区、拣货区、退货区和发货区，适合管理员配置库内区域时使用。',
        steps: [
          '在库区列表页按库区编码、名称、所属仓库、类型或状态查询。',
          '新增库区时先选择启用仓库，再填写库区编码、库区名称和库区类型。',
          '保存时系统校验库区编码格式、唯一性、库区类型和所属仓库是否有效。',
          '编辑已有库区时库区编码只读，所属仓库名称由 warehouseCode 带出，不手工录入。',
          '通过启用/停用按钮控制库区是否进入新业务候选，停用后历史库存和流水仍可追溯。',
        ],
        fields: [
          'code：库区编码，字母+数字，全局唯一，保存时转大写。',
          'type：ZoneType，只能是 RECEIVING、STORAGE、PICKING、RETURN、SHIPPING。',
          'warehouseCode：所属仓库编码，必须选择启用仓库。',
          'warehouseName：由 warehouseCode 带出，不允许手工录入。',
          'status：ENABLED/DISABLED，只能通过动作按钮变更。',
        ],
      },
      {
        id: 'location-master',
        title: '货位管理',
        source: 'prd-docs/基础数据管理/货位管理/货位主PRD.md、货位字段清单.md',
        purpose: '货位管理用于维护具体存放位置和货位条码，适合管理员新增货位、绑定条码、启用或停用货位时使用。',
        steps: [
          '在货位列表页按货位编码、所属库区、所属仓库、状态或条码状态查询。',
          '新增货位时选择有效库区，系统带出所属仓库，再填写货位编码、货架编号、层、列和货位条码。',
          '保存时系统校验货位编码唯一、货架/层/列组合不重复、层列为正整数、条码格式和唯一性。',
          'PDA 上架扫货位时，货位必须存在、启用、已绑定条码并属于当前作业仓库；PDA 拣货扫货位时还必须匹配推荐货位。',
          '货位不用物理删除，停用后不再进入新 PUT/PICK 作业候选，历史单据和库存流水仍可查询。',
        ],
        fields: [
          'code：货位编码，字母+数字，不可重复。',
          'rackNo、levelNo、columnNo：货架、层、列都必填，层和列必须是大于 0 的正整数。',
          'zoneCode：所属库区，必须来源于有效库区档案。',
          'warehouseCode：随所属库区带出，不能手工填写。',
          'barcode：货位条码，数字为主，支持 EAN-13，不可重复。',
          'isAvailable：status=ENABLED、所属库区有效且已绑定条码时才可用。',
        ],
      },
    ],
  },
];

const scrollToModule = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export default function ManualPage() {
  const flowchartCount = manualModules.reduce(
    (sum, module) => sum + module.sections.filter(section => section.diagram).length,
    0,
  );
  const sectionCount = manualModules.reduce((sum, module) => sum + module.sections.length, 0);

  return (
    <div className="space-y-5 text-xs">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold">
            <BookOpen size={18} />
            <span>终端操作手册</span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-slate-900">Forge WMS 操作手册</h1>
          <p className="mt-1 text-xs text-slate-500">
            面向仓管、收货员、拣货员、复核员、包装员、发货员和基础数据管理员，按现有 PRD 提炼操作步骤。
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] sm:flex sm:items-center">
          <span className="rounded-md border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-600 shadow-sm">
            {sectionCount} 个小节
          </span>
          <span className="rounded-md border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-600 shadow-sm">
            {flowchartCount} 张 PRD 流程图
          </span>
        </div>
      </div>

      <div className="sticky top-0 z-10 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        <div className="mb-2 flex items-center gap-2 font-bold text-slate-800">
          <MapPinned size={15} className="text-primary" />
          <span>模块目录</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {manualModules.map(module => (
            <button
              key={module.id}
              type="button"
              onClick={() => scrollToModule(module.id)}
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-600 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            >
              {module.title}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {manualModules.map(module => (
          <section key={module.id} id={module.id} className="scroll-mt-24 space-y-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Boxes size={17} className="text-primary" />
                <h2 className="text-lg font-bold text-slate-900">{module.title}</h2>
              </div>
              <p className="mt-1 text-slate-500">{module.description}</p>
            </div>

            <div className="space-y-4">
              {module.sections.map(section => (
                <article key={section.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{section.title}</h3>
                      <p className="mt-1 text-[11px] text-slate-400">依据：{section.source}</p>
                    </div>
                    <span className={`w-fit rounded-md px-2 py-1 text-[10px] font-bold ${
                      section.diagram
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                    >
                      {section.diagram ? '已配 PRD 流程图' : 'PRD 未提供流程推演文件'}
                    </span>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-800">
                        <FileText size={15} className="text-primary" />
                        <span>这个页面是干嘛的</span>
                      </h4>
                      <p className="leading-6 text-slate-600">{section.purpose}</p>
                    </div>

                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-800">
                        <MapPinned size={15} className="text-primary" />
                        <span>业务流程图</span>
                      </h4>
                      {section.diagram ? (
                        <MermaidDiagram chart={section.diagram} chartId={section.id} />
                      ) : (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-500">
                          该基础数据 PRD 未提供独立的 “_业务流程推演.md” Mermaid flowchart，本节只按主 PRD 和字段清单说明维护步骤。
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-800">
                        <ListChecks size={15} className="text-primary" />
                        <span>流程每个节点怎么操作</span>
                      </h4>
                      <ol className="space-y-2">
                        {section.steps.map((step, index) => (
                          <li key={step} className="flex gap-3 rounded-md bg-slate-50 p-3 leading-6 text-slate-600">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                              {index + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-800">
                        <FileText size={15} className="text-primary" />
                        <span>关键字段怎么填</span>
                      </h4>
                      <ul className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                        {section.fields.map(field => (
                          <li key={field} className="rounded-md border border-slate-200 bg-white px-3 py-2 leading-6 text-slate-600">
                            {field}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
