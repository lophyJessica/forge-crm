import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Search, Plus, CheckCircle, XCircle } from 'lucide-react';

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'PLANNED':
      return 'bg-blue-50 text-blue-600 border-blue-150';
    case 'CHECKED_IN':
      return 'bg-orange-50 text-orange-600 border-orange-200';
    case 'COMPLETED':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'CANCELLED':
      return 'bg-red-50 text-red-650 border-red-150';
    default:
      return 'bg-slate-50 text-slate-500 border-slate-200';
  }
};

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    PLANNED: '已计划',
    CHECKED_IN: '已签到',
    COMPLETED: '已完成',
    CANCELLED: '已取消'
  };
  return map[status] || status;
};

const getAssociationBadge = (type: string) => {
  switch (type) {
    case 'LEAD':
      return 'bg-blue-50 text-blue-600 border-blue-100';
    case 'OPPORTUNITY':
      return 'bg-amber-50 text-amber-600 border-amber-200';
    case 'CUSTOMER':
      return 'bg-purple-50 text-purple-600 border-purple-150';
    default:
      return 'bg-slate-50 text-slate-500 border-slate-250';
  }
};

const getAssociationLabel = (type: string) => {
  const map: Record<string, string> = {
    LEAD: '线索',
    OPPORTUNITY: '商机',
    CUSTOMER: '客户'
  };
  return map[type] || type;
};

