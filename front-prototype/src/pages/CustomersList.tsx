import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { erpDb } from '../api/erpSync';
import { Search, Download, CheckCircle, XCircle } from 'lucide-react';

const INDUSTRY_MAP: Record<string, string> = {
  MANUFACTURING: '制造业',
  RETAIL: '零售与电商',
  HEALTHCARE: '医疗健康',
  FINANCE: '金融与信托',
  IT: '信息技术',
  OTHER: '其他行业'
};

const getLevelBadgeColor = (level: string) => {
  switch (level) {
    case 'VIP':
      return 'bg-purple-50 text-purple-650 border-purple-150';
    case 'A':
      return 'bg-blue-50 text-blue-600 border-blue-150';
    case 'B':
      return 'bg-amber-50 text-amber-600 border-amber-200';
    case 'C':
      return 'bg-slate-150 text-slate-600 border-slate-200';
    default:
      return 'bg-slate-50 text-slate-500 border-slate-200';
  }
};

const getRiskBadgeColor = (risk: string) => {
  switch (risk) {
    case 'HIGH':
      return 'bg-red-50 text-red-650 border-red-200';
    case 'MEDIUM':
      return 'bg-yellow-50 text-yellow-600 border-yellow-250';
    case 'LOW':
      return 'bg-green-50 text-green-700 border-green-200';
    default:
      return 'bg-slate-55 text-slate-500 border-slate-200';
  }
};

const getRiskLabel = (risk: string) => {
  switch (risk) {
    case 'HIGH': return '高风险';
    case 'MEDIUM': return '中等风险';
    case 'LOW': return '低风险';
    default: return risk;
  }
};

const getStageLabel = (stage: string) => {
  const map: Record<string, string> = {
    INITIAL_CONTACT: '初步接触',
    NEEDS_CONFIRM: '需求确认',
    PROPOSAL: '方案报价',
    NEGOTIATION: '商务谈判',
    CONTRACT: '合同签订',
    WON: '赢单',
    LOST: '输单'
  };
  return map[stage] || stage;
};

