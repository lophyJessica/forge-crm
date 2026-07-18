import { Plus, Search } from 'lucide-react';

const mockOpportunities = [
  { id: 'OP-20260718001', title: '智能工厂ERP升级采购', customer: '强盛科技', budget: '￥500,000', phase: 'NEGOTIATION', phaseText: '商务谈判', winRate: 75, date: '2026-07-18 10:00' },
  { id: 'OP-20260718002', title: 'CRM系统定制化二期', company: '蓝天制造', customer: '蓝天制造', budget: '￥180,000', phase: 'PROPOSAL', phaseText: '方案报价', winRate: 60, date: '2026-07-17 14:00' },
  { id: 'OP-20260718003', title: '云主机扩容采购案', customer: '宇宙集团', budget: '￥80,000', phase: 'CONTRACT', phaseText: '合同签订', winRate: 90, date: '2026-07-16 11:30' },
  { id: 'OP-20260718004', title: 'AI线索评估API对接服务', customer: '宏图物流', budget: '￥120,000', phase: 'WON', phaseText: '赢单', winRate: 100, date: '2026-07-15 16:00' },
  { id: 'OP-20260718005', title: '冷链WMS系统对接需求', customer: '万达商贸', budget: '￥350,000', phase: 'LOST', phaseText: '输单', winRate: 0, date: '2026-07-14 09:00' },
];

const getPhaseStyles = (phase: string) => {
  switch (phase) {
    case 'INITIAL_CONTACT': // 初步接触 灰色
      return 'text-slate-500 bg-slate-100 border-slate-200';
    case 'NEEDS_CONFIRM': // 需求确认 蓝色
      return 'text-blue-600 bg-blue-50 border-blue-100';
    case 'PROPOSAL': // 方案报价 橙色
      return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'NEGOTIATION': // 商务谈判 黄色 #eab308
      return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    case 'CONTRACT': // 合同签订 紫色 #8b5cf6
      return 'text-purple-600 bg-purple-50 border-purple-200';
    case 'WON': // 赢单 绿色
      return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 'LOST': // 输单 红色
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-slate-500 bg-slate-100 border-slate-200';
  }
};

export default function OpportunitiesList() {
  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black text-slate-800">商机管理</h1>
          <p className="text-xs text-slate-500">跟踪潜在交易和成单概率，联动 ERP 的商品清单生成最终销售订单草稿。</p>
        </div>
        <button 
          type="button"
          className="flex items-center gap-1.5 px-4 h-9 text-xs font-bold text-white bg-[#1677ff] hover:bg-blue-500 active:bg-blue-600 rounded-md transition-colors shadow-sm"
        >
          <Plus size={15} />
          <span>新建商机</span>
        </button>
      </div>

      {/* 搜索与操作栏 */}
      <div className="forge-action-bar">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <input 
              type="text" 
              placeholder="搜索商机名称、关联客户..." 
              className="w-full h-9 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          </div>
          <select className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-650 focus:outline-none focus:border-blue-500">
            <option value="">全部阶段</option>
            <option value="INITIAL_CONTACT">初步接触</option>
            <option value="NEEDS_CONFIRM">需求确认</option>
            <option value="PROPOSAL">方案报价</option>
            <option value="NEGOTIATION">商务谈判</option>
            <option value="CONTRACT">合同签订</option>
            <option value="WON">赢单</option>
            <option value="LOST">输单</option>
          </select>
        </div>
      </div>

      {/* 表格 */}
      <div className="forge-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="forge-table">
            <thead>
              <tr>
                <th>商机编号</th>
                <th>商机名称</th>
                <th>关联客户</th>
                <th>预算总额</th>
                <th>商机阶段</th>
                <th>赢单率</th>
                <th>最近跟进</th>
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {mockOpportunities.map((op) => (
                <tr key={op.id}>
                  <td className="font-mono font-bold text-[#1677ff] cursor-pointer hover:underline">{op.id}</td>
                  <td className="font-semibold text-slate-800">{op.title}</td>
                  <td>{op.customer}</td>
                  <td className="font-mono">{op.budget}</td>
                  <td>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getPhaseStyles(op.phase)}`}>
                      {op.phaseText}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            op.winRate >= 80 ? 'bg-emerald-500' :
                            op.winRate >= 50 ? 'bg-blue-500' :
                            op.winRate > 0 ? 'bg-amber-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${op.winRate}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] font-bold text-slate-500">{op.winRate}%</span>
                    </div>
                  </td>
                  <td className="text-slate-500 font-mono">{op.date}</td>
                  <td className="text-right space-x-2">
                    <button type="button" className="text-[#1677ff] hover:text-blue-500 text-xs font-semibold">跟进</button>
                    {op.phase === 'CONTRACT' && (
                      <button type="button" className="text-purple-600 hover:text-purple-500 text-xs font-semibold">下推订单</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 底部分页 */}
        <div className="flex justify-between items-center px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
          <span>共 {mockOpportunities.length} 条记录</span>
          <div className="flex items-center gap-2">
            <button type="button" className="px-2 py-1 rounded bg-white border border-slate-200 disabled:opacity-40" disabled>上一页</button>
            <span className="font-mono">1 / 1</span>
            <button type="button" className="px-2 py-1 rounded bg-white border border-slate-200 disabled:opacity-40" disabled>下一页</button>
          </div>
        </div>
      </div>
    </div>
  );
}