export default function VisitList() {
  const navigate = useNavigate();

  // 1. 过滤与分页状态
  const [activeTab, setActiveTab] = useState<'ALL' | 'PLANNED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [keyword, setKeyword] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 2. 实时订阅拜访计划数据
  const visits = useLiveQuery(() => db.visits.toArray()) || [];

  // 3. 联动重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, keyword]);

  // 4. 内存过滤与排序
  const filteredVisits = visits.filter(v => {
    if (activeTab !== 'ALL' && v.status !== activeTab) return false;

    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      const matchId = v.id.toLowerCase().includes(kw);
      const matchTitle = v.title.toLowerCase().includes(kw);
      const matchName = v.associationName.toLowerCase().includes(kw);
      if (!matchId && !matchTitle && !matchName) return false;
    }

    return true;
  }).sort((a, b) => b.planTime.localeCompare(a.planTime)); // 按计划拜访时间倒序

  const totalCount = filteredVisits.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const pagedVisits = filteredVisits.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 5. 核心交互函数
  // 5.1 快速签到
  const handleCheckIn = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    
    // 仿真系统获取定位
    const mockAddresses = [
      '江苏省南京市江宁区强盛科技园B座1楼大堂',
      '上海市浦东新区张江高科智芯大厦12层前台',
      '北京市西城区金融街鼎泰大厦大堂东门',
      '湖北省武汉市东西湖区瑞丰冷链仓A1大门'
    ];
    const mockAddr = mockAddresses[Math.floor(Math.random() * mockAddresses.length)];

    await db.visits.update(id, {
      status: 'CHECKED_IN',
      checkedInAt: nowStr,
      checkedInAddress: mockAddr,
      updatedAt: nowStr.replace(' ', ' ') + ':00'
    });
    showToast(`签到成功！系统已打卡定位在 [${mockAddr}]`);
  };

  // 5.2 取消计划
  const handleCancel = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    await db.visits.update(id, {
      status: 'CANCELLED',
      updatedAt: nowStr
    });
    showToast('拜访计划已取消。');
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
          <h1 className="text-2xl font-black text-slate-800">拜访计划</h1>
          <p className="text-xs text-slate-500">统一销售外勤上门及远程沟通计划，支持位置打卡签到并联动同步至客户 360° 跟进时间轴。</p>
        </div>
        <button 
          type="button" 
          onClick={() => navigate('/visits/new')}
          className="flex items-center gap-1 px-4 h-9 text-xs font-bold text-white bg-[#1677ff] hover:bg-blue-500 rounded-md transition-colors shadow-sm"
        >
          <Plus size={14} />
          <span>新建计划</span>
        </button>
      </div>

      {/* 状态 Tab */}
      <div className="forge-tabs">
        {[
          { key: 'ALL', label: '全部计划', count: visits.length },
          { key: 'PLANNED', label: '已计划', count: visits.filter(v => v.status === 'PLANNED').length },
          { key: 'CHECKED_IN', label: '已签到', count: visits.filter(v => v.status === 'CHECKED_IN').length },
          { key: 'COMPLETED', label: '已完成', count: visits.filter(v => v.status === 'COMPLETED').length },
          { key: 'CANCELLED', label: '已取消', count: visits.filter(v => v.status === 'CANCELLED').length }
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={`forge-tab-item text-xs font-bold px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.key 
                ? 'border-[#1677ff] text-[#1677ff]' 
                : 'border-transparent text-slate-400 hover:text-slate-650'
            }`}
          >
            <span>{tab.label}</span>
            <span className="ml-1.5 px-1.5 py-0.2 text-[10px] rounded-full bg-slate-100 text-slate-500">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* 筛选过滤 */}
      <div className="forge-action-bar flex gap-3 items-center">
        <div className="relative flex-1">
          <input 
            type="text" 
            placeholder="搜索拜访标题、单号、关联客户或商机名..." 
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full h-9 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:border-blue-500"
          />
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
        </div>
        <button 
          type="button"
          onClick={() => setKeyword('')}
          className="h-9 px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors"
        >
          重置
        </button>
      </div>

      {/* 拜访表格 */}
      <div className="forge-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="forge-table text-xs">
            <thead>
              <tr>
                <th className="w-[150px]">拜访编号</th>
                <th className="w-[200px]">拜访标题</th>
                <th className="w-[180px]">关联对象</th>
                <th className="w-[100px]">拜访方式</th>
                <th className="w-[150px]">计划拜访时间</th>
                <th className="w-[100px]">状态</th>
                <th className="w-[150px]">签到时间</th>
                <th className="text-right w-[150px]">操作</th>
              </tr>
            </thead>
            <tbody>
              {totalCount === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    没有找到符合条件的拜访计划
                  </td>
                </tr>
              ) : (
                pagedVisits.map(v => (
                  <tr key={v.id}>
                    <td 
                      className="font-mono font-bold text-[#1677ff] cursor-pointer hover:underline"
                      onClick={() => navigate(`/visits/${v.id}`)}
                    >
                      {v.id}
                    </td>
                    <td className="font-bold text-slate-850">{v.title}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${getAssociationBadge(v.associationType)}`}>
                          {getAssociationLabel(v.associationType)}
                        </span>
                        <span className="truncate max-w-[120px] font-semibold text-slate-650">{v.associationName}</span>
                      </div>
                    </td>
                    <td>
                      <span className="font-semibold text-slate-600">{v.visitMethod}</span>
                    </td>
                    <td className="font-mono text-slate-650">{v.planTime}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadgeColor(v.status)}`}>
                        {getStatusLabel(v.status)}
                      </span>
                    </td>
                    <td className="font-mono text-slate-500">{v.checkedInAt || '—'}</td>
                    <td className="text-right space-x-3">
                      <button 
                        type="button" 
                        onClick={() => navigate(`/visits/${v.id}`)}
                        className="text-slate-500 hover:text-slate-700 font-bold"
                      >
                        查看
                      </button>

                      {v.status === 'PLANNED' && (
                        <>
                          <button 
                            type="button" 
                            onClick={(e) => handleCheckIn(v.id, e)}
                            className="text-[#1677ff] hover:text-blue-500 font-bold"
                          >
                            位置签到
                          </button>
                          <button 
                            type="button" 
                            onClick={(e) => handleCancel(v.id, e)}
                            className="text-red-650 hover:text-red-500 font-bold"
                          >
                            取消
                          </button>
                        </>
                      )}

                      {v.status === 'CHECKED_IN' && (
                        <>
                          <button 
                            type="button" 
                            onClick={() => navigate(`/visits/${v.id}`, { state: { triggerComplete: true } })}
                            className="text-green-700 hover:text-green-600 font-bold"
                          >
                            填写记录
                          </button>
                          <button 
                            type="button" 
                            onClick={(e) => handleCancel(v.id, e)}
                            className="text-red-650 hover:text-red-500 font-bold"
                          >
                            取消
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
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
