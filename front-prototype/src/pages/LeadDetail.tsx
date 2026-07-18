import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type FollowUpRecord } from '../db';
import { addCustomerToErp } from '../api/erpSync';
import { 
  ChevronLeft, 
  User, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

const CURRENT_USER = '张三';

const getStatusStyles = (status: string) => {
  switch (status) {
    case 'DRAFT':
      return 'text-slate-500 bg-slate-100 border-slate-200';
    case 'PENDING_ASSIGN':
      return 'text-blue-600 bg-blue-50 border-blue-100';
    case 'ASSIGNED':
      return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'FOLLOWING':
      return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    case 'CONVERTED':
      return 'text-green-700 bg-green-50 border-green-200';
    case 'ABANDONED':
      return 'text-red-600 bg-red-50 border-red-100';
    default:
      return 'text-slate-500 bg-slate-100 border-slate-200';
  }
};

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    DRAFT: '草稿',
    PENDING_ASSIGN: '待分配',
    ASSIGNED: '已分配',
    FOLLOWING: '跟进中',
    CONVERTED: '已转客户',
    ABANDONED: '已作废'
  };
  return map[status] || status;
};

// 跟进记录卡片展开折叠子组件
function FollowUpItem({ record }: { record: FollowUpRecord }) {
  const [isExpanded, setIsExpanded] = useState(false);
  // 简易行数估算，折叠超出 3 行的文本
  const isLongText = record.content.length > 100;

  return (
    <div className="bg-slate-50 border border-slate-150 rounded-lg p-4 space-y-2">
      <div className="flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800">{record.operator}</span>
          <span className="px-2 py-0.2 rounded bg-slate-200 text-slate-600 text-[10px]">
            {record.type}
          </span>
        </div>
        <span className="text-slate-400 font-mono text-[10px]">{record.time}</span>
      </div>
      <p className={`text-xs text-slate-600 leading-relaxed break-all ${!isExpanded && isLongText ? 'line-clamp-3' : ''}`}>
        {record.content}
      </p>
      {isLongText && (
        <button 
          type="button" 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-500 hover:text-blue-600 text-[10px] font-bold block"
        >
          {isExpanded ? '收起跟进记录' : '展开全部跟进'}
        </button>
      )}
      {record.nextPlan && (
        <div className="text-[10px] bg-blue-50 border border-blue-100 p-2 rounded text-blue-700 font-semibold">
          下次跟进计划：{record.nextPlan}
        </div>
      )}
    </div>
  );
}

