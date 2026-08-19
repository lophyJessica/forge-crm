import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Search, Plus, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CURRENT_USER, canCancelCheckedInVisit } from '@/domain/businessRules';
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

const getAssociationBadge = (type: string) => {
  switch (type) {
    case 'LEAD':
      return <Badge variant="info" className="text-[10px] h-4 px-1.5">线索</Badge>;
    case 'OPPORTUNITY':
      return <Badge variant="warning" className="text-[10px] h-4 px-1.5">商机</Badge>;
    case 'CUSTOMER':
      return <Badge variant="purple" className="text-[10px] h-4 px-1.5">客户</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px] h-4 px-1.5">{type}</Badge>;
  }
};

export default function VisitList() {
  const navigate = useNavigate();

  // 1. 过滤与分页状态
  const [activeTab, setActiveTab] = useState<'ALL' | 'PLANNED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [keyword, setKeyword] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [cancelVisitId, setCancelVisitId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

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
  }).sort((a, b) => b.planTime.localeCompare(a.planTime));

  const totalCount = filteredVisits.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const pagedVisits = filteredVisits.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 5. 核心交互函数
  const handleCheckIn = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await checkInVisit(id);
    showToast(result.message, result.ok ? 'success' : 'error');
  };

  const openCancelDialog = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCancelVisitId(id);
    setCancelReason('');
  };

  const handleCancel = async () => {
    if (!cancelVisitId) return;
    const result = await cancelVisit(cancelVisitId, CURRENT_USER.role, cancelReason);
    showToast(result.message, result.ok ? 'success' : 'error');
    if (result.ok) {
      setCancelVisitId(null);
      setCancelReason('');
    }
  };

  return (
    <div className="space-y-4">
      {/* 顶部 Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800">
          {toastMessage.type === 'success' ? <CheckCircle size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 头部标题区 */}
      <div className="flex justify-between items-center" data-anno="visit-list-page-header">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-slate-900">拜访计划</h1>
          <p className="text-xs text-slate-500">统一销售外勤上门及远程沟通计划，支持位置打卡签到并联动同步至客户 360° 跟进时间轴。</p>
        </div>
        <Button 
          size="sm"
          onClick={() => navigate('/visits/new')}
        >
          <Plus size={14} className="mr-1" />
          <span>新建计划</span>
        </Button>
      </div>

      {/* 状态 Tab */}
      <div className="border-b border-slate-200" data-anno="visit-list-status-tabs">
        <div className="flex gap-6">
          {[
            { key: 'ALL', label: '全部计划', count: visits.length },
            { key: 'PLANNED', label: '已计划', count: visits.filter(v => v.status === 'PLANNED').length },
            { key: 'CHECKED_IN', label: '已签到', count: visits.filter(v => v.status === 'CHECKED_IN').length },
            { key: 'COMPLETED', label: '已完成', count: visits.filter(v => v.status === 'COMPLETED').length },
            { key: 'CANCELLED', label: '已取消', count: visits.filter(v => v.status === 'CANCELLED').length }
          ].map(tab => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as any)}
                className={`pb-2.5 text-xs font-semibold transition-all relative cursor-pointer flex items-center gap-1.5 ${
                  active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <Badge variant={active ? 'default' : 'secondary'} className="h-4 px-1.5 text-[10px] font-mono">
                  {tab.count}
                </Badge>
                {active && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 筛选过滤 */}
      <Card data-anno="visit-list-filter-bar">
        <CardContent className="p-4 flex gap-3 items-center">
          <div className="relative flex-1">
            <Input 
              placeholder="搜索拜访标题、单号、关联客户或商机名..." 
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="pl-8 text-xs h-9"
            />
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          </div>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setKeyword('')}
            className="text-xs"
          >
            重置
          </Button>
        </CardContent>
      </Card>

      {/* 拜访表格 */}
      <Card className="overflow-hidden" data-anno="visit-list-table-fields">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">拜访编号</TableHead>
              <TableHead className="w-[200px]">拜访标题</TableHead>
              <TableHead className="w-[180px]">关联对象</TableHead>
              <TableHead className="w-[100px]">拜访方式</TableHead>
              <TableHead className="w-[150px]">计划拜访时间</TableHead>
              <TableHead className="w-[100px]">状态</TableHead>
              <TableHead className="w-[150px]">签到时间</TableHead>
              <TableHead className="text-right w-[150px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {totalCount === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-slate-400">
                  没有找到符合条件的拜访计划
                </TableCell>
              </TableRow>
            ) : (
              pagedVisits.map(v => (
                <TableRow key={v.id}>
                  <TableCell>
                    <span 
                      className="font-mono font-medium text-blue-600 cursor-pointer hover:underline"
                      onClick={() => navigate(`/visits/${v.id}`)}
                    >
                      {v.id}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">{v.title}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {getAssociationBadge(v.associationType)}
                      <span className="truncate max-w-[120px] font-medium text-slate-700">{v.associationName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-700">{v.visitMethod}</TableCell>
                  <TableCell className="font-mono text-slate-600">{v.planTime}</TableCell>
                  <TableCell>{getStatusBadge(v.status)}</TableCell>
                  <TableCell className="font-mono text-slate-500">{v.checkedInAt || '—'}</TableCell>
                  <TableCell className="text-right space-x-1.5" data-anno="visit-list-row-operations">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/visits/${v.id}`)}
                      className="h-7 px-2 text-xs"
                    >
                      查看
                    </Button>

                    {v.status === 'PLANNED' && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          data-anno="visit-list-check-in-action"
                          onClick={(e) => handleCheckIn(v.id, e)}
                          className="h-7 px-2 text-xs text-blue-600 font-medium"
                        >
                          位置签到
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          data-anno="visit-list-cancel-action"
                          onClick={(e) => openCancelDialog(v.id, e)}
                          className="h-7 px-2 text-xs text-red-600"
                        >
                          取消
                        </Button>
                      </>
                    )}

                    {v.status === 'CHECKED_IN' && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/visits/${v.id}`, { state: { triggerComplete: true } })}
                          className="h-7 px-2 text-xs text-emerald-600 font-medium"
                        >
                          填写记录
                        </Button>
                        {canCancelCheckedInVisit(CURRENT_USER.role) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => openCancelDialog(v.id, e)}
                            className="h-7 px-2 text-xs text-red-600"
                          >
                            主管取消
                          </Button>
                        )}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* 分页 */}
        <div className="flex justify-between items-center px-4 py-3 border-t border-slate-100 text-xs text-slate-500" data-anno="visit-list-pagination">
          <div className="flex items-center gap-3">
            <span>共 {totalCount} 条记录</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setCurrentPage(1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="h-8 px-2 text-xs bg-white border border-slate-200 rounded text-slate-700 focus:outline-none"
            >
              <option value={20}>20 条/页</option>
              <option value={50}>50 条/页</option>
              <option value={100}>100 条/页</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                if (currentPage > 1) {
                  setCurrentPage(prev => prev - 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              disabled={currentPage === 1}
              className="h-8 px-3 text-xs"
            >
              上一页
            </Button>
            <span className="font-mono text-slate-600">{currentPage} / {totalPages}</span>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                if (currentPage < totalPages) {
                  setCurrentPage(prev => prev + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              disabled={currentPage === totalPages}
              className="h-8 px-3 text-xs"
            >
              下一页
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={!!cancelVisitId} onOpenChange={(open) => {
        if (!open) {
          setCancelVisitId(null);
          setCancelReason('');
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">确认取消拜访</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">请输入至少10个字的取消原因。若拜访已签到，仅主管/管理员可取消，且签到事实会保留。</p>
          <Textarea rows={3} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="请输入取消原因" />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setCancelVisitId(null)}>返回</Button>
            <Button variant="destructive" size="sm" disabled={cancelReason.trim().length < 10} onClick={handleCancel}>确认取消</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
