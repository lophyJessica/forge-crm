import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ChevronLeft, AlertTriangle, CheckCircle, XCircle, MapPin, Calendar, Users, Clipboard } from 'lucide-react';

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

const getAssociationLabel = (type: string) => {
  const map: Record<string, string> = {
    LEAD: '关联线索',
    OPPORTUNITY: '关联商机',
    CUSTOMER: '关联客户'
  };
  return map[type] || type;
};

export default function VisitDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  // 1. 本地表单状态
  const [content, setContent] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 2. 订阅当前拜访单明细
  const visit = useLiveQuery(() => db.visits.get(id || '')) || null;

  // 3. 处理快捷进入录入状态
  useEffect(() => {
    const triggerComplete = (location.state as any)?.triggerComplete;
    if (triggerComplete && visit && visit.status === 'CHECKED_IN') {
      showToast('请在此录入本次拜访的会谈纪要及总结。');
    }
  }, [visit, location.state]);

  if (!visit) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        拜访计划加载中，或单据不存在...
      </div>
    );
  }

  // 4. 签到打卡 (P1-2 规则)
  const handleCheckIn = async () => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    
    // 仿真地理定位
    const mockAddresses = [
      '江苏省南京市江宁区强盛科技园B座1楼大堂',
      '上海市浦东新区张江高科智芯大厦12层前台',
      '北京市西城区金融街鼎泰大厦大堂东门',
      '湖北省武汉市东西湖区瑞丰冷链A库门卫室'
    ];
    const mockAddr = mockAddresses[Math.floor(Math.random() * mockAddresses.length)];

    await db.visits.update(visit.id, {
      status: 'CHECKED_IN',
      checkedInAt: nowStr,
      checkedInAddress: mockAddr,
      updatedAt: nowStr + ':00'
    });
    showToast(`签到成功！系统已自动回写签到位置 [${mockAddr}]`);
  };

  // 5. 提交拜访纪要完成 (P0-1 核心回写)
  const handleComplete = async () => {
    if (visit.status !== 'CHECKED_IN') {
      showToast('请先签到', 'error');
      return;
    }

    if (!content.trim()) {
      setErrorMsg('请填写拜访内容总结，以记录业务谈判成果');
      return;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const nowFullStr = nowStr.replace('T', ' ') + ':00';

    await db.transaction('rw', db.visits, db.follow_up_records, db.opportunity_follow_ups, db.leads, db.opportunities, async () => {
      // A. 更新拜访单状态
      await db.visits.update(visit.id, {
        status: 'COMPLETED',
        content: content,
        updatedAt: nowFullStr
      });

      // B. 联动回写相应关联对象的 Timeline (P0-1 规则)
      const formattedContent = `【线下拜访】${visit.title} - ${content} (签到位置: ${visit.checkedInAddress || '在线会议/电话'})`;

      if (visit.associationType === 'LEAD') {
        // 向线索跟进日志中写一条拜访类型的记录
        await db.follow_up_records.add({
          leadId: visit.associationId,
          time: nowFullStr,
          operator: visit.createdBy || '系统',
          type: '拜访',
          content: formattedContent
        });
        
        // 同时更新线索表的最近跟进时间
        await db.leads.update(visit.associationId, {
          followedAt: nowFullStr
        });

      } else if (visit.associationType === 'OPPORTUNITY') {
        // 向商机跟进中写一条记录
        await db.opportunity_follow_ups.add({
          oppId: visit.associationId,
          time: nowFullStr,
          operator: visit.createdBy || '系统',
          type: '拜访',
          content: formattedContent
        });

        // 联动更新商机最近修改时间
        await db.opportunities.update(visit.associationId, {
          updatedAt: nowFullStr
        });

      } else if (visit.associationType === 'CUSTOMER') {
        // 客户跟进属于聚合显示 (读取名下线索+商机的跟进)。
        // 算法：优先将该记录插在此客户名下的第一个商机中，若无商机，插在第一个线索中，确保聚合时被 360° 跟进流抓到。
        const matchingOpps = await db.opportunities.where('customerId').equals(visit.associationId).toArray();
        if (matchingOpps.length > 0) {
          // 插在第一个关联商机上
          await db.opportunity_follow_ups.add({
            oppId: matchingOpps[0].id,
            time: nowFullStr,
            operator: visit.createdBy || '系统',
            type: '拜访',
            content: formattedContent
          });
        } else {
          // 若无商机，寻找是否有对应客户名下的线索
          const matchingLeads = await db.leads.filter(l => l.company === visit.associationName).toArray();
          if (matchingLeads.length > 0) {
            await db.follow_up_records.add({
              leadId: matchingLeads[0].id,
              time: nowFullStr,
              operator: visit.createdBy || '系统',
              type: '拜访',
              content: formattedContent
            });
          }
        }
      }
    });

    showToast('拜访任务完成！本次拜访总结已自动回写至关联对象的 360° 跟进历史中。');
  };

  // 6. 取消计划
  const handleCancel = async () => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    await db.visits.update(visit.id, {
      status: 'CANCELLED',
      updatedAt: nowStr
    });
    showToast('拜访计划已取消。');
  };

  return (
    <div className="space-y-4 pb-24 animate-fade-in">
      {/* 顶部 Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg bg-white border border-slate-200 animate-slide-in text-xs font-bold text-slate-800">
          {toastMessage.type === 'success' ? <CheckCircle size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 警示 Banner (取消状态) */}
      {visit.status === 'CANCELLED' && (
        <div className="bg-red-50 border border-red-150 rounded-lg p-3.5 flex items-start gap-2.5">
          <AlertTriangle className="text-red-650 shrink-0 mt-0.5" size={16} />
          <div className="text-xs text-red-700 leading-relaxed font-bold">
            ⚠️ 本次拜访计划已被销售取消归档。
          </div>
        </div>
      )}

      {/* 导航标题 */}
      <div className="flex items-center gap-3">
        <button 
          type="button" 
          onClick={() => navigate('/visits')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex flex-col">
          <h1 className="text-lg font-black text-slate-800">{visit.title}</h1>
          <p className="text-[10px] text-slate-400">单号: {visit.id} · 创建人: {visit.createdBy} · 创建于 {visit.createdAt}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        
        {/* 左侧拜访信息明细卡片 */}
        <div className="md:col-span-2 space-y-4">
          
          <div className="forge-card space-y-4">
            <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-slate-800">
                <Calendar size={15} className="text-[#1677ff]" />
                <h3 className="text-xs font-bold">计划日程明细</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${getStatusBadgeColor(visit.status)}`}>
                {getStatusLabel(visit.status)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">拜访日程主题</span>
                <span className="text-slate-700 font-bold block">{visit.title}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">沟通方式</span>
                <span className="text-slate-700 font-bold block">{visit.visitMethod}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">计划拜访时间</span>
                <span className="text-slate-700 font-mono font-bold block">{visit.planTime}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">计划拜访地址</span>
                <span className="text-slate-700 font-medium block">{visit.address || '（无指定地址，远程电话或视频会）'}</span>
              </div>
            </div>
          </div>

          {/* 关联快照卡片 */}
          <div className="forge-card space-y-3">
            <div className="flex items-center gap-1.5 text-slate-800 border-b border-slate-100 pb-1.5">
              <Users size={14} className="text-[#1677ff]" />
              <h4 className="text-xs font-bold">{getAssociationLabel(visit.associationType)} 快照资料</h4>
            </div>
            <div className="text-xs grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-slate-400 block">对象类型</span>
                <span className="font-bold text-slate-600">{getAssociationLabel(visit.associationType)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">业务归属名称</span>
                <span 
                  className="font-bold text-[#1677ff] cursor-pointer hover:underline"
                  onClick={() => {
                    if (visit.associationType === 'LEAD') navigate(`/leads/${visit.associationId}`);
                    else if (visit.associationType === 'OPPORTUNITY') navigate(`/opportunities/${visit.associationId}`);
                    else if (visit.associationType === 'CUSTOMER') navigate(`/customers/${visit.associationId}`);
                  }}
                >
                  {visit.associationName}
                </span>
              </div>
            </div>
          </div>

          {/* CHECKED_IN 状态下录入纪要 */}
          {visit.status === 'CHECKED_IN' && (
            <div className="forge-card space-y-4 border-orange-200">
              <div className="border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <Clipboard size={15} className="text-orange-500" />
                <h3 className="text-xs font-bold text-slate-850">录入拜访总结纪要</h3>
              </div>
              <div className="space-y-2">
                <textarea
                  rows={4}
                  placeholder="请在此录入本次拜访的会谈核心内容、业务诉求及后续跟进方案 (必填)..."
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    setErrorMsg('');
                  }}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
                />
                {errorMsg && <p className="text-[10px] text-red-500 font-bold">{errorMsg}</p>}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleComplete}
                    className="px-5 py-2 text-xs font-bold text-white bg-green-700 hover:bg-green-600 rounded-md transition-colors shadow-sm"
                  >
                    提交拜访记录并结案
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* COMPLETED 状态下显示只读纪要 */}
          {visit.status === 'COMPLETED' && (
            <div className="forge-card space-y-3">
              <div className="border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                <Clipboard size={14} className="text-green-650" />
                <h4 className="text-xs font-bold">拜访纪要总结</h4>
              </div>
              <p className="text-xs text-slate-650 leading-relaxed bg-slate-50 border border-slate-150 rounded p-3 break-all font-medium">
                {visit.content || '未录入总结内容'}
              </p>
            </div>
          )}

        </div>

        {/* 右侧外勤打卡定位模拟卡片 */}
        <div className="forge-card space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-850">位置签到/打卡快照</h3>
          </div>
          <div className="border border-slate-200 rounded p-4 bg-slate-50 flex flex-col justify-between items-center text-center h-64 relative overflow-hidden">
            {visit.status === 'PLANNED' ? (
              <div className="flex flex-col items-center justify-center gap-4 h-full">
                <MapPin size={40} className="text-slate-350 animate-bounce" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700">尚未进行现场打卡</p>
                  <p className="text-[10px] text-slate-400">请到达目标地址后，点击下方“位置签到”</p>
                </div>
                <button
                  type="button"
                  onClick={handleCheckIn}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#1677ff] hover:bg-blue-500 rounded transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <MapPin size={13} />
                  <span>立即打卡签到</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col justify-between items-center h-full w-full">
                <div className="w-full flex items-center justify-center h-20 bg-blue-50 border border-blue-150 rounded text-[#1677ff] gap-2 p-2">
                  <MapPin size={18} className="shrink-0" />
                  <span className="text-[10px] font-bold text-left leading-relaxed break-all">
                    {visit.checkedInAddress}
                  </span>
                </div>
                
                <div className="text-xs space-y-1 py-3">
                  <p className="font-bold text-slate-650">打卡签到时间</p>
                  <p className="font-mono text-slate-550">{visit.checkedInAt}</p>
                </div>

                <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle size={12} />
                  <span>位置打卡通过 (GPS已校验)</span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 底部操作固定栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-45 bg-white border-t border-slate-200 py-3.5 px-6 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] flex justify-end gap-2 lg:pl-[220px]">
        <button
          type="button"
          onClick={() => navigate('/visits')}
          className="px-5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-md transition-colors"
        >
          返回列表
        </button>

        {visit.status === 'PLANNED' && (
          <>
            <button
              type="button"
              onClick={() => navigate(`/visits/${visit.id}/edit`)}
              className="px-5 py-2 text-xs font-semibold text-slate-650 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors"
            >
              编辑计划
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-5 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-650 rounded-md transition-colors"
            >
              取消拜访
            </button>
          </>
        )}

        {visit.status === 'CHECKED_IN' && (
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-650 rounded-md transition-colors"
          >
            取消拜访
          </button>
        )}
      </div>
    </div>
  );
}
