import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ChevronLeft, AlertTriangle, CheckCircle, XCircle, MapPin, Calendar, Users, Clipboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CURRENT_USER, canCancelCheckedInVisit, shanghaiNow } from '@/domain/businessRules';
import { cancelVisit, checkInVisit } from '@/domain/visitActions';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'PLANNED':
      return <Badge variant="info">已计划</Badge>;
    case 'CHECKED_IN':
      return <Badge variant="warning">已签到</Badge>;
    case 'COMPLETED':
      return <Badge variant="success">已完成</Badge>;
    case 'CANCELLED':
      return <Badge variant="destructive">已取消</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
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
  const [visitResult, setVisitResult] = useState<'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'CUSTOMER_NO_SHOW'>('POSITIVE');
  const [errorMsg, setErrorMsg] = useState('');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
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

  // 4. 签到打卡
  const handleCheckIn = async () => {
    const result = await checkInVisit(visit.id);
    showToast(result.message, result.ok ? 'success' : 'error');
  };

  // 5. 提交拜访纪要完成
  const handleComplete = async () => {
    if (visit.status !== 'CHECKED_IN') {
      showToast('请先签到', 'error');
      return;
    }

    if (!content.trim()) {
      setErrorMsg('请填写拜访内容总结，以记录业务谈判成果');
      return;
    }

    const nowFullStr = shanghaiNow();

    await db.transaction('rw', db.visits, db.follow_up_records, db.opportunity_follow_ups, db.leads, db.opportunities, async () => {
      const current = await db.visits.get(visit.id);
      if (!current || current.status !== 'CHECKED_IN') throw new Error('拜访状态已变化，请刷新后重试');
      const locationText = current.visitMethod === '上门' ? `；位置：${current.checkedInAddress || '未记录'}` : '';
      const formattedContent = `【${current.visitMethod}拜访】${current.title} - ${content.trim()}${locationText}`;
      let followUpStatus: 'NOT_REQUIRED' | 'SUCCESS' | 'PENDING' = 'NOT_REQUIRED';
      let followUpRecordId: string | undefined;

      if (current.associationType === 'LEAD') {
        const existingRecord = await db.follow_up_records.where('sourceVisitId').equals(current.id).first();
        const recordId = existingRecord?.id || await db.follow_up_records.add({
          leadId: current.associationId,
          time: nowFullStr,
          operator: current.assigneeName || current.createdBy || '系统',
          type: '拜访',
          content: formattedContent,
          sourceVisitId: current.id,
        });
        
        await db.leads.update(current.associationId, {
          followedAt: nowFullStr,
        });
        followUpStatus = 'SUCCESS';
        followUpRecordId = String(recordId);

      } else if (current.associationType === 'OPPORTUNITY') {
        const existingRecord = await db.opportunity_follow_ups.where('sourceVisitId').equals(current.id).first();
        const recordId = existingRecord?.id || await db.opportunity_follow_ups.add({
          oppId: current.associationId,
          time: nowFullStr,
          operator: current.assigneeName || current.createdBy || '系统',
          type: '拜访',
          content: formattedContent,
          sourceVisitId: current.id,
        });

        await db.opportunities.update(current.associationId, {
          updatedAt: nowFullStr,
        });
        followUpStatus = 'SUCCESS';
        followUpRecordId = String(recordId);

      } else if (current.associationType === 'CUSTOMER') {
        const matchingOpps = await db.opportunities.where('customerId').equals(current.associationId).toArray();
        if (matchingOpps.length > 0) {
          const targetOpp = matchingOpps.sort((a, b) => b.updatedAt?.localeCompare(a.updatedAt || '') || 0)[0];
          const existingRecord = await db.opportunity_follow_ups.where('sourceVisitId').equals(current.id).first();
          const recordId = existingRecord?.id || await db.opportunity_follow_ups.add({
            oppId: targetOpp.id,
            time: nowFullStr,
            operator: current.assigneeName || current.createdBy || '系统',
            type: '拜访',
            content: formattedContent,
            sourceVisitId: current.id,
          });
          followUpStatus = 'SUCCESS';
          followUpRecordId = String(recordId);
        }
      }

      await db.visits.update(current.id, {
        status: 'COMPLETED',
        executionResult: visitResult === 'CUSTOMER_NO_SHOW' ? 'MISSED' : 'COMPLETED',
        executionException: visitResult === 'CUSTOMER_NO_SHOW' ? 'CUSTOMER_NO_SHOW' : 'NONE',
        completedAt: nowFullStr,
        visitResult,
        feedbackContent: content.trim(),
        followUpStatus,
        followUpRecordId,
        content: content.trim(),
        version: (current.version || 0) + 1,
        updatedAt: nowFullStr,
      });
    });

    showToast('拜访任务完成！本次拜访总结已自动回写至关联对象的 360° 跟进历史中。');
  };

  // 6. 取消计划
  const handleCancel = async () => {
    const result = await cancelVisit(visit.id, CURRENT_USER.role, cancelReason);
    showToast(result.message, result.ok ? 'success' : 'error');
    if (result.ok) {
      setCancelModalOpen(false);
      setCancelReason('');
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* 顶部 Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800">
          {toastMessage.type === 'success' ? <CheckCircle size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 警示 Banner */}
      {visit.status === 'CANCELLED' && (
        <Alert variant="destructive" data-anno="visit-detail-cancelled-banner">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs font-medium">
            本次拜访计划已取消。原因：{visit.cancelReason || '未记录'}。既有签到事实不会被清除。
          </AlertDescription>
        </Alert>
      )}

      {/* 导航标题 */}
      <div className="flex items-center gap-3" data-anno="visit-detail-page-header">
        <Button 
          variant="outline"
          size="icon"
          onClick={() => navigate('/visits')}
          className="h-8 w-8"
        >
          <ChevronLeft size={16} />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-slate-900">{visit.title}</h1>
          <p className="text-xs text-slate-500">单号: {visit.id} · 创建人: {visit.createdBy} · 创建于 {visit.createdAt}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        
        {/* 左侧拜访信息明细卡片 */}
        <div className="md:col-span-2 space-y-4">
          
          <Card data-anno="visit-detail-schedule">
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-900">
                <Calendar size={15} className="text-blue-600" />
                <CardTitle className="text-sm font-semibold">计划日程明细</CardTitle>
              </div>
              {getStatusBadge(visit.status)}
            </CardHeader>

            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">拜访日程主题</span>
                  <span className="text-slate-800 font-semibold block">{visit.title}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">沟通方式</span>
                  <span className="text-slate-800 font-semibold block">{visit.visitMethod}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">计划拜访时间</span>
                  <span className="text-slate-800 font-mono font-semibold block">{visit.planTime}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">计划拜访地址</span>
                  <span className="text-slate-700 font-medium block">{visit.address || '（无指定地址，远程电话或视频会）'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 关联快照卡片 */}
          <Card data-anno="visit-detail-association">
            <CardHeader className="border-b border-slate-100 pb-2.5 flex flex-row items-center gap-1.5 text-slate-900">
              <Users size={14} className="text-blue-600" />
              <CardTitle className="text-xs font-semibold">{getAssociationLabel(visit.associationType)} 快照资料</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="text-xs grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 block">对象类型</span>
                  <span className="font-semibold text-slate-700">{getAssociationLabel(visit.associationType)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">业务归属名称</span>
                  <span 
                    className="font-semibold text-blue-600 cursor-pointer hover:underline"
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
            </CardContent>
          </Card>

          {/* CHECKED_IN 状态下录入纪要 */}
          {visit.status === 'CHECKED_IN' && (
            <Card className="border-amber-200" data-anno="visit-detail-feedback-entry">
              <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center gap-1.5">
                <Clipboard size={15} className="text-amber-500" />
                <CardTitle className="text-sm font-semibold">录入拜访总结纪要</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <select
                  value={visitResult}
                  onChange={(event) => setVisitResult(event.target.value as typeof visitResult)}
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md"
                >
                  <option value="POSITIVE">积极结果</option>
                  <option value="NEUTRAL">中性结果</option>
                  <option value="NEGATIVE">消极结果</option>
                  <option value="CUSTOMER_NO_SHOW">客户未到访</option>
                </select>
                <Textarea
                  rows={4}
                  placeholder="请在此录入本次拜访的会谈核心内容、业务诉求及后续跟进方案 (必填)..."
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    setErrorMsg('');
                  }}
                  className={errorMsg ? 'border-red-500' : ''}
                />
                {errorMsg && <p className="text-[11px] text-red-500 font-medium">{errorMsg}</p>}
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleComplete}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    提交拜访记录并结案
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* COMPLETED 状态下显示只读纪要 */}
          {visit.status === 'COMPLETED' && (
            <Card data-anno="visit-detail-feedback-summary">
              <CardHeader className="border-b border-slate-100 pb-2.5 flex flex-row items-center gap-1.5 text-slate-900">
                <Clipboard size={14} className="text-emerald-600" />
                <CardTitle className="text-xs font-semibold">拜访纪要总结</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 border border-slate-100 rounded-md p-3 break-all">
                  {visit.feedbackContent || visit.content || '未录入总结内容'}
                </p>
                <p className="mt-2 text-[11px] text-slate-500">完成时间：{visit.completedAt || '—'} · 执行结果：{visit.visitResult || visit.executionResult || '—'} · 跟进回写：{visit.followUpStatus || '—'}</p>
              </CardContent>
            </Card>
          )}

        </div>

        {/* 右侧外勤打卡定位模拟卡片 */}
        <Card data-anno="visit-detail-check-in-snapshot">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm font-semibold">{visit.visitMethod === '上门' ? '位置签到/打卡快照' : `${visit.visitMethod}沟通签到`}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="border border-slate-200 rounded-md p-4 bg-slate-50 flex flex-col justify-between items-center text-center h-64 relative overflow-hidden">
              {visit.status === 'PLANNED' ? (
                <div className="flex flex-col items-center justify-center gap-4 h-full">
                  <MapPin size={40} className="text-slate-300 animate-bounce" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-800">尚未签到</p>
                    <p className="text-[11px] text-slate-400">{visit.visitMethod === '上门' ? 'Demo 使用明确标识的 Mock 位置，不宣称 GPS 已校验' : '电话/视频签到不会请求定位权限'}</p>
                  </div>
                  <Button
                    size="sm"
                    data-anno="visit-detail-check-in-action"
                    onClick={handleCheckIn}
                  >
                    <MapPin size={13} className="mr-1" />
                    <span>{visit.visitMethod === '上门' ? 'Mock 位置签到' : `${visit.visitMethod}签到`}</span>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col justify-between items-center h-full w-full">
                  <div className="w-full flex items-center justify-center h-20 bg-blue-50/75 border border-blue-100 rounded-md text-blue-700 gap-2 p-2">
                    <MapPin size={16} className="shrink-0 text-blue-600" />
                    <span className="text-xs font-medium text-left leading-relaxed break-all">
                      {visit.checkedInAddress}
                    </span>
                  </div>
                  
                  <div className="text-xs space-y-1 py-3">
                    <p className="font-semibold text-slate-600">打卡签到时间</p>
                    <p className="font-mono text-slate-500">{visit.checkedInAt}</p>
                  </div>

                  <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle size={14} />
                    <span>
                      {visit.locationSource === 'BROWSER' && visit.locationReliability === 'VERIFIED'
                        ? '浏览器定位已校验'
                        : visit.locationSource === 'MOCK' || !visit.locationSource
                          ? 'Mock 位置（未做 GPS 校验）'
                          : '远程签到（未请求定位）'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* 底部操作固定栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 py-3.5 px-6 shadow-sm flex justify-end gap-2 lg:pl-[220px]" data-anno="visit-detail-action-bar">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/visits')}
        >
          返回列表
        </Button>

        {visit.status === 'PLANNED' && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/visits/${visit.id}/edit`)}
            >
              编辑计划
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setCancelModalOpen(true)}
            >
              取消拜访
            </Button>
          </>
        )}

        {visit.status === 'CHECKED_IN' && canCancelCheckedInVisit(CURRENT_USER.role) && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setCancelModalOpen(true)}
          >
            取消拜访
          </Button>
        )}
      </div>

      <Dialog open={cancelModalOpen} onOpenChange={(open) => {
        if (!open) {
          setCancelModalOpen(false);
          setCancelReason('');
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">确认取消拜访</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">请输入至少10个字的取消原因。已签到拜访仅主管/管理员可取消，且签到事实会保留。</p>
          <Textarea rows={3} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="请输入取消原因" />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setCancelModalOpen(false)}>返回</Button>
            <Button variant="destructive" size="sm" disabled={cancelReason.trim().length < 10} onClick={handleCancel}>确认取消</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