export default function LeadDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  // 1. 获取本地数据库状态
  const lead = useLiveQuery(() => db.leads.get(id || '')) || null;
  const followUps = useLiveQuery(() => 
    db.follow_up_records.where('leadId').equals(id || '').toArray()
  ) || [];

  // UI 折叠与 Modal 状态
  const [isScoreDetailOpen, setIsScoreDetailOpen] = useState(false);
  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
  const [isAbandonModalOpen, setIsAbandonModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // 表单状态
  const [followType, setFollowType] = useState('电话');
  const [followContent, setFollowContent] = useState('');
  const [followNextPlan, setFollowNextPlan] = useState('');
  const [abandonReason, setAbandonReason] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 监听从路由跳转带来的外部触发
  useEffect(() => {
    if (location.state) {
      const state = location.state as any;
      if (state.openFollowModal) {
        setIsFollowModalOpen(true);
      }
      if (state.triggerConvert) {
        setIsConvertModalOpen(true);
      }
      // 消费掉 state 防止刷新重复触发
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate, location.pathname]);

  if (!lead) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        线索加载中或该线索不存在...
      </div>
    );
  }

  // 2. 核心操作交互
  // 认领线索
  const handleClaim = async () => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    await db.leads.update(lead.id, {
      status: 'ASSIGNED',
      owner: CURRENT_USER,
      assignedAt: nowStr
    });
    // 写入认领日志
    await db.follow_up_records.add({
      leadId: lead.id,
      time: nowStr,
      operator: CURRENT_USER,
      type: '电话',
      content: '销售在公海中认领了该线索。'
    });
    showToast('线索认领成功，已加入您的跟进名单');
  };

  // 添加跟进记录
  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followContent.trim()) return;

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    // 提交后，若原状态是 ASSIGNED(已分配)，跟进后流转为 FOLLOWING(跟进中)
    const nextStatus = lead.status === 'ASSIGNED' ? 'FOLLOWING' : lead.status;

    await db.transaction('rw', db.leads, db.follow_up_records, async () => {
      await db.follow_up_records.add({
        leadId: lead.id,
        time: nowStr,
        operator: CURRENT_USER,
        type: followType,
        content: followContent.trim(),
        nextPlan: followNextPlan.trim() || undefined
      });
      await db.leads.update(lead.id, {
        status: nextStatus,
        followedAt: nowStr
      });
    });

    setIsFollowModalOpen(false);
    setFollowContent('');
    setFollowNextPlan('');
    showToast('跟进记录已成功添加');
  };

  // 放弃线索
  const handleAbandon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!abandonReason.trim()) return;

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    await db.transaction('rw', db.leads, db.follow_up_records, async () => {
      await db.leads.update(lead.id, {
        status: 'ABANDONED',
        abandonedReason: abandonReason.trim(),
        followedAt: nowStr // 用作判定公海7天保护期
      });
      await db.follow_up_records.add({
        leadId: lead.id,
        time: nowStr,
        operator: CURRENT_USER,
        type: '电话',
        content: `销售主动放弃了线索，放弃原因：${abandonReason.trim()}`
      });
    });

    setIsAbandonModalOpen(false);
    setAbandonReason('');
    showToast('线索已退回公海');
  };

  // 转为客户
  const handleConvertToCustomer = async () => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

    try {
      await db.transaction('rw', db.leads, db.follow_up_records, async () => {
        await db.leads.update(lead.id, {
          status: 'CONVERTED',
          followedAt: nowStr
        });

        try {
          await addCustomerToErp({
            code: `CUST-${Date.now()}`,
            name: lead.company,
            contact: lead.contact || '',
            phone: lead.phone || '',
            priceLevel: '一级',
            creditLimit: 0,
            paymentPeriod: 30,
            status: 'active',
          });
        } catch(e: any) {
          showToast('同步ERP失败:' + e.message);
          setIsConvertModalOpen(false);
          return;
        }

        await db.follow_up_records.add({
          leadId: lead.id,
          time: nowStr,
          operator: CURRENT_USER,
          type: '拜访',
          content: '线索成功转为客户快照，同步下发 ERP 数据库正式建档。'
        });
      });

      setIsConvertModalOpen(false);
      showToast('已同步至ERP');
    } catch (err: any) {
      console.error(err);
      showToast(`操作失败:${err?.message || err}`, 'error');
    }
  };

  // 删除草稿
  const handleDeleteDraft = async () => {
    await db.transaction('rw', db.leads, db.follow_up_records, async () => {
      await db.leads.delete(lead.id);
      await db.follow_up_records.where('leadId').equals(lead.id).delete();
    });
    setIsDeleteModalOpen(false);
    showToast('草稿已成功删除');
    setTimeout(() => navigate('/leads'), 1500);
  };

  // 提交草稿
  const handleSubmitDraft = async () => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    // 校验手机和邮箱至少选填一个 (DRAFT态可能之前没填)
    if (!lead.phone && !lead.email) {
      showToast('无法提交：手机号和邮箱必须至少填写一个，请先编辑补充信息', 'error');
      return;
    }

    // 重新评分
    const score = Math.floor(Math.random() * 30) + 60; // 虚拟生成评分
    const nextStatus = score >= 80 ? 'ASSIGNED' : 'PENDING_ASSIGN';
    const owner = score >= 80 ? CURRENT_USER : undefined;
    const assignedAt = score >= 80 ? nowStr : undefined;

    await db.leads.update(lead.id, {
      status: nextStatus,
      score,
      owner,
      assignedAt,
      createdAt: nowStr
    });

    if (nextStatus === 'ASSIGNED') {
      await db.follow_up_records.add({
        leadId: lead.id,
        time: nowStr,
        operator: 'AI 自动引擎',
        type: '邮件',
        content: `AI 评分完成：${score}分（≥80分触发自动派单）。已自动分配给最优销售 ${CURRENT_USER}。`
      });
    }

    showToast(`线索提交成功，AI 评分: ${score}分`);
  };

  // 判断是否为公海认领期 (ABANDONED且放弃超7天)
  const isHighseas = lead.status === 'PENDING_ASSIGN' || (() => {
    if (lead.status !== 'ABANDONED' || !lead.followedAt) return false;
    const days = (new Date().getTime() - new Date(lead.followedAt).getTime()) / (1000 * 60 * 60 * 24);
    return days > 7;
  })();

  return (
    <div className="space-y-4 pb-24">
      {/* 顶部 Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg bg-white border border-slate-200 animate-slide-in text-xs font-bold text-slate-800">
          {toastMessage.type === 'success' ? <CheckCircle size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 头部导航与面包屑 */}
      <div className="flex items-center gap-3">
        <button 
          type="button" 
          onClick={() => navigate('/leads')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex flex-col">
          <h1 className="text-lg font-black text-slate-800">{lead.company}</h1>
          <p className="text-[10px] text-slate-400">线索编号: {lead.id} · 创建于 {lead.createdAt}</p>
        </div>
      </div>

      {/* 1. 状态 Banner */}
      <div className="forge-card flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-black border ${getStatusStyles(lead.status)}`}>
            {getStatusLabel(lead.status)}
          </span>
          {lead.owner ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <User size={14} className="text-[#1677ff]" />
              <span>负责人：<strong>{lead.owner}</strong></span>
              {lead.assignedAt && <span className="text-[10px] text-slate-400">({lead.assignedAt} 分配)</span>}
            </div>
          ) : (
            <span className="text-xs text-slate-400 font-semibold">暂无负责人</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* 2. AI 评分折叠卡片 */}
          <div className="forge-card space-y-3">
            <button
              type="button"
              onClick={() => setIsScoreDetailOpen(!isScoreDetailOpen)}
              className="flex w-full items-center justify-between text-xs font-bold text-slate-850"
            >
              <div className="flex items-center gap-2">
                <span>AI 评分权重拆解</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  lead.score >= 80 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                  lead.score >= 50 ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                  'bg-red-50 text-red-600 border border-red-200'
                }`}>
                  {lead.score}分
                </span>
              </div>
              {isScoreDetailOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {isScoreDetailOpen && (
              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 md:grid-cols-5 gap-3 text-center animate-fade-in">
                {[
                  { label: '渠道来源 (15%)', val: lead.source === 'ONLINE' || lead.source === 'REFERRAL' ? '15/15' : lead.source === 'ACTIVITY' || lead.source === 'EXHIBITION' ? '10/15' : '5/15' },
                  { label: '所属行业 (20%)', val: lead.industry === 'IT' || lead.industry === 'FINANCE' ? '20/20' : lead.industry === 'MANUFACTURING' ? '15/20' : lead.industry === 'RETAIL' ? '10/20' : '5/20' },
                  { label: '职位职级 (20%)', val: (lead.position || '').includes('总') || (lead.position || '').includes('CEO') ? '20/20' : '12/20' },
                  { label: '地区评分 (20%)', val: (lead.region || '').includes('北京') || (lead.region || '').includes('上海') ? '20/20' : '12/20' },
                  { label: '响应与活跃 (25%)', val: lead.score > 0 ? `${lead.score - 55}分` : '—' }
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-100 p-2 rounded">
                    <span className="text-[10px] text-slate-400 block font-semibold">{item.label}</span>
                    <strong className="text-sm font-bold text-slate-800 block mt-1 font-mono">{item.val}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. 基本信息卡片 */}
          <div className="forge-card space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-850">基本信息</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              {[
                { label: '线索来源', val: lead.source === 'ONLINE' ? '官网' : lead.source === 'ACTIVITY' ? '线下活动' : lead.source === 'EXHIBITION' ? '展会' : lead.source === 'REFERRAL' ? '转介绍' : lead.source === 'IMPORT' ? '批量导入' : '其他' },
                { label: '公司名称', val: lead.company },
                { label: '主要联系人', val: lead.contact || '—' },
                { label: '联系电话', val: lead.phone || '—', mono: true },
                { label: '邮箱地址', val: lead.email || '—', mono: true },
                { label: '联系人职位', val: lead.position || '—' },
                { label: '所属行业', val: lead.industry === 'IT' ? '信息技术' : lead.industry === 'MANUFACTURING' ? '制造业' : lead.industry === 'RETAIL' ? '零售' : lead.industry === 'FINANCE' ? '金融' : lead.industry === 'HEALTHCARE' ? '医疗' : '其他' },
                { label: '所在地区', val: lead.region || '—' }
              ].map((field, idx) => (
                <div key={idx} className="space-y-1">
                  <span className="text-[10px] text-slate-400 block font-semibold">{field.label}</span>
                  <span className={`text-slate-700 font-semibold block ${field.mono ? 'font-mono' : ''}`}>{field.val}</span>
                </div>
              ))}
              <div className="col-span-2 md:col-span-4 space-y-1">
                <span className="text-[10px] text-slate-400 block font-semibold">线索备注</span>
                <p className="text-slate-650 bg-slate-50 border border-slate-100 p-2.5 rounded text-xs leading-relaxed">{lead.remark || '暂无备注信息。'}</p>
              </div>
              {lead.status === 'ABANDONED' && lead.abandonedReason && (
                <div className="col-span-2 md:col-span-4 space-y-1">
                  <span className="text-[10px] text-red-400 block font-bold">放弃/作废原因</span>
                  <p className="text-red-700 bg-red-50 border border-red-100 p-2.5 rounded text-xs leading-relaxed font-bold">{lead.abandonedReason}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. 右侧跟进记录时间线 */}
        <div className="forge-card flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-850">跟进记录</h3>
            {['ASSIGNED', 'FOLLOWING'].includes(lead.status) && (
              <button 
                type="button"
                onClick={() => setIsFollowModalOpen(true)}
                className="flex items-center gap-1 text-blue-500 hover:text-blue-600 text-[10px] font-bold"
              >
                <Plus size={12} />
                <span>添加跟进</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[350px] pr-1 space-y-4 relative pl-4 border-l border-slate-200">
            {followUps.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                暂无跟进记录
              </div>
            ) : (
              followUps
                .sort((a, b) => b.time.localeCompare(a.time))
                .map((record) => (
                  <div key={record.id} className="relative">
                    {/* 时间线的小圆点 */}
                    <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#1677ff] bg-white" />
                    <FollowUpItem record={record} />
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* 固定底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 py-3.5 px-6 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] flex justify-end gap-2 lg:pl-[220px]">
        <button
          type="button"
          onClick={() => navigate('/leads')}
          className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-md transition-colors"
        >
          返回列表
        </button>

        {/* 动态渲染按钮 */}
        {lead.status === 'DRAFT' && (
          <>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-100 rounded-md transition-colors"
            >
              删除
            </button>
            <button
              type="button"
              onClick={() => navigate(`/leads/${lead.id}/edit`)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
            >
              编辑信息
            </button>
            <button
              type="button"
              onClick={handleSubmitDraft}
              className="px-5 py-2 text-xs font-bold text-white bg-[#1677ff] hover:bg-blue-500 rounded-md transition-colors shadow-sm"
            >
              提交线索
            </button>
          </>
        )}

        {isHighseas && (
          <button
            type="button"
            onClick={handleClaim}
            className="px-5 py-2 text-xs font-bold text-white bg-[#1677ff] hover:bg-blue-500 rounded-md transition-colors shadow-sm"
          >
            认领线索
          </button>
        )}

        {lead.status === 'ASSIGNED' && (
          <>
            <button
              type="button"
              onClick={() => setIsAbandonModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-50 border border-amber-100 rounded-md transition-colors"
            >
              放弃线索
            </button>
            <button
              type="button"
              onClick={() => setIsFollowModalOpen(true)}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors shadow-sm animate-pulse"
            >
              添加首次跟进
            </button>
          </>
        )}

        {lead.status === 'FOLLOWING' && (
          <>
            <button
              type="button"
              onClick={() => setIsAbandonModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-50 border border-amber-100 rounded-md transition-colors"
            >
              放弃线索
            </button>
            <button
              type="button"
              onClick={() => setIsFollowModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
            >
              再次跟进
            </button>
            <button
              type="button"
              onClick={() => setIsConvertModalOpen(true)}
              className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-550 rounded-md transition-colors shadow-sm"
            >
              转为正式客户
            </button>
          </>
        )}

        {lead.status === 'CONVERTED' && (
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="px-5 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-500 rounded-md transition-colors shadow-sm"
          >
            查看 ERP 关联客户
          </button>
        )}
      </div>

      {/* 5.1 添加跟进记录 Modal */}
      {isFollowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form onSubmit={handleAddFollowUp} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl border border-slate-100 text-xs space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-850 flex items-center gap-1">
              <Clock size={16} className="text-emerald-500" />
              <span>添加跟进记录</span>
            </h3>
            
            <div>
              <label htmlFor="followType" className="block text-slate-500 font-bold mb-1">跟进方式 <span className="text-red-500">*</span></label>
              <select
                id="followType"
                value={followType}
                onChange={(e) => setFollowType(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded text-slate-700 focus:outline-none focus:border-blue-500"
              >
                <option value="电话">电话</option>
                <option value="拜访">拜访</option>
                <option value="邮件">邮件</option>
              </select>
            </div>

            <div>
              <label htmlFor="followContent" className="block text-slate-500 font-bold mb-1">跟进内容 <span className="text-red-500">*</span></label>
              <textarea
                id="followContent"
                required
                rows={4}
                placeholder="请输入详细的沟通内容，客户的最新痛点或诉求..."
                value={followContent}
                onChange={(e) => setFollowContent(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="followNextPlan" className="block text-slate-500 font-bold mb-1">下次跟进计划 <span className="text-slate-400 font-normal">(选填)</span></label>
              <input
                id="followNextPlan"
                type="text"
                placeholder="如：下周一下发报价单草案"
                value={followNextPlan}
                onChange={(e) => setFollowNextPlan(e.target.value)}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsFollowModalOpen(false);
                  setFollowContent('');
                  setFollowNextPlan('');
                }}
                className="px-3 py-2 font-semibold text-slate-500 hover:bg-slate-50 rounded"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!followContent.trim()}
                className="px-4 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded shadow-sm"
              >
                提交记录
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5.2 放弃原因 Modal */}
      {isAbandonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form onSubmit={handleAbandon} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl border border-slate-100 text-xs space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-850 flex items-center gap-1.5 text-amber-500">
              <AlertTriangle size={18} />
              <span>确认放弃线索</span>
            </h3>
            <p className="text-slate-500">放弃后该线索将退回公海可供他人认领，请注明您的放弃原因：</p>
            
            <textarea
              required
              rows={3}
              placeholder="请详细描述放弃原因（如：竞品低价介入、组织架构调整预算冻结等）..."
              value={abandonReason}
              onChange={(e) => setAbandonReason(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-blue-500"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsAbandonModalOpen(false);
                  setAbandonReason('');
                }}
                className="px-3 py-2 font-semibold text-slate-500 hover:bg-slate-50 rounded"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!abandonReason.trim()}
                className="px-4 py-2 font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-40 rounded shadow-sm"
              >
                确认放弃
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5.3 转客户确认 Modal */}
      {isConvertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl border border-slate-100 text-xs space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-850 flex items-center gap-1.5 text-purple-600">
              <CheckCircle size={18} />
              <span>确认转为正式客户</span>
            </h3>
            <p className="text-slate-500 leading-relaxed">
              确认将公司 <strong className="text-slate-800">「{lead.company}」</strong> 转为正式客户？转客户后将在 CRM 生成快照并同步通知 ERP 建档，操作不可逆。
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConvertModalOpen(false)}
                className="px-3 py-2 font-semibold text-slate-500 hover:bg-slate-50 rounded"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConvertToCustomer}
                className="px-4 py-2 font-bold text-white bg-purple-600 hover:bg-purple-550 rounded shadow-sm"
              >
                确认转客户
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5.4 删除确认 Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl border border-slate-100 text-xs space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle size={18} />
              <h3 className="text-sm font-bold text-slate-800">确认删除草稿</h3>
            </div>
            <p className="text-slate-500 leading-relaxed">
              删除后不可恢复，确认删除该草稿线索？
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-3 py-2 font-semibold text-slate-500 hover:bg-slate-50 rounded"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDeleteDraft}
                className="px-4 py-2 font-bold text-white bg-red-500 hover:bg-red-600 rounded shadow-sm"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