export default function CustomersList() {
  const navigate = useNavigate();

  // 1. 查询筛选状态
  const [keyword, setKeyword] = useState('');
  const [industry, setIndustry] = useState('');
  const [level, setLevel] = useState('');
  const [riskLevel, setRiskLevel] = useState('');

  // 分页状态
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  // 筛选项改变时自动重设当前页为 1
  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, industry, level, riskLevel]);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 2. 实时拉取多表数据用于聚合计算
  const customers = useLiveQuery(() => erpDb.table('customers').toArray()) || [];
  const opportunities = useLiveQuery(() => db.opportunities.toArray()) || [];
  const leads = useLiveQuery(() => db.leads.toArray()) || [];
  const leadFollowUps = useLiveQuery(() => db.follow_up_records.toArray()) || [];
  const oppFollowUps = useLiveQuery(() => db.opportunity_follow_ups.toArray()) || [];

  // 3. 多表聚合计算客户扩展字段
  const enrichedCustomers = customers.map(cust => {
    // 3.1 关联商机明细
    const associatedOpps = opportunities.filter(o => o.customerId === String(cust.id || cust.code));
    
    // 最近更新的商机状态
    let latestOppStage = '—';
    if (associatedOpps.length > 0) {
      const sortedOpps = [...associatedOpps].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      latestOppStage = getStageLabel(sortedOpps[0].status);
    }

    // 3.2 最近跟进时间计算
    // 找出该客户公司名下的所有线索
    const matchingLeads = leads.filter(l => l.company === cust.name);
    
    // 获取线索跟进时间
    const currentLeadFollowTimes = leadFollowUps
      .filter(f => matchingLeads.some(l => l.id === f.leadId))
      .map(f => f.time);

    // 获取商机跟进时间
    const currentOppFollowTimes = oppFollowUps
      .filter(f => associatedOpps.some(o => o.id === f.oppId))
      .map(f => f.time);

    // 合并全部时间点
    const allFollowTimes = [...currentLeadFollowTimes, ...currentOppFollowTimes].sort((a, b) => b.localeCompare(a));
    const latestFollowTime = allFollowTimes.length > 0 ? allFollowTimes[0] : cust.createdAt;

    return {
      ...cust,
      oppCount: associatedOpps.length,
      latestOppStage,
      latestFollowTime
    };
  });

  // 4. 内存过滤与排序
  const filteredCustomers = enrichedCustomers.filter(cust => {
    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      const matchName = cust.name.toLowerCase().includes(kw);
      const matchContact = cust.contact.toLowerCase().includes(kw);
      const matchPhone = cust.phone.includes(kw);
      const matchId = String(cust.id || cust.code || '').toLowerCase().includes(kw);
      if (!matchName && !matchContact && !matchPhone && !matchId) return false;
    }

    if (industry && cust.industry !== industry) return false;
    if (level && cust.level !== level) return false;
    if (riskLevel && cust.riskLevel !== riskLevel) return false;

    return true;
  }).sort((a, b) => b.latestFollowTime.localeCompare(a.latestFollowTime)); // 默认跟进时间倒序

  // 分页计算
  const totalCount = filteredCustomers.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const pagedCustomers = filteredCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExport = () => {
    showToast('客户快照列表导出成功，文件正在下载...', 'success');
  };

  return (
    <div className="space-y-4">
      {/* 顶部 Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg bg-white border border-slate-200 animate-slide-in text-xs font-bold text-slate-800">
          {toastMessage.type === 'success' ? <CheckCircle size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 头部标题区 */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black text-slate-800">客户管理</h1>
          <p className="text-xs text-slate-500">同步展示 ERP 客户正式建档快照，汇聚线索、商机、发货订单与流失风险监控。</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 无新增按钮 (SSOT 在 ERP) */}
          <button 
            type="button" 
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 h-9 text-xs font-bold border border-slate-200 hover:bg-slate-50 text-slate-650 rounded-md transition-colors shadow-sm bg-white"
          >
            <Download size={14} />
            <span>导出客户</span>
          </button>
        </div>
      </div>

      {/* 筛选过滤区 */}
      <div className="forge-action-bar grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="relative md:col-span-2">
          <input 
            type="text" 
            placeholder="搜索客户名称、联系人、手机号、编码..." 
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full h-9 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:border-blue-500"
          />
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
        </div>

        <div>
          <select 
            value={industry} 
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-650 focus:outline-none focus:border-blue-500"
          >
            <option value="">所属行业(全部)</option>
            {Object.entries(INDUSTRY_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div>
          <select 
            value={level} 
            onChange={(e) => setLevel(e.target.value)}
            className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-650 focus:outline-none focus:border-blue-500"
          >
            <option value="">客户等级(全部)</option>
            <option value="VIP">VIP 级</option>
            <option value="A">A 级</option>
            <option value="B">B 级</option>
            <option value="C">C 级</option>
          </select>
        </div>

        <div className="flex gap-2 items-center">
          <select 
            value={riskLevel} 
            onChange={(e) => setRiskLevel(e.target.value)}
            className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-650 focus:outline-none focus:border-blue-500"
          >
            <option value="">流失风险(全部)</option>
            <option value="HIGH">高风险</option>
            <option value="MEDIUM">中等风险</option>
            <option value="LOW">低风险</option>
          </select>
          <button 
            type="button"
            onClick={() => {
              setKeyword('');
              setIndustry('');
              setLevel('');
              setRiskLevel('');
            }}
            className="h-9 px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors shrink-0"
          >
            重置
          </button>
        </div>
      </div>

      {/* 客户表格 */}
      <div className="forge-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="forge-table text-xs">
            <thead>
              <tr>
                <th className="w-[160px]">客户编号 (ERP)</th>
                <th className="w-[200px]">公司名称</th>
                <th className="w-[100px]">首要联系人</th>
                <th className="w-[120px]">所属行业</th>
                <th className="w-[100px]">客户等级</th>
                <th className="w-[100px]">关联商机数</th>
                <th className="w-[120px]">最近商机阶段</th>
                <th className="w-[100px]">AI流失风险</th>
                <th className="w-[160px]">最近跟进时间</th>
                <th className="text-right w-[80px]">操作</th>
              </tr>
            </thead>
            <tbody>
              {totalCount === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400">
                    未检索到符合条件的客户档案
                  </td>
                </tr>
              ) : (
                pagedCustomers.map(cust => {
                  const custId = cust.id ? String(cust.id) : (cust.code || '');
                  return (
                    <tr key={custId}>
                      <td className="font-mono font-bold text-slate-500">{custId}</td>
                      {/* 公司名称链接进入详情 */}
                      <td 
                        className="font-bold text-[#1677ff] cursor-pointer hover:underline"
                        onClick={() => navigate(`/customers/${custId}`)}
                      >
                        {cust.name}
                      </td>
                      <td className="font-medium text-slate-700">{cust.contact}</td>
                      <td className="font-semibold text-slate-650">{INDUSTRY_MAP[cust.industry] || cust.industry}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getLevelBadgeColor(cust.level)}`}>
                          {cust.level} 等级
                        </span>
                      </td>
                      <td className="font-mono font-bold text-slate-700">{cust.oppCount} 个</td>
                      <td className="font-semibold text-slate-650">{cust.latestOppStage}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRiskBadgeColor(cust.riskLevel)}`}>
                          {getRiskLabel(cust.riskLevel)}
                        </span>
                      </td>
                      <td className="font-mono text-slate-500 text-[11px]">{cust.latestFollowTime}</td>
                      <td className="text-right">
                        <button 
                          type="button" 
                          onClick={() => navigate(`/customers/${custId}`)}
                          className="text-[#1677ff] hover:text-blue-500 font-bold"
                        >
                          查看
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex justify-between items-center px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>共 {totalCount} 条记录</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setCurrentPage(1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="h-7 px-2 text-xs bg-white border border-slate-200 rounded text-slate-650 focus:outline-none"
            >
              <option value={20}>20 条/页</option>
              <option value={50}>50 条/页</option>
              <option value={100}>100 条/页</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={() => {
                if (currentPage > 1) {
                  setCurrentPage(prev => prev - 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="px-2 py-1 rounded bg-white border border-slate-200 disabled:opacity-40" 
              disabled={currentPage === 1}
            >
              上一页
            </button>
            <span className="font-mono">{currentPage} / {totalPages}</span>
            <button 
              type="button" 
              onClick={() => {
                if (currentPage < totalPages) {
                  setCurrentPage(prev => prev + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="px-2 py-1 rounded bg-white border border-slate-200 disabled:opacity-40" 
              disabled={currentPage === totalPages}
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
