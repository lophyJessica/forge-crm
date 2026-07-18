import { Plus, Search } from 'lucide-react';

const mockCustomers = [
  { id: 'CU-20260718001', name: '强盛科技股份有限公司', contact: '李经理', phone: '138****8888', origin: '线索转化', warningStatus: 'NORMAL', warningStatusText: '正常', updateTime: '2026-07-18' },
  { id: 'CU-20260718002', name: '宇宙集团有限公司', contact: '王总', phone: '139****1234', origin: '线索转化', warningStatus: 'WARNING', warningStatusText: '流失预警', updateTime: '2026-07-18' },
  { id: 'CU-20260718003', name: '蓝天制造厂', contact: '张经理', phone: '137****5678', origin: '手动录入', warningStatus: 'NORMAL', warningStatusText: '正常', updateTime: '2026-07-17' },
  { id: 'CU-20260718004', name: '宏图物流集团', contact: '赵董', phone: '136****9999', origin: '线索转化', warningStatus: 'CRITICAL', warningStatusText: '高风险', updateTime: '2026-07-16' },
];

const getWarningStyles = (status: string) => {
  switch (status) {
    case 'NORMAL':
      return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    case 'WARNING':
      return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'CRITICAL':
      return 'text-red-600 bg-red-50 border-red-100';
    default:
      return 'text-slate-500 bg-slate-100 border-slate-200';
  }
};

export default function CustomersList() {
  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black text-slate-800">客户管理</h1>
          <p className="text-xs text-slate-500">管理与 ERP 互联的正式客户快照与跟进信息。注意：新增及停用建档由 ERP 权威管控。</p>
        </div>
        <button 
          type="button"
          className="flex items-center gap-1.5 px-4 h-9 text-xs font-bold text-white bg-[#1677ff] hover:bg-blue-500 active:bg-blue-600 rounded-md transition-colors shadow-sm"
        >
          <Plus size={15} />
          <span>同步 ERP 客户</span>
        </button>
      </div>

      {/* 搜索与操作栏 */}
      <div className="forge-action-bar">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <input 
              type="text" 
              placeholder="搜索客户名称、联系人、电话..." 
              className="w-full h-9 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          </div>
          <select className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-600 focus:outline-none focus:border-blue-500">
            <option value="">全部预警状态</option>
            <option value="NORMAL">正常</option>
            <option value="WARNING">流失预警</option>
            <option value="CRITICAL">高风险</option>
          </select>
        </div>
      </div>

      {/* 表格 */}
      <div className="forge-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="forge-table">
            <thead>
              <tr>
                <th>客户编号 (ERP)</th>
                <th>客户名称</th>
                <th>首要联系人</th>
                <th>联系电话</th>
                <th>客户来源</th>
                <th>AI 流失评估</th>
                <th>最近更新</th>
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {mockCustomers.map((cu) => (
                <tr key={cu.id}>
                  <td className="font-mono font-bold text-[#1677ff] cursor-pointer hover:underline">{cu.id}</td>
                  <td className="font-semibold text-slate-800">{cu.name}</td>
                  <td>{cu.contact}</td>
                  <td className="font-mono">{cu.phone}</td>
                  <td>{cu.origin}</td>
                  <td>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getWarningStyles(cu.warningStatus)}`}>
                      {cu.warningStatusText}
                    </span>
                  </td>
                  <td className="text-slate-500 font-mono">{cu.updateTime}</td>
                  <td className="text-right space-x-2">
                    <button type="button" className="text-[#1677ff] hover:text-blue-500 text-xs font-semibold">详情</button>
                    <button type="button" className="text-amber-600 hover:text-amber-500 text-xs font-semibold">跟进记录</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 底部分页 */}
        <div className="flex justify-between items-center px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
          <span>共 {mockCustomers.length} 条记录</span>
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
